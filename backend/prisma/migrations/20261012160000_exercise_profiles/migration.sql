-- Ficha personal de cada usuario sobre un ejercicio del catálogo compartido.
-- Migración aditiva: crea un enum y una tabla, no toca nada existente.
CREATE TYPE "Difficulty" AS ENUM ('iniciacion', 'intermedio', 'avanzado');

CREATE TABLE "ExerciseProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "imageData" TEXT,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "description" TEXT,
    "tips" TEXT,
    "equipment" TEXT,
    "difficulty" "Difficulty",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExerciseProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExerciseProfile_userId_exerciseId_key" ON "ExerciseProfile"("userId", "exerciseId");

ALTER TABLE "ExerciseProfile" ADD CONSTRAINT "ExerciseProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExerciseProfile" ADD CONSTRAINT "ExerciseProfile_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
