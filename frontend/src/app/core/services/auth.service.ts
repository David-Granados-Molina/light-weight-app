import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Observable, tap, timeout } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { AuthResponse, AuthUser, MeResponse, RequestCodeResponse, UpdateProfileInput } from '../models/auth.model';
import { WorkoutDraftStore } from './workout-draft.store';

const TOKEN_KEY = 'lw_token';
const USER_KEY = 'lw_user';
const MOTIVO_KEY = 'lw_sesion_cerrada';

/** Lo que se espera a `/me` antes de seguir con la sesión guardada. */
const ESPERA_MS = 8000;

/** Reintentos en segundo plano mientras el servidor no conteste. */
const REINTENTOS_MS = [3000, 10000, 30000, 60000];

export type MotivoCierre = 'manual' | 'rechazada';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly draftStore = inject(WorkoutDraftStore);
  private readonly baseUrl = `${API_BASE_URL}/auth`;

  readonly currentUser = signal<AuthUser | null>(null);

  /**
   * Hay sesión mientras haya token. El perfil puede tardar o no llegar —el
   * servidor duerme, el gimnasio no tiene cobertura—, y eso no es motivo para
   * echar a nadie: quien decide si el token vale es el servidor, en cada
   * petición, no esta comprobación, que solo elige qué pantalla mostrar.
   */
  private readonly token = signal<string | null>(this.leerToken());
  readonly isAuthenticated = computed(() => this.token() !== null);

  private initPromise: Promise<void> | null = null;
  private reintento: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Dos pestañas abiertas comparten el almacenamiento: si en una se cierra la
    // sesión, la otra no puede seguir como si nada.
    window.addEventListener('storage', (evento) => {
      if (evento.key !== TOKEN_KEY) return;

      this.token.set(evento.newValue);
      if (evento.newValue) return;

      this.currentUser.set(null);
      this.router.navigate(['/login']);
    });
  }

  /** Resuelve la sesión guardada (si hay token) antes de activar rutas. */
  init(): Promise<void> {
    if (!this.initPromise) this.initPromise = this.loadCurrentUser();
    return this.initPromise;
  }

  getToken(): string | null {
    return this.token();
  }

  /** Por qué se cerró la última sesión, para poder decírselo en la pantalla de entrada. */
  motivoDelCierre(): MotivoCierre | null {
    const motivo = this.leer(MOTIVO_KEY);
    return motivo === 'manual' || motivo === 'rechazada' ? motivo : null;
  }

  olvidarMotivo(): void {
    this.borrar(MOTIVO_KEY);
  }

  /** Paso 1: pide que envíen un código al email. No abre sesión todavía. */
  requestCode(email: string): Observable<RequestCodeResponse> {
    return this.http.post<RequestCodeResponse>(`${this.baseUrl}/request-code`, { email });
  }

  /** Paso 2: el código correcto abre la sesión. */
  verifyCode(email: string, code: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/verify-code`, { email, code })
      .pipe(tap((res) => this.aplicarSesion(res)));
  }

  /** Cuenta de demostración: entra directa, sin email ni código. */
  loginAsTestUser(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/test-login`, {}).pipe(tap((res) => this.aplicarSesion(res)));
  }

  updateProfile(input: UpdateProfileInput): Observable<AuthUser> {
    return this.http.patch<AuthUser>(`${this.baseUrl}/me`, input).pipe(
      tap((user) => {
        this.currentUser.set(user);
        this.guardarUsuario(user);
      }),
    );
  }

  logout(): void {
    this.cerrarSesion('manual');
  }

  /**
   * Cierra la sesión y vuelve a la entrada. **No toca el entreno a medias**: el
   * borrador es del usuario, no de la sesión, y perderlo por un token caducado
   * es perder el entreno entero.
   */
  cerrarSesion(motivo: MotivoCierre): void {
    this.cancelarReintento();
    this.borrar(TOKEN_KEY);
    this.borrar(USER_KEY);
    this.escribir(MOTIVO_KEY, motivo);
    this.token.set(null);
    this.currentUser.set(null);
    this.initPromise = null;
    this.router.navigate(['/login']);
  }

  private aplicarSesion(res: AuthResponse): void {
    this.cancelarReintento();
    this.draftStore.adoptar(res.user.id);
    this.escribir(TOKEN_KEY, res.token);
    this.guardarUsuario(res.user);
    this.borrar(MOTIVO_KEY);
    this.token.set(res.token);
    this.currentUser.set(res.user);
    this.initPromise = Promise.resolve();
  }

  private async loadCurrentUser(): Promise<void> {
    if (!this.token()) return;

    // El perfil guardado vale para pintar la pantalla mientras se confirma.
    const guardado = this.usuarioGuardado();
    if (guardado) this.currentUser.set(guardado);

    await this.revalidar();
  }

  /**
   * Comprueba la sesión contra el servidor. Solo un 401 —el servidor diciendo
   * que ese token no vale— cierra la sesión. Un fallo de red, un 500 o una
   * espera demasiado larga dejan la sesión como está y se vuelve a intentar.
   */
  private async revalidar(intento = 0): Promise<void> {
    if (!this.token()) return;

    try {
      const { tokenRenovado, ...user } = await firstValueFrom(
        this.http.get<MeResponse>(`${this.baseUrl}/me`).pipe(timeout(ESPERA_MS)),
      );

      // El servidor renueva la sesión antes de que caduque; se guarda y sigue.
      if (tokenRenovado) {
        this.escribir(TOKEN_KEY, tokenRenovado);
        this.token.set(tokenRenovado);
      }

      this.currentUser.set(user);
      this.guardarUsuario(user);
      this.draftStore.adoptar(user.id);
      this.borrar(MOTIVO_KEY);
    } catch (err) {
      if (this.tokenRechazado(err)) {
        this.cerrarSesion('rechazada');
        return;
      }

      this.programarReintento(intento);
    }
  }

  private programarReintento(intento: number): void {
    const espera = REINTENTOS_MS[intento];
    if (espera === undefined) return;

    this.cancelarReintento();
    this.reintento = setTimeout(() => {
      this.reintento = null;
      void this.revalidar(intento + 1);
    }, espera);
  }

  private cancelarReintento(): void {
    if (this.reintento === null) return;
    clearTimeout(this.reintento);
    this.reintento = null;
  }

  private tokenRechazado(err: unknown): boolean {
    return err instanceof HttpErrorResponse && err.status === 401;
  }

  private usuarioGuardado(): AuthUser | null {
    const crudo = this.leer(USER_KEY);
    if (!crudo) return null;

    try {
      const user = JSON.parse(crudo) as AuthUser;
      return user && typeof user.id === 'string' ? user : null;
    } catch {
      return null;
    }
  }

  private guardarUsuario(user: AuthUser): void {
    this.escribir(USER_KEY, JSON.stringify(user));
  }

  /* El almacenamiento del navegador puede fallar (modo privado, cuota llena) y
     eso no debe tumbar la aplicación. */

  private leerToken(): string | null {
    return this.leer(TOKEN_KEY);
  }

  private leer(clave: string): string | null {
    try {
      return localStorage.getItem(clave);
    } catch {
      return null;
    }
  }

  private escribir(clave: string, valor: string): void {
    try {
      localStorage.setItem(clave, valor);
    } catch {
      /* sin almacenamiento, la sesión vive solo en memoria */
    }
  }

  private borrar(clave: string): void {
    try {
      localStorage.removeItem(clave);
    } catch {
      /* nada que borrar si no hay almacenamiento */
    }
  }
}
