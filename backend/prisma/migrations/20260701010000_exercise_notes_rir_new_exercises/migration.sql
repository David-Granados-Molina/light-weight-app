-- Add note and RIR target to routine exercises
ALTER TABLE "RoutineExercise" ADD COLUMN "note" TEXT;
ALTER TABLE "RoutineExercise" ADD COLUMN "targetRIR" INTEGER;

-- Add note to session exercises (copied from routine at save time)
ALTER TABLE "SessionExercise" ADD COLUMN "note" TEXT;

-- Add new catalogue exercises
INSERT INTO "Exercise" ("id", "name", "category", "type", "inputType", "muscleGroup", "createdAt")
VALUES
  (gen_random_uuid(), 'Curl de isquios', 'calistenia', 'pierna', 'reps', 'Femoral', NOW()),
  (gen_random_uuid(), 'Reverse crunch',  'calistenia', 'core',   'reps', 'Core',    NOW())
ON CONFLICT ("name") DO NOTHING;
