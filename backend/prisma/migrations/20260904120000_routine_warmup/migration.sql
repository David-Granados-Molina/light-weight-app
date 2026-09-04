-- Calentamiento de la rutina: una descripción y/o un vídeo, para toda la rutina
-- y no para un ejercicio suelto. Migración aditiva: dos columnas opcionales.
ALTER TABLE "Routine" ADD COLUMN "warmupDescription" TEXT;
ALTER TABLE "Routine" ADD COLUMN "warmupVideoUrl" TEXT;
