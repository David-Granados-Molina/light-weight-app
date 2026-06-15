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
  if (inputType === 'emom') return sets.reduce((acc, s) => acc + (s.reps ?? 0) * (s.time ?? 0), 0);
  return sets.reduce((acc, s) => acc + (s.reps ?? 0), 0);
}

/** Compara el mejor valor del último mes con datos frente al del mes anterior con datos. */
function monthlyChange(points: { date: string; value: number }[]): number {
  const byMonth = new Map<string, number[]>();
  for (const p of points) {
    const key = p.date.slice(0, 7);
    const values = byMonth.get(key) ?? [];
    values.push(p.value);
    byMonth.set(key, values);
  }

  const months = [...byMonth.keys()].sort();
  if (!months.length) return 0;

  const lastMonth = months[months.length - 1];
  const previousMonth = months[months.length - 2];

  const currentBest = Math.max(...byMonth.get(lastMonth)!);
  if (!previousMonth) return 0;

  const previousBest = Math.max(...byMonth.get(previousMonth)!);
  return currentBest - previousBest;
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

type ExerciseLike = { id: string; inputType: string };

async function buildProgressData(userId: string, exercise: ExerciseLike, metric: 'peso' | 'volumen') {
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
  const cambio = monthlyChange(points);

  return { metric, points, pr, actual, cambio };
}

// GET /api/progress/routine/:routineId?metric=peso|volumen -> progreso de cada ejercicio de la rutina
progressRouter.get('/routine/:routineId', async (req, res) => {
  const userId = req.userId!;
  const metric = req.query.metric === 'volumen' ? 'volumen' : 'peso';

  const routine = await prisma.routine.findFirst({
    where: { id: req.params.routineId, userId },
    include: { exercises: { orderBy: { order: 'asc' }, include: { exercise: true } } },
  });
  if (!routine) return res.status(404).json({ error: 'Rutina no encontrada' });

  const items = await Promise.all(
    routine.exercises.map(async (re) => ({
      exercise: re.exercise,
      ...(await buildProgressData(userId, re.exercise, metric)),
    })),
  );

  res.json({ routine: { id: routine.id, name: routine.name, category: routine.category }, items });
});

// GET /api/progress/:exerciseId?metric=peso|volumen
progressRouter.get('/:exerciseId', async (req, res) => {
  const userId = req.userId!;
  const metric = req.query.metric === 'volumen' ? 'volumen' : 'peso';

  const exercise = await prisma.exercise.findUnique({ where: { id: req.params.exerciseId } });
  if (!exercise) return res.status(404).json({ error: 'Ejercicio no encontrado' });

  const data = await buildProgressData(userId, exercise, metric);
  res.json({ exercise, ...data });
});
