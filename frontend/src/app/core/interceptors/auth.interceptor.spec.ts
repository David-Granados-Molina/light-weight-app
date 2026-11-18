import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

function montar(token: string | null) {
  localStorage.clear();
  if (token) localStorage.setItem('lw_token', token);

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
    ],
  });

  return {
    http: TestBed.inject(HttpClient),
    backend: TestBed.inject(HttpTestingController),
    auth: TestBed.inject(AuthService),
  };
}

describe('authInterceptor', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('firma la petición con el token guardado', () => {
    const { http, backend } = montar('token-valido');

    http.get('/api/exercises').subscribe();

    expect(backend.expectOne('/api/exercises').request.headers.get('Authorization')).toBe('Bearer token-valido');
  });

  it('cierra la sesión cuando el servidor rechaza el token', () => {
    const { http, backend, auth } = montar('token-caducado');

    http.get('/api/exercises').subscribe({ error: () => undefined });
    backend.expectOne('/api/exercises').flush({ error: 'No autenticado' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.getToken()).toBeNull();
  });

  it('no cierra la sesión porque un código de acceso sea incorrecto', () => {
    const { http, backend, auth } = montar('token-valido');

    http.post('/api/auth/verify-code', { email: 'a@b.c', code: '12345678' }).subscribe({ error: () => undefined });
    backend
      .expectOne('/api/auth/verify-code')
      .flush({ error: 'El código no es correcto.' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.getToken()).toBe('token-valido');
  });

  it('cierra la sesión si el servidor rechaza el token al guardar el perfil', () => {
    const { http, backend, auth } = montar('token-caducado');

    http.patch('/api/auth/me', { name: 'David' }).subscribe({ error: () => undefined });
    backend.expectOne('/api/auth/me').flush({ error: 'No autenticado' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.getToken()).toBeNull();
  });

  it('no cierra la sesión porque el servidor falle', async () => {
    vi.useFakeTimers();
    const { http, backend, auth } = montar('token-valido');

    http.get('/api/exercises').subscribe({ error: () => undefined });
    backend.expectOne('/api/exercises').flush('boom', { status: 500, statusText: 'Internal Server Error' });
    await vi.advanceTimersByTimeAsync(5000);

    // Un 500 es un fallo de verdad del servidor: se cuenta una vez y se dice.
    backend.verify();
    expect(auth.getToken()).toBe('token-valido');
  });

  it('reintenta mientras el servidor despierta (503) y se queda con la buena', async () => {
    vi.useFakeTimers();
    const { http, backend } = montar('token-valido');

    let recibido: unknown = null;
    http.get('/api/exercises').subscribe((valor) => (recibido = valor));

    backend.expectOne('/api/exercises').flush('dormido', { status: 503, statusText: 'Service Unavailable' });
    await vi.advanceTimersByTimeAsync(1000);
    backend.expectOne('/api/exercises').flush([{ id: 'e1' }]);

    expect(recibido).toEqual([{ id: 'e1' }]);
  });

  it('reintenta una lectura que no llegó y se queda con la respuesta buena', async () => {
    vi.useFakeTimers();
    const { http, backend } = montar('token-valido');

    let recibido: unknown = null;
    http.get('/api/exercises').subscribe((valor) => (recibido = valor));

    backend.expectOne('/api/exercises').error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    await vi.advanceTimersByTimeAsync(1000);
    backend.expectOne('/api/exercises').flush([{ id: 'e1' }]);

    expect(recibido).toEqual([{ id: 'e1' }]);
  });

  it('no repite lo que escribe: un entreno se guarda una vez o ninguna', async () => {
    vi.useFakeTimers();
    const { http, backend } = montar('token-valido');

    http.post('/api/sessions', { exercises: [] }).subscribe({ error: () => undefined });
    backend.expectOne('/api/sessions').flush('boom', { status: 500, statusText: 'Internal Server Error' });
    await vi.advanceTimersByTimeAsync(5000);

    backend.verify();
  });
});
