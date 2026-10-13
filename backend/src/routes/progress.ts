import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { prisma } from '../lib/prisma';
import { ejercicioVisible } from '../lib/exercise-scope';

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
progressRouter.get('/exercises', asyncHandler(async (req, res) => {
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
}));

type ExerciseLike = { id: string; inputType: string };

export async function buildProgressData(userId: string, exercise: ExerciseLike, routineId?: string) {
  const sessionExercises = await prisma.sessionExercise.findMany({
    where: { exerciseId: exercise.id, session: { userId, ...(routineId ? { routineId } : {}) } },
    include: { session: true, sets: true },
    orderBy: { session: { date: 'asc' } },
  });

  const points = sessionExercises.map((se) => ({
    date: se.session.date.toISOString(),
    ...bestValue(se.sets, se.inputTypeOverride ?? exercise.inputType),
  }));

  const pr = points.reduce<BestValue>((acc, p) => (p.value > acc.value ? p : acc), { value: 0, reps: null });
  const actual: BestValue = points.length ? points[points.length - 1] : { value: 0, reps: null };
  const cambio = monthlyChange(points);

  return { points, pr, actual, cambio };
}

// GET /api/progress/routine/:routineId -> progreso de cada ejercicio de la rutina
progressRouter.get('/routine/:routineId', asyncHandler(async (req, res) => {
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
}));

/**
 * Un entreno por fila: lo que se hizo ese día en ese ejercicio. La gráfica
 * resume una cifra por sesión, y esto es lo que hay detrás —series, pesos,
 * repeticiones y tiempo— para poder mirar un día concreto.
 */
async function buildExerciseSessions(userId: string, exerciseId: string) {
  const sessionExercises = await prisma.sessionExercise.findMany({
    where: { exerciseId, session: { userId } },
    include: { session: true, sets: { orderBy: { setNumber: 'asc' } } },
    orderBy: { session: { date: 'desc' } },
  });

  return sessionExercises.map((se) => {
    const sets = se.sets.map((s) => ({ setNumber: s.setNumber, weight: s.weight, reps: s.reps, time: s.time }));
    return {
      sessionId: se.sessionId,
      date: se.session.date.toISOString(),
      inputTypeOverride: se.inputTypeOverride,
      note: se.note,
      sets,
      series: sets.length,
      totalReps: sets.reduce((total, s) => total + (s.reps ?? 0), 0),
      totalTime: sets.reduce((total, s) => total + (s.time ?? 0), 0),
      maxWeight: sets.reduce((max, s) => Math.max(max, s.weight ?? 0), 0),
      // Volumen clásico: la suma de peso por repeticiones de cada serie.
      volume: sets.reduce((total, s) => total + (s.weight ?? 0) * (s.reps ?? 0), 0),
    };
  });
}

// GET /api/progress/:exerciseId
progressRouter.get('/:exerciseId', asyncHandler(async (req, res) => {
  const userId = req.userId!;

  const exercise = await ejercicioVisible(userId, req.params.exerciseId);
  if (!exercise) return res.status(404).json({ error: 'Ejercicio no encontrado' });

  const [data, sessions] = await Promise.all([
    buildProgressData(userId, exercise),
    buildExerciseSessions(userId, exercise.id),
  ]);

  res.json({ exercise, ...data, sessions });
}));
