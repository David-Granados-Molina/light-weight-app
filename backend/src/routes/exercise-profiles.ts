import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler';
import { prisma } from '../lib/prisma';
import { ejercicioVisible } from '../lib/exercise-scope';

export const exerciseProfilesRouter = Router();

/** ~200 kB de data URL: una foto reducida en el navegador cabe de sobra. */
const MAX_IMAGE_CHARS = 280_000;

const profileSchema = z.object({
  imageData: z
    .string()
    .max(MAX_IMAGE_CHARS)
    .regex(/^data:image\/(png|jpeg|webp|gif);base64,/)
    .optional()
    .nullable()
    .or(z.literal('')),
  imageUrl: z.string().url().max(500).optional().nullable().or(z.literal('')),
  imageAuthor: z.string().max(120).optional().nullable(),
  imageLicense: z.string().max(60).optional().nullable(),
  videoUrl: z.string().url().max(500).optional().nullable().or(z.literal('')),
  description: z.string().max(2000).optional().nullable(),
  tips: z.string().max(2000).optional().nullable(),
  equipment: z.string().max(80).optional().nullable(),
  difficulty: z.enum(['iniciacion', 'intermedio', 'avanzado']).optional().nullable(),
});

const vacioANull = <T>(valor: T | '' | undefined | null): T | null => (valor === '' || valor === undefined ? null : valor);

// GET /api/exercise-profiles -> la ficha propia de cada ejercicio que tenga una
exerciseProfilesRouter.get('/', asyncHandler(async (req, res) => {
  const profiles = await prisma.exerciseProfile.findMany({ where: { userId: req.userId! } });
  res.json(profiles);
}));

// PUT /api/exercise-profiles/:exerciseId -> crea o actualiza la ficha propia
exerciseProfilesRouter.put('/:exerciseId', asyncHandler(async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const exercise = await ejercicioVisible(req.userId!, req.params.exerciseId);
  if (!exercise) return res.status(404).json({ error: 'Ejercicio no encontrado' });

  const datos = {
    imageData: vacioANull(parsed.data.imageData),
    imageUrl: vacioANull(parsed.data.imageUrl),
    imageAuthor: vacioANull(parsed.data.imageAuthor),
    imageLicense: vacioANull(parsed.data.imageLicense),
    videoUrl: vacioANull(parsed.data.videoUrl),
    description: vacioANull(parsed.data.description),
    tips: vacioANull(parsed.data.tips),
    equipment: vacioANull(parsed.data.equipment),
    difficulty: vacioANull(parsed.data.difficulty),
  };

  const profile = await prisma.exerciseProfile.upsert({
    where: { userId_exerciseId: { userId: req.userId!, exerciseId: exercise.id } },
    create: { userId: req.userId!, exerciseId: exercise.id, ...datos },
    update: datos,
  });

  res.json(profile);
}));

// DELETE /api/exercise-profiles/:exerciseId -> deja el ejercicio sin ficha propia
exerciseProfilesRouter.delete('/:exerciseId', asyncHandler(async (req, res) => {
  const { count } = await prisma.exerciseProfile.deleteMany({
    where: { userId: req.userId!, exerciseId: req.params.exerciseId },
  });
  if (!count) return res.status(404).json({ error: 'Ese ejercicio no tiene ficha tuya' });

  res.status(204).send();
}));
