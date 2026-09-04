import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';
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
