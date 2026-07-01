import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

export const routinesRouter = Router();

const routineExerciseSchema = z
  .object({
    exerciseId: z.string(),
    targetSets: z.number().int().min(1).max(20),
    targetRepsMin: z.number().int().min(1).max(200),
    targetRepsMax: z.number().int().min(1).max(200),
    targetWeight: z.number().min(0).max(300).optional().nullable(),
    targetRIR: z.number().int().min(0).max(10).optional().nullable(),
    note: z.string().max(500).optional().nullable(),
  })
  .refine((data) => data.targetRepsMax >= data.targetRepsMin, {
    message: 'targetRepsMax debe ser mayor o igual que targetRepsMin',
  });

const routineSchema = z.object({
  name: z.string().min(2),
  category: z.enum(['gym', 'calistenia']),
  notes: z.string().optional().nullable(),
  exercises: z.array(routineExerciseSchema).default([]),
});

export const routineInclude = {
  exercises: {
    orderBy: { order: 'asc' as const },
    include: { exercise: true },
  },
};

const include = routineInclude;

routinesRouter.get('/', async (req, res) => {
  const userId = req.userId!;
  const routines = await prisma.routine.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include,
  });
  res.json(routines);
});

routinesRouter.get('/:id', async (req, res) => {
  const routine = await prisma.routine.findUnique({ where: { id: req.params.id }, include });
  if (!routine) return res.status(404).json({ error: 'Rutina no encontrada' });
  res.json(routine);
});

routinesRouter.post('/', async (req, res) => {
  const parsed = routineSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const userId = req.userId!;
  const { exercises, ...rest } = parsed.data;

  const routine = await prisma.routine.create({
    data: {
      ...rest,
      userId,
      exercises: {
        create: exercises.map((e, i) => ({ ...e, order: i })),
      },
    },
    include,
  });

  res.status(201).json(routine);
});

routinesRouter.put('/:id', async (req, res) => {
  const parsed = routineSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { exercises, ...rest } = parsed.data;

  try {
    // Reemplaza la lista completa de ejercicios de la rutina
    await prisma.routineExercise.deleteMany({ where: { routineId: req.params.id } });

    const routine = await prisma.routine.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        exercises: {
          create: exercises.map((e, i) => ({ ...e, order: i })),
        },
      },
      include,
    });

    res.json(routine);
  } catch {
    res.status(404).json({ error: 'Rutina no encontrada' });
  }
});

routinesRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.routine.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: 'Rutina no encontrada' });
  }
});
