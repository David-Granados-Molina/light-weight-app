import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, retry, throwError, timer } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * En el gimnasio la cobertura va y viene, y la API gratuita de Render se
 * duerme: un fallo suelto no significa que pase nada malo. Se reintenta lo que
 * se puede repetir sin consecuencias —las lecturas— y solo un 401, que es el
 * servidor diciendo que el token no vale, cierra la sesión.
 *
 * `SIN_SESION` son las tres rutas por las que se entra: un 401 ahí es "ese
 * código no vale", no "tu sesión ha caducado". El resto de `/auth`, como
 * guardar el perfil, sí es sesión abierta y se trata como tal.
 */
const SIN_SESION = ['/auth/request-code', '/auth/verify-code', '/auth/test-login'];

const REINTENTOS = 2;
const ESPERA_BASE_MS = 800;

/** Sin red no hay nada que reintentar: el error es inmediato y verdadero. */
const PASAJEROS = [0, 408, 429, 502, 503, 504];

function esPasajero(err: unknown): boolean {
  if (!navigator.onLine) return false;
  return err instanceof HttpErrorResponse && PASAJEROS.includes(err.status);
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    retry({
      count: req.method === 'GET' ? REINTENTOS : 0,
      delay: (err, intento) => (esPasajero(err) ? timer(intento * ESPERA_BASE_MS) : throwError(() => err)),
    }),
    catchError((err) => {
      if (err.status === 401 && !SIN_SESION.some((ruta) => req.url.includes(ruta))) {
        authService.cerrarSesion('rechazada');
      }
      return throwError(() => err);
    }),
  );
};
