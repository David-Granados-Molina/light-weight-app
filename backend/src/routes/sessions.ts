import { Router } from 'express';
import { z } from 'zod';
import { addDays, startOfDay } from '../lib/dateUtils';
import { prisma } from '../lib/prisma';

export const sessionsRouter = Router();

const setSchema = z.object({
  setNumber: z.number().int().min(1),
  weight: z.number().min(0).optional().nullable(),
  reps: z.number().int().min(0).optional().nullable(),
  time: z.number().int().min(0).optional().nullable(),
});

const sessionExerciseSchema = z.object({
  exerciseId: z.string(),
  sets: z.array(setSchema).min(1),
});

const sessionSchema = z.object({
  date: z.coerce.date().optional(),
  category: z.enum(['gym', 'calistenia']),
  type: z.enum(['empuje', 'tiron', 'pierna', 'core', 'cardio']),
  source: z.enum(['manual', 'whatsapp']).default('manual'),
  notes: z.string().optional().nullable(),
  routineId: z.string().optional().nullable(),
  exercises: z.array(sessionExerciseSchema).min(1),
});

export const sessionInclude = {
  exercises: {
    orderBy: { order: 'asc' as const },
    include: { exercise: true, sets: { orderBy: { setNumber: 'asc' as const } } },
  },
};

const include = sessionInclude;

// GET /api/sessions?category=gym|calistenia&q=texto&exerciseId=...&from=YYYY-MM-DD&to=YYYY-MM-DD&limit=20
sessionsRouter.get('/', async (req, res) => {
  const userId = req.userId!;
  const { category, q, exerciseId, from, to, limit } = req.query;

  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      ...(category ? { category: category as 'gym' | 'calistenia' } : {}),
      ...(q
        ? {
            exercises: {
              some: { exercise: { name: { contains: String(q) } } },
            },
          }
        : {}),
      ...(exerciseId ? { exercises: { some: { exerciseId: String(exerciseId) } } } : {}),
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
    take: limit ? Number(limit) : undefined,
    include,
  });

  res.json(sessions);
});

// GET /api/sessions/last?exerciseIds=id1,id2,... -> última sesión registrada para cada ejercicio
sessionsRouter.get('/last', async (req, res) => {
  const userId = req.userId!;
  const ids = String(req.query.exerciseIds ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  const result: Record<string, { date: string; sets: unknown[] } | null> = {};
  for (const id of ids) result[id] = null;
  if (!ids.length) return res.json(result);

  const sessionExercises = await prisma.sessionExercise.findMany({
    where: { exerciseId: { in: ids }, session: { userId } },
    include: { session: true, sets: { orderBy: { setNumber: 'asc' } } },
    orderBy: { session: { date: 'desc' } },
  });

  for (const se of sessionExercises) {
    if (result[se.exerciseId] === null) {
      result[se.exerciseId] = { date: se.session.date.toISOString(), sets: se.sets };
    }
  }

  res.json(result);
});

// GET /api/sessions/by-date/:date -> entreno existente ese día (para editarlo), o 404 si no hay
sessionsRouter.get('/by-date/:date', async (req, res) => {
  const userId = req.userId!;
  const day = new Date(req.params.date);
  if (Number.isNaN(day.getTime())) return res.status(400).json({ error: 'Fecha no válida' });

  const start = startOfDay(day);
  const session = await prisma.workoutSession.findFirst({
    where: { userId, date: { gte: start, lt: addDays(start, 1) } },
    include,
  });

  if (!session) return res.status(404).json({ error: 'No hay entreno ese día' });
  res.json(session);
});

sessionsRouter.get('/:id', async (req, res) => {
  const session = await prisma.workoutSession.findUnique({ where: { id: req.params.id }, include });
  if (!session) return res.status(404).json({ error: 'Entreno no encontrado' });
  res.json(session);
});

sessionsRouter.post('/', async (req, res) => {
  const parsed = sessionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const userId = req.userId!;
  const { exercises, date, ...rest } = parsed.data;

  const session = await prisma.workoutSession.create({
    data: {
      ...rest,
      userId,
      date: date ?? new Date(),
      exercises: {
        create: exercises.map((e, i) => ({
          exerciseId: e.exerciseId,
          order: i,
          sets: {
            create: e.sets.map((s) => ({
              setNumber: s.setNumber,
              weight: s.weight ?? null,
              reps: s.reps ?? null,
              time: s.time ?? null,
            })),
          },
        })),
      },
    },
    include,
  });

  res.status(201).json(session);
});

sessionsRouter.put('/:id', async (req, res) => {
  const parsed = sessionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { exercises, date, ...rest } = parsed.data;

  try {
    await prisma.sessionExercise.deleteMany({ where: { sessionId: req.params.id } });

    const session = await prisma.workoutSession.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        date: date ?? new Date(),
        exercises: {
          create: exercises.map((e, i) => ({
            exerciseId: e.exerciseId,
            order: i,
            sets: {
              create: e.sets.map((s) => ({
                setNumber: s.setNumber,
                weight: s.weight ?? null,
                reps: s.reps ?? null,
                time: s.time ?? null,
              })),
            },
          })),
        },
      },
      include,
    });

    res.json(session);
  } catch {
    res.status(404).json({ error: 'Entreno no encontrado' });
  }
});

sessionsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.workoutSession.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: 'Entreno no encontrado' });
  }
});
