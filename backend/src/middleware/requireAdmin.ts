import { asyncHandler } from '../lib/async-handler';
import { prisma } from '../lib/prisma';

/**
 * Solo deja pasar al usuario cuyo email coincide con ADMIN_EMAIL (pantalla de "Amigos").
 *
 * Va envuelto en `asyncHandler` por lo mismo que los handlers: es `async`, y un
 * fallo de base de datos aquí dejaba la petición colgada en vez de devolver 500.
 */
export const requireAdmin = asyncHandler(async (req, res, next) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user || !process.env.ADMIN_EMAIL || user.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  next();
});
