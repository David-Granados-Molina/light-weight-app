import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler';
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
    // Consejos y vídeo los escribe quien monta la rutina, para quien la va a seguir.
    description: z.string().max(2000).optional().nullable(),
    videoUrl: z.string().url().max(500).optional().nullable().or(z.literal('')),
    // Descanso entre series, en segundos. Hasta 10 minutos.
    restSeconds: z.number().int().min(0).max(600).optional().nullable(),
  })
  .refine((data) => data.targetRepsMax >= data.targetRepsMin, {
    message: 'targetRepsMax debe ser mayor o igual que targetRepsMin',
  });

export const routineSchema = z.object({
  name: z.string().min(2),
  category: z.enum(['gym', 'calistenia']),
  notes: z.string().optional().nullable(),
  // Calentamiento de la rutina entera. Los dos campos son independientes: se
  // puede dejar solo la explicación, solo el vídeo, o ninguno.
  warmupDescription: z.string().max(2000).optional().nullable(),
  warmupVideoUrl: z.string().url().max(500).optional().nullable().or(z.literal('')),
  exercises: z.array(routineExerciseSchema).default([]),
});

export const routineInclude = {
  exercises: {
    orderBy: { order: 'asc' as const },
    include: { exercise: true },
  },
};

const include = routineInclude;

export type RoutineInput = z.infer<typeof routineSchema>;

/**
 * Alta, edición y baja de rutinas, con el dueño como parámetro.
 *
 * Viven aquí y no en cada router porque el admin hace exactamente lo mismo sobre
 * la rutina de otra persona: si esto se duplicara, el día que se añada un campo
 * a la rutina —como pasó con el calentamiento— una de las dos copias se quedaría
 * atrás sin que nada avisara.
 */
export function createRoutineFor(userId: string, data: RoutineInput) {
  const { exercises, ...rest } = data;
  return prisma.routine.create({
    data: {
      ...rest,
      userId,
      exercises: { create: exercises.map((e, i) => ({ ...e, order: i })) },
    },
    include,
  });
}

/** Devuelve `null` si la rutina no existe o no es de ese usuario. */
export async function updateRoutineFor(userId: string, routineId: string, data: RoutineInput) {
  const owned = await prisma.routine.findFirst({ where: { id: routineId, userId }, select: { id: true } });
  if (!owned) return null;

  const { exercises, ...rest } = data;

  // Reemplaza la lista completa de ejercicios de la rutina
  await prisma.routineExercise.deleteMany({ where: { routineId } });

  return prisma.routine.update({
    where: { id: routineId },
    data: {
      ...rest,
      exercises: { create: exercises.map((e, i) => ({ ...e, order: i })) },
    },
    include,
  });
}

export async function copyRoutineTo(routineId: string, targetUserId: string) {
  const [source, target] = await Promise.all([
    prisma.routine.findUnique({ where: { id: routineId }, include }),
    prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } }),
  ]);
  if (!source || !target) return null;

  return createRoutineFor(target.id, {
    name: source.name,
    category: source.category,
    notes: source.notes,
    warmupDescription: source.warmupDescription,
    warmupVideoUrl: source.warmupVideoUrl,
    exercises: source.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      targetSets: e.targetSets,
      targetRepsMin: e.targetRepsMin,
      targetRepsMax: e.targetRepsMax,
      targetWeight: e.targetWeight,
      targetRIR: e.targetRIR,
      note: e.note,
      description: e.description,
      videoUrl: e.videoUrl,
      restSeconds: e.restSeconds,
    })),
  });
}

/** `false` si la rutina no existe o no es de ese usuario. */
export async function deleteRoutineFor(userId: string, routineId: string): Promise<boolean> {
  const owned = await prisma.routine.findFirst({ where: { id: routineId, userId }, select: { id: true } });
  if (!owned) return false;

  await prisma.routine.delete({ where: { id: routineId } });
  return true;
}

routinesRouter.get('/', asyncHandler(async (req, res) => {
  const userId = req.userId!;
  const routines = await prisma.routine.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include,
  });
  res.json(routines);
}));

routinesRouter.get('/:id', asyncHandler(async (req, res) => {
  // Filtra por dueño, no solo por id: sin el `userId` cualquier usuario podía leer
  // la rutina de otro con solo saber su id. El admin llega a las ajenas por
  // /api/admin, que sí comprueba quién es.
  const routine = await prisma.routine.findFirst({ where: { id: req.params.id, userId: req.userId! }, include });
  if (!routine) return res.status(404).json({ error: 'Rutina no encontrada' });
  res.json(routine);
}));

routinesRouter.post('/', asyncHandler(async (req, res) => {
  const parsed = routineSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  res.status(201).json(await createRoutineFor(req.userId!, parsed.data));
}));

routinesRouter.put('/:id', asyncHandler(async (req, res) => {
  const parsed = routineSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  // El 404 solo se da cuando la rutina de verdad no está o no es de quien pide;
  // cualquier otro fallo sube al middleware de error como un 500 legible. Antes
  // un try/catch lo convertía todo en "no encontrada" y escondía la causa.
  const routine = await updateRoutineFor(req.userId!, req.params.id, parsed.data);
  if (!routine) return res.status(404).json({ error: 'Rutina no encontrada' });

  res.json(routine);
}));

routinesRouter.delete('/:id', asyncHandler(async (req, res) => {
  const deleted = await deleteRoutineFor(req.userId!, req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Rutina no encontrada' });

  res.status(204).send();
}));
