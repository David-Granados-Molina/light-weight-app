import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

export const exercisesRouter = Router();

const exerciseSchema = z.object({
  name: z.string().min(2),
  category: z.enum(['gym', 'calistenia']),
  type: z.enum(['empuje', 'tiron', 'pierna', 'core']),
  inputType: z.enum(['peso', 'reps', 'tiempo']),
  muscleGroup: z.string().optional().nullable(),
});

// GET /api/exercises?category=gym|calistenia&q=texto
exercisesRouter.get('/', async (req, res) => {
  const { category, q } = req.query;

  const exercises = await prisma.exercise.findMany({
    where: {
      ...(category ? { category: category as 'gym' | 'calistenia' } : {}),
      ...(q ? { name: { contains: String(q) } } : {}),
    },
    orderBy: { name: 'asc' },
  });

  res.json(exercises);
});

exercisesRouter.get('/:id', async (req, res) => {
  const exercise = await prisma.exercise.findUnique({ where: { id: req.params.id } });
  if (!exercise) return res.status(404).json({ error: 'Ejercicio no encontrado' });
  res.json(exercise);
});

exercisesRouter.post('/', async (req, res) => {
  const parsed = exerciseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const exercise = await prisma.exercise.create({ data: parsed.data });
    res.status(201).json(exercise);
  } catch {
    res.status(409).json({ error: 'Ya existe un ejercicio con ese nombre' });
  }
});

exercisesRouter.put('/:id', async (req, res) => {
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
});

exercisesRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.exercise.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: 'Ejercicio no encontrado' });
  }
});
