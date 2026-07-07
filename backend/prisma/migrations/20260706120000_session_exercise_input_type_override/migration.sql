-- AlterTable
-- Permite registrar un ejercicio con un modo de medición distinto al de su
-- inputType por defecto (p. ej. "Dominadas" -- normalmente reps -- como EMOM
-- solo en este entreno). Columna nullable y no destructiva: las filas
-- existentes quedan con inputTypeOverride = NULL, que se interpreta como
-- "usar el inputType del ejercicio" (sin cambio de comportamiento).
ALTER TABLE "SessionExercise" ADD COLUMN "inputTypeOverride" "InputType";
