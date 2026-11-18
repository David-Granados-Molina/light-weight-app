import { NextFunction, Request, Response } from 'express';
import { tokenDeLaPeticion, verifyToken } from '../lib/auth';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = tokenDeLaPeticion(req.header('authorization'));
  const userId = token ? verifyToken(token) : null;

  if (!userId) return res.status(401).json({ error: 'No autenticado' });

  req.userId = userId;
  next();
}
