-- AlterTable
ALTER TABLE "RoutineExercise" ADD COLUMN     "targetWeight" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "WorkoutSession" ADD COLUMN     "routineId" TEXT;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
