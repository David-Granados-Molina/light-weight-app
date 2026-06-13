import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../lib/auth';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const userId = token ? verifyToken(token) : null;

  if (!userId) return res.status(401).json({ error: 'No autenticado' });

  req.userId = userId;
  next();
}
