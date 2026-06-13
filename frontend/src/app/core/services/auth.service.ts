import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { AuthResponse, AuthUser, LoginInput } from '../models/auth.model';

const TOKEN_KEY = 'lw_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
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

  login(input: LoginInput): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, input).pipe(tap((res) => this.setSession(res)));
  }

  loginWithGoogle(idToken: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/google`, { idToken })
      .pipe(tap((res) => this.setSession(res)));
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/forgot-password`, { email });
  }

  resetPassword(token: string, password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/reset-password`, { token, password });
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
    localStorage.setItem(TOKEN_KEY, res.token);
    this.currentUser.set(res.user);
  }

  private clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.currentUser.set(null);
  }
}
