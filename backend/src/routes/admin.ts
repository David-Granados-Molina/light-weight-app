import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { buildProgressData } from './progress';
import { routineInclude } from './routines';
import { sessionInclude } from './sessions';

export const adminRouter = Router();

// GET /api/admin/users -> resto de usuarios (para la pantalla de "Amigos")
adminRouter.get('/users', async (req, res) => {
  const users = await prisma.user.findMany({
    where: { id: { not: req.userId! } },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });
  res.json(users);
});

// GET /api/admin/users/:userId/sessions?category=&q=&from=&to=
adminRouter.get('/users/:userId/sessions', async (req, res) => {
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
});

// GET /api/admin/users/:userId/routines
adminRouter.get('/users/:userId/routines', async (req, res) => {
  const routines = await prisma.routine.findMany({
    where: { userId: req.params.userId },
    orderBy: { createdAt: 'asc' },
    include: routineInclude,
  });
  res.json(routines);
});

// GET /api/admin/users/:userId/progress/routine/:routineId
adminRouter.get('/users/:userId/progress/routine/:routineId', async (req, res) => {
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
});
