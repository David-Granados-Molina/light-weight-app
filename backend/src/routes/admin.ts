import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { prisma } from '../lib/prisma';
import { buildProgressData } from './progress';
import {
  createRoutineFor,
  deleteRoutineFor,
  routineInclude,
  routineSchema,
  updateRoutineFor,
} from './routines';
import { sessionInclude } from './sessions';

export const adminRouter = Router();

// GET /api/admin/users -> resto de usuarios (para la pantalla de "Amigos")
adminRouter.get('/users', asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    where: { id: { not: req.userId! } },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });
  res.json(users);
}));

// GET /api/admin/users/:userId/sessions?category=&q=&from=&to=
adminRouter.get('/users/:userId/sessions', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { category, q, from, to } = req.query;

  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      ...(category ? { category: category as 'gym' | 'calistenia' } : {}),
      ...(q ? { exercises: { some: { exercise: { name: { contains: String(q) } } } } } : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(String(from)) } : {}),
              ...(to ? { lte: new Date(String(to)) } : {}),
            },
          }
        : {}),
    },
    orderBy: { date: 'desc' },
    include: sessionInclude,
  });

  res.json(sessions);
}));

// GET /api/admin/users/:userId/routines
adminRouter.get('/users/:userId/routines', asyncHandler(async (req, res) => {
  const routines = await prisma.routine.findMany({
    where: { userId: req.params.userId },
    orderBy: { createdAt: 'asc' },
    include: routineInclude,
  });
  res.json(routines);
}));

// GET /api/admin/users/:userId/routines/:routineId
adminRouter.get('/users/:userId/routines/:routineId', asyncHandler(async (req, res) => {
  const { userId, routineId } = req.params;
  const routine = await prisma.routine.findFirst({ where: { id: routineId, userId }, include: routineInclude });
  if (!routine) return res.status(404).json({ error: 'Rutina no encontrada' });
  res.json(routine);
}));

/* Alta, edición y baja de rutinas ajenas. Toda la lógica es la de `routines.ts`,
   con el dueño como parámetro: lo único que cambia es de quién es la rutina. El
   `requireAdmin` que monta este router en `index.ts` es lo que autoriza. */

// POST /api/admin/users/:userId/routines
adminRouter.post('/users/:userId/routines', asyncHandler(async (req, res) => {
  const parsed = routineSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const target = await prisma.user.findUnique({ where: { id: req.params.userId }, select: { id: true } });
  if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

  res.status(201).json(await createRoutineFor(target.id, parsed.data));
}));

// PUT /api/admin/users/:userId/routines/:routineId
adminRouter.put('/users/:userId/routines/:routineId', asyncHandler(async (req, res) => {
  const parsed = routineSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const routine = await updateRoutineFor(req.params.userId, req.params.routineId, parsed.data);
  if (!routine) return res.status(404).json({ error: 'Rutina no encontrada' });

  res.json(routine);
}));

// DELETE /api/admin/users/:userId/routines/:routineId
adminRouter.delete('/users/:userId/routines/:routineId', asyncHandler(async (req, res) => {
  const deleted = await deleteRoutineFor(req.params.userId, req.params.routineId);
  if (!deleted) return res.status(404).json({ error: 'Rutina no encontrada' });

  res.status(204).send();
}));

// GET /api/admin/users/:userId/progress/routine/:routineId
adminRouter.get('/users/:userId/progress/routine/:routineId', asyncHandler(async (req, res) => {
  const { userId, routineId } = req.params;

  const routine = await prisma.routine.findFirst({
    where: { id: routineId, userId },
    include: { exercises: { orderBy: { order: 'asc' }, include: { exercise: true } } },
  });
  if (!routine) return res.status(404).json({ error: 'Rutina no encontrada' });

  const items = await Promise.all(
    routine.exercises.map(async (re) => ({
      exercise: re.exercise,
      ...(await buildProgressData(userId, re.exercise, routine.id)),
    })),
  );

  res.json({ routine: { id: routine.id, name: routine.name, category: routine.category }, items });
}));
