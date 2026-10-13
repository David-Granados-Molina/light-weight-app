import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { buscarImagenes, catalogoWger } from '../lib/wger';

export const exerciseImagesRouter = Router();

// GET /api/exercise-images?q=press%20banca
exerciseImagesRouter.get('/', asyncHandler(async (req, res) => {
  res.json(buscarImagenes(await catalogoWger(), String(req.query.q ?? '')));
}));
