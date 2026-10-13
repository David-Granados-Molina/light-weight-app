-- Imagen por defecto del ejercicio, común a todos, con su autoría. La ficha
-- personal de cada usuario sigue mandando sobre esta. Migración aditiva.
ALTER TABLE "Exercise" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Exercise" ADD COLUMN "imageAuthor" TEXT;
ALTER TABLE "Exercise" ADD COLUMN "imageLicense" TEXT;
