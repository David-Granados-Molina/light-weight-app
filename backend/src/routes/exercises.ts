import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler';
import { prisma } from '../lib/prisma';
import { isAdminEmail } from '../lib/accounts';

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

/**
 * Quién puede tocar un ejercicio del catálogo compartido: quien administra, y
 * quien lo creó. Los del catálogo base no tienen autor, así que son solo del
 * administrador.
 */
async function puedeGestionar(userId: string, exercise: { createdById: string | null }): Promise<boolean> {
  if (exercise.createdById === userId) return true;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  return !!user && isAdminEmail(user.email);
}

exercisesRouter.post('/', asyncHandler(async (req, res) => {
  const parsed = exerciseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const exercise = await prisma.exercise.create({ data: { ...parsed.data, createdById: req.userId! } });
    res.status(201).json(exercise);
  } catch {
    res.status(409).json({ error: 'Ya existe un ejercicio con ese nombre' });
  }
}));

exercisesRouter.put('/:id', asyncHandler(async (req, res) => {
  const parsed = exerciseSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const actual = await prisma.exercise.findUnique({
    where: { id: req.params.id },
    select: { id: true, createdById: true },
  });
  if (!actual) return res.status(404).json({ error: 'Ejercicio no encontrado' });
  if (!(await puedeGestionar(req.userId!, actual))) return res.status(403).json({ error: 'No autorizado' });

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
  const exercise = await prisma.exercise.findUnique({
    where: { id: req.params.id },
    select: { id: true, createdById: true },
  });
  if (!exercise) return res.status(404).json({ error: 'Ejercicio no encontrado' });
  if (!(await puedeGestionar(req.userId!, exercise))) return res.status(403).json({ error: 'No autorizado' });

  // Borrarlo dejaría entrenos y rutinas apuntando al vacío, así que se dice
  // cuántos lo usan en vez de fallar con un error de clave ajena.
  const [enEntrenos, enRutinas] = await Promise.all([
    prisma.sessionExercise.count({ where: { exerciseId: exercise.id } }),
    prisma.routineExercise.count({ where: { exerciseId: exercise.id } }),
  ]);
  if (enEntrenos || enRutinas) {
    return res.status(409).json({ error: 'El ejercicio está en uso', enEntrenos, enRutinas });
  }

  await prisma.exercise.delete({ where: { id: exercise.id } });
  res.status(204).send();
}));
