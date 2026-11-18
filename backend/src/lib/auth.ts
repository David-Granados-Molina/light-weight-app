import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * Sin secreto propio, cualquiera que lea este repositorio —que es público—
 * podría firmar tokens válidos. En producción se prefiere no arrancar a
 * arrancar con la puerta abierta; en local basta con avisar.
 */
const SECRETO_DE_APAÑO = 'dev-secret-change-me';
const JWT_SECRET = process.env.JWT_SECRET || SECRETO_DE_APAÑO;

if (JWT_SECRET === SECRETO_DE_APAÑO) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET no está definido: la API no arranca con el secreto de desarrollo.');
  }
  console.warn('[auth] Sin JWT_SECRET: se usa el secreto de desarrollo. No vale para producción.');
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '180d';

/**
 * Versión del formato de sesión. Va dentro del token y se comprueba al validarlo:
 * subirla invalida de golpe todas las sesiones abiertas y obliga a entrar de nuevo.
 *
 * 1 → email + contraseña (o Google).
 * 2 → código de un solo uso enviado por email.
 *
 * Se hace aquí y no cambiando `JWT_SECRET` porque no depende de tocar variables de
 * entorno en el despliegue, y no en base de datos porque `requireAuth` no consulta
 * la base: un campo por usuario obligaría a una consulta en cada petición.
 */
export const AUTH_TOKEN_VERSION = 2;

/** Los códigos se guardan hasheados; un volcado de la tabla no debe dar acceso. */
export function hashLoginCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

export function compareLoginCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId, v: AUTH_TOKEN_VERSION }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

/**
 * Un token que no se renueva caduca a la mitad de un entreno, sin aviso y sin
 * forma de volver a entrar sin pedir otro código. Mientras la sesión se use, se
 * renueva sola: pasada la mitad de su vida, `/me` devuelve uno nuevo.
 *
 * El margen sale de la vida del propio token y no de una constante, para que
 * cambiar `JWT_EXPIRES_IN` no deje a `/me` renovando en cada petición.
 */
export function tocaRenovar(token: string): boolean {
  try {
    const payload = jwt.decode(token) as jwt.JwtPayload | null;
    if (!payload?.exp || !payload.iat) return false;

    const vidaMs = (payload.exp - payload.iat) * 1000;
    return payload.exp * 1000 - Date.now() < vidaMs / 2;
  } catch {
    return false;
  }
}

export function tokenDeLaPeticion(header: string | undefined): string | null {
  return header?.startsWith('Bearer ') ? header.slice(7) : null;
}

export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;

    // Un token del sistema anterior es válido criptográficamente pero ya no vale:
    // no lleva `v`, o lleva una versión vieja.
    if (payload.v !== AUTH_TOKEN_VERSION) {
      console.warn('[auth] Token rechazado: versión de sesión obsoleta');
      return null;
    }

    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch (err) {
    // Solo se registra en el servidor (caducado, firma inválida, mal formado...);
    // al cliente le sigue llegando un genérico "No autenticado" desde requireAuth,
    // para no darle pistas sobre qué falló exactamente en su token.
    const reason = err instanceof Error ? err.message : 'error desconocido';
    console.warn(`[auth] Token rechazado: ${reason}`);
    return null;
  }
}
