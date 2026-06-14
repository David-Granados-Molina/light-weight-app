import { Router } from 'express';
import { z } from 'zod';
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
  type: z.enum(['empuje', 'tiron', 'pierna', 'core']),
  source: z.enum(['manual', 'whatsapp']).default('manual'),
  notes: z.string().optional().nullable(),
  exercises: z.array(sessionExerciseSchema).min(1),
});

const include = {
  exercises: {
    orderBy: { order: 'asc' as const },
    include: { exercise: true, sets: { orderBy: { setNumber: 'asc' as const } } },
  },
};

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

sessionsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.workoutSession.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: 'Entreno no encontrado' });
  }
});
