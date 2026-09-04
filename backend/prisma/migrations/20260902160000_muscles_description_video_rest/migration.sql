-- Músculos implicados por ejercicio, separados en principales y secundarios.
ALTER TABLE "Exercise" ADD COLUMN "primaryMuscles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Exercise" ADD COLUMN "secondaryMuscles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Rellena los principales a partir de la etiqueta que ya existía ("Pecho/Tríceps"),
-- para no dejar el catálogo en blanco. Los secundarios los completa el seed o el
-- formulario de ejercicio; no se inventan aquí.
UPDATE "Exercise"
SET "primaryMuscles" = string_to_array("muscleGroup", '/')
WHERE "muscleGroup" IS NOT NULL AND "muscleGroup" <> '';

-- Descripción, vídeo y descanso por ejercicio DE RUTINA: quien monta la rutina
-- adapta la explicación y el descanso a quien la va a seguir.
ALTER TABLE "RoutineExercise" ADD COLUMN "description" TEXT;
ALTER TABLE "RoutineExercise" ADD COLUMN "videoUrl" TEXT;
ALTER TABLE "RoutineExercise" ADD COLUMN "restSeconds" INTEGER;
