import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler';
import { prisma } from '../lib/prisma';
import { ejercicioVisible, puedeGestionar, visiblePara } from '../lib/exercise-scope';

export const exercisesRouter = Router();

const exerciseSchema = z.object({
  name: z.string().min(2),
  category: z.enum(['gym', 'calistenia']),
  type: z.enum(['empuje', 'tiron', 'pierna', 'core', 'cardio']),
  inputType: z.enum(['peso', 'reps', 'tiempo', 'emom', 'min']),
  muscleGroup: z.string().optional().nullable(),
  primaryMuscles: z.array(z.string().min(1).max(40)).max(8).optional(),
  secondaryMuscles: z.array(z.string().min(1).max(40)).max(8).optional(),
  imageUrl: z.string().url().max(500).optional().nullable().or(z.literal('')),
  imageAuthor: z.string().max(120).optional().nullable(),
  imageLicense: z.string().max(60).optional().nullable(),
});

const vacioANull = <T>(valor: T | '' | undefined): T | null | undefined =>
  valor === '' ? null : valor;

// GET /api/exercises?category=gym|calistenia&q=texto
exercisesRouter.get('/', asyncHandler(async (req, res) => {
  const { category, q } = req.query;

  const exercises = await prisma.exercise.findMany({
    where: {
      ...visiblePara(req.userId!),
      ...(category ? { category: category as 'gym' | 'calistenia' } : {}),
      ...(q ? { name: { contains: String(q) } } : {}),
    },
    orderBy: { name: 'asc' },
  });

  res.json(exercises);
}));

exercisesRouter.get('/:id', asyncHandler(async (req, res) => {
  const exercise = await ejercicioVisible(req.userId!, req.params.id);
  if (!exercise) return res.status(404).json({ error: 'Ejercicio no encontrado' });
  res.json(exercise);
}));

exercisesRouter.post('/', asyncHandler(async (req, res) => {
  const parsed = exerciseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  // El nombre solo choca con los que ya ve este usuario: los suyos y los del
  // catálogo base.
  const repetido = await prisma.exercise.findFirst({
    where: { name: parsed.data.name, ...visiblePara(req.userId!) },
    select: { id: true },
  });
  if (repetido) return res.status(409).json({ error: 'Ya existe un ejercicio con ese nombre' });

  try {
    const exercise = await prisma.exercise.create({
      data: { ...parsed.data, imageUrl: vacioANull(parsed.data.imageUrl) ?? null, createdById: req.userId! },
    });
    res.status(201).json(exercise);
  } catch {
    res.status(409).json({ error: 'Ya existe un ejercicio con ese nombre' });
  }
}));

exercisesRouter.put('/:id', asyncHandler(async (req, res) => {
  const parsed = exerciseSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const actual = await ejercicioVisible(req.userId!, req.params.id);
  if (!actual) return res.status(404).json({ error: 'Ejercicio no encontrado' });
  if (!(await puedeGestionar(req.userId!, actual))) return res.status(403).json({ error: 'No autorizado' });

  if (parsed.data.name && parsed.data.name !== actual.name) {
    const repetido = await prisma.exercise.findFirst({
      where: { name: parsed.data.name, id: { not: actual.id }, ...visiblePara(req.userId!) },
      select: { id: true },
    });
    if (repetido) return res.status(409).json({ error: 'Ya existe un ejercicio con ese nombre' });
  }

  const { imageUrl, imageAuthor, imageLicense, ...resto } = parsed.data;

  try {
    const exercise = await prisma.exercise.update({
      where: { id: actual.id },
      data: {
        ...resto,
        ...(imageUrl !== undefined ? { imageUrl: vacioANull(imageUrl) } : {}),
        ...(imageAuthor !== undefined ? { imageAuthor } : {}),
        ...(imageLicense !== undefined ? { imageLicense } : {}),
      },
    });
    res.json(exercise);
  } catch {
    res.status(404).json({ error: 'Ejercicio no encontrado' });
  }
}));

exercisesRouter.delete('/:id', asyncHandler(async (req, res) => {
  const exercise = await ejercicioVisible(req.userId!, req.params.id);
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
