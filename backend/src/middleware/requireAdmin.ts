import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

/** Solo deja pasar al usuario cuyo email coincide con ADMIN_EMAIL (pantalla de "Amigos"). */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user || !process.env.ADMIN_EMAIL || user.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  next();
}
