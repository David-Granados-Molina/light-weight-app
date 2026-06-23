import { Router } from 'express';
import { prisma } from '../lib/prisma';

export const progressRouter = Router();

type SetLike = { weight: number | null; reps: number | null; time: number | null };
type BestValue = { value: number; reps: number | null };

/** Para ejercicios con peso, el "mejor" set es el de mayor peso, junto con las repeticiones hechas con ese peso. */
function bestValue(sets: SetLike[], inputType: string): BestValue {
  if (inputType === 'peso') {
    let best: BestValue = { value: 0, reps: null };
    for (const s of sets) {
      const weight = s.weight ?? 0;
      if (weight > best.value) best = { value: weight, reps: s.reps ?? null };
    }
    return best;
  }
  if (inputType === 'tiempo' || inputType === 'min') return { value: Math.max(0, ...sets.map((s) => s.time ?? 0)), reps: null };
  return { value: Math.max(0, ...sets.map((s) => s.reps ?? 0)), reps: null };
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

export async function buildProgressData(userId: string, exercise: ExerciseLike, routineId?: string) {
  const sessionExercises = await prisma.sessionExercise.findMany({
    where: { exerciseId: exercise.id, session: { userId, ...(routineId ? { routineId } : {}) } },
    include: { session: true, sets: true },
    orderBy: { session: { date: 'asc' } },
  });

  const points = sessionExercises.map((se) => ({
    date: se.session.date.toISOString(),
    ...bestValue(se.sets, exercise.inputType),
  }));

  const pr = points.reduce<BestValue>((acc, p) => (p.value > acc.value ? p : acc), { value: 0, reps: null });
  const actual: BestValue = points.length ? points[points.length - 1] : { value: 0, reps: null };
  const cambio = monthlyChange(points);

  return { points, pr, actual, cambio };
}

// GET /api/progress/routine/:routineId -> progreso de cada ejercicio de la rutina
progressRouter.get('/routine/:routineId', async (req, res) => {
  const userId = req.userId!;

  const routine = await prisma.routine.findFirst({
    where: { id: req.params.routineId, userId },
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

// GET /api/progress/:exerciseId
progressRouter.get('/:exerciseId', async (req, res) => {
  const userId = req.userId!;

  const exercise = await prisma.exercise.findUnique({ where: { id: req.params.exerciseId } });
  if (!exercise) return res.status(404).json({ error: 'Ejercicio no encontrado' });

  const data = await buildProgressData(userId, exercise);
  res.json({ exercise, ...data });
});
