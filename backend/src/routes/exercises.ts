import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler';
import { prisma } from '../lib/prisma';

export const exercisesRouter = Router();

const exerciseSchema = z.object({
  name: z.string().min(2),
  category: z.enum(['gym', 'calistenia']),
  type: z.enum(['empuje', 'tiron', 'pierna', 'core', 'cardio']),
  inputType: z.enum(['peso', 'reps', 'tiempo', 'emom', 'min']),
  muscleGroup: z.string().optional().nullable(),
  primaryMuscles: z.array(z.string().min(1).max(40)).max(8).optional(),
  secondaryMuscles: z.array(z.string().min(1).max(40)).max(8).optional(),
});

// GET /api/exercises?category=gym|calistenia&q=texto
exercisesRouter.get('/', asyncHandler(async (req, res) => {
  const { category, q } = req.query;

  const exercises = await prisma.exercise.findMany({
    where: {
      ...(category ? { category: category as 'gym' | 'calistenia' } : {}),
      ...(q ? { name: { contains: String(q) } } : {}),
    },
    orderBy: { name: 'asc' },
  });

  res.json(exercises);
}));

exercisesRouter.get('/:id', asyncHandler(async (req, res) => {
  const exercise = await prisma.exercise.findUnique({ where: { id: req.params.id } });
  if (!exercise) return res.status(404).json({ error: 'Ejercicio no encontrado' });
  res.json(exercise);
}));

exercisesRouter.post('/', asyncHandler(async (req, res) => {
  const parsed = exerciseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const exercise = await prisma.exercise.create({ data: parsed.data });
    res.status(201).json(exercise);
  } catch {
    res.status(409).json({ error: 'Ya existe un ejercicio con ese nombre' });
  }
}));

exercisesRouter.put('/:id', asyncHandler(async (req, res) => {
  const parsed = exerciseSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const exercise = await prisma.exercise.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    res.json(exercise);
  } catch {
    res.status(404).json({ error: 'Ejercicio no encontrado' });
  }
}));

exercisesRouter.delete('/:id', asyncHandler(async (req, res) => {
  try {
    await prisma.exercise.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: 'Ejercicio no encontrado' });
  }
}));
