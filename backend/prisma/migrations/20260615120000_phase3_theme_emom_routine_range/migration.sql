-- AlterEnum
ALTER TYPE "InputType" ADD VALUE 'emom';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "themeColor" TEXT;

-- AlterTable: split targetReps into a min/max range, preserving existing values
ALTER TABLE "RoutineExercise" ADD COLUMN     "targetRepsMin" INTEGER;
ALTER TABLE "RoutineExercise" ADD COLUMN     "targetRepsMax" INTEGER;

UPDATE "RoutineExercise" SET "targetRepsMin" = "targetReps", "targetRepsMax" = "targetReps";

ALTER TABLE "RoutineExercise" ALTER COLUMN "targetRepsMin" SET NOT NULL;
ALTER TABLE "RoutineExercise" ALTER COLUMN "targetRepsMax" SET NOT NULL;

ALTER TABLE "RoutineExercise" DROP COLUMN "targetReps";
