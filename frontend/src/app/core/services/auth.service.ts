import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { AuthResponse, AuthUser, RequestCodeResponse, UpdateProfileInput } from '../models/auth.model';
import { WorkoutDraftStore } from './workout-draft.store';

const TOKEN_KEY = 'lw_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly draftStore = inject(WorkoutDraftStore);
  private readonly baseUrl = `${API_BASE_URL}/auth`;

  readonly currentUser = signal<AuthUser | null>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  private initPromise: Promise<void> | null = null;

  /** Resuelve la sesión guardada (si hay token) antes de activar rutas. */
  init(): Promise<void> {
    if (!this.initPromise) this.initPromise = this.loadCurrentUser();
    return this.initPromise;
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /** Paso 1: pide que envíen un código al email. No abre sesión todavía. */
  requestCode(email: string): Observable<RequestCodeResponse> {
    return this.http.post<RequestCodeResponse>(`${this.baseUrl}/request-code`, { email });
  }

  /** Paso 2: el código correcto abre la sesión. */
  verifyCode(email: string, code: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/verify-code`, { email, code })
      .pipe(tap((res) => this.setSession(res)));
  }

  /** Cuenta de demostración: entra directa, sin email ni código. */
  loginAsTestUser(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/test-login`, {}).pipe(tap((res) => this.setSession(res)));
  }

  updateProfile(input: UpdateProfileInput): Observable<AuthUser> {
    return this.http
      .patch<AuthUser>(`${this.baseUrl}/me`, input)
      .pipe(tap((user) => this.currentUser.set(user)));
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  private async loadCurrentUser(): Promise<void> {
    if (!this.getToken()) return;

    try {
      const user = await firstValueFrom(this.http.get<AuthUser>(`${this.baseUrl}/me`));
      this.currentUser.set(user);
    } catch {
      this.clearSession();
    }
  }

  private setSession(res: AuthResponse): void {
    this.draftStore.resetAll();
    localStorage.setItem(TOKEN_KEY, res.token);
    this.currentUser.set(res.user);
  }

  private clearSession(): void {
    this.draftStore.resetAll();
    localStorage.removeItem(TOKEN_KEY);
    this.currentUser.set(null);
  }
}
