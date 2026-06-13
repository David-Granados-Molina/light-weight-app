import { Router } from 'express';
import { prisma } from '../lib/prisma';

export const progressRouter = Router();

type SetLike = { weight: number | null; reps: number | null; time: number | null };

function maxValue(sets: SetLike[], inputType: string): number {
  if (inputType === 'peso') return Math.max(0, ...sets.map((s) => s.weight ?? 0));
  if (inputType === 'tiempo') return Math.max(0, ...sets.map((s) => s.time ?? 0));
  return Math.max(0, ...sets.map((s) => s.reps ?? 0));
}

function volumeValue(sets: SetLike[], inputType: string): number {
  if (inputType === 'peso') return sets.reduce((acc, s) => acc + (s.weight ?? 0) * (s.reps ?? 0), 0);
  if (inputType === 'tiempo') return sets.reduce((acc, s) => acc + (s.time ?? 0), 0);
  return sets.reduce((acc, s) => acc + (s.reps ?? 0), 0);
}

// GET /api/progress/exercises -> ejercicios con histórico registrado
progressRouter.get('/exercises', async (req, res) => {
  const userId = req.userId!;

  const sessionExercises = await prisma.sessionExercise.findMany({
    where: { session: { userId } },
    distinct: ['exerciseId'],
    include: { exercise: true },
  });

  const exercises = sessionExercises
    .map((se) => se.exercise)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  res.json(exercises);
});

// GET /api/progress/:exerciseId?metric=peso|volumen
progressRouter.get('/:exerciseId', async (req, res) => {
  const userId = req.userId!;
  const metric = req.query.metric === 'volumen' ? 'volumen' : 'peso';

  const exercise = await prisma.exercise.findUnique({ where: { id: req.params.exerciseId } });
  if (!exercise) return res.status(404).json({ error: 'Ejercicio no encontrado' });

  const sessionExercises = await prisma.sessionExercise.findMany({
    where: { exerciseId: exercise.id, session: { userId } },
    include: { session: true, sets: true },
    orderBy: { session: { date: 'asc' } },
  });

  const points = sessionExercises.map((se) => ({
    date: se.session.date.toISOString(),
    value:
      metric === 'volumen'
        ? volumeValue(se.sets, exercise.inputType)
        : maxValue(se.sets, exercise.inputType),
  }));

  const values = points.map((p) => p.value);
  const pr = values.length ? Math.max(...values) : 0;
  const actual = values.length ? values[values.length - 1] : 0;
  const first = values.length ? values[0] : 0;
  const cambio = actual - first;

  res.json({
    exercise,
    metric,
    points,
    pr,
    actual,
    cambio,
  });
});
