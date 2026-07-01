import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '180d';

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
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
