import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthUser } from '../models/auth.model';
import { AuthService } from './auth.service';
import { WorkoutDraftStore } from './workout-draft.store';

const USUARIO: AuthUser = {
  id: 'u-david',
  name: 'David',
  email: 'david@ejemplo.com',
  avatarUrl: null,
  themeColor: null,
  isAdmin: true,
};

const OTRO: AuthUser = { ...USUARIO, id: 'u-filo', name: 'Filo', email: 'filo@ejemplo.com', isAdmin: false };

const EJERCICIO = {
  exercise: {
    id: 'e1',
    name: 'Press banca',
    category: 'gym' as const,
    type: 'empuje' as const,
    inputType: 'peso' as const,
    muscleGroup: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  sets: [{ weight: 60, reps: 8 }],
};

function montar() {
  const navegaciones: string[][] = [];

  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: Router,
        useValue: {
          navigate: (comandos: string[]) => {
            navegaciones.push(comandos);
            return Promise.resolve(true);
          },
        },
      },
    ],
  });

  return {
    auth: TestBed.inject(AuthService),
    draft: TestBed.inject(WorkoutDraftStore),
    http: TestBed.inject(HttpTestingController),
    navegaciones,
  };
}

describe('AuthService: arrancar con una sesión guardada', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('mantiene la sesión cuando la petición no llega al servidor', async () => {
    localStorage.setItem('lw_token', 'token-valido');
    const { auth, http } = montar();

    const init = auth.init();
    http.expectOne('/api/auth/me').error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    await init;

    expect(auth.getToken()).toBe('token-valido');
  });

  it('mantiene la sesión cuando el servidor falla con un 500', async () => {
    localStorage.setItem('lw_token', 'token-valido');
    const { auth, http } = montar();

    const init = auth.init();
    http.expectOne('/api/auth/me').flush('boom', { status: 500, statusText: 'Internal Server Error' });
    await init;

    expect(auth.getToken()).toBe('token-valido');
  });

  it('da por buena la sesión guardada mientras el servidor no responde', async () => {
    localStorage.setItem('lw_token', 'token-valido');
    localStorage.setItem('lw_user', JSON.stringify(USUARIO));
    const { auth, http } = montar();

    const init = auth.init();
    http.expectOne('/api/auth/me').error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    await init;

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.currentUser()?.name).toBe('David');
  });

  it('cierra la sesión cuando el servidor rechaza el token', async () => {
    localStorage.setItem('lw_token', 'token-caducado');
    localStorage.setItem('lw_user', JSON.stringify(USUARIO));
    const { auth, http, navegaciones } = montar();

    const init = auth.init();
    http.expectOne('/api/auth/me').flush({ error: 'No autenticado' }, { status: 401, statusText: 'Unauthorized' });
    await init;

    expect(auth.getToken()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
    expect(navegaciones.at(-1)).toEqual(['/login']);
  });

  it('se queda con el token renovado que manda el servidor', async () => {
    localStorage.setItem('lw_token', 'token-viejo');
    const { auth, http } = montar();

    const init = auth.init();
    http.expectOne('/api/auth/me').flush({ ...USUARIO, tokenRenovado: 'token-nuevo' });
    await init;

    expect(auth.getToken()).toBe('token-nuevo');
    expect(localStorage.getItem('lw_user')).not.toContain('tokenRenovado');
  });

  it('no se queda colgado si el servidor coge la llamada y no contesta', async () => {
    vi.useFakeTimers();
    localStorage.setItem('lw_token', 'token-valido');
    const { auth, http } = montar();

    let resuelto = false;
    const init = auth.init().then(() => {
      resuelto = true;
    });
    http.expectOne('/api/auth/me');

    await vi.advanceTimersByTimeAsync(8000);
    await init;

    expect(resuelto).toBe(true);
    expect(auth.getToken()).toBe('token-valido');
    vi.useRealTimers();
  });

  it('guarda el usuario que devuelve el servidor para el siguiente arranque', async () => {
    localStorage.setItem('lw_token', 'token-valido');
    const { auth, http } = montar();

    const init = auth.init();
    http.expectOne('/api/auth/me').flush(USUARIO);
    await init;

    expect(JSON.parse(localStorage.getItem('lw_user')!).id).toBe('u-david');
  });
});

describe('AuthService: el entreno a medias', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('sobrevive a que se cierre la sesión', () => {
    localStorage.setItem('lw_token', 'token-valido');
    const { auth, draft } = montar();
    draft.added.set([EJERCICIO]);

    auth.logout();

    expect(draft.added().length).toBe(1);
  });

  it('sigue ahí cuando vuelve a entrar el mismo usuario', () => {
    const { auth, draft, http } = montar();
    draft.added.set([EJERCICIO]);
    draft.ownerId.set(USUARIO.id);

    auth.verifyCode('david@ejemplo.com', '12345678').subscribe();
    http.expectOne('/api/auth/verify-code').flush({ token: 'token-nuevo', user: USUARIO });

    expect(draft.added().length).toBe(1);
  });

  it('se descarta cuando entra otra persona', () => {
    const { auth, draft, http } = montar();
    draft.added.set([EJERCICIO]);
    draft.ownerId.set(USUARIO.id);

    auth.verifyCode('filo@ejemplo.com', '12345678').subscribe();
    http.expectOne('/api/auth/verify-code').flush({ token: 'token-nuevo', user: OTRO });

    expect(draft.added().length).toBe(0);
  });
});
