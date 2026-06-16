-- Core exercises that were "reps-only" now support weight (kg + reps),
-- consistent with the gym core exercises (Hiperextensiones, Crunch en polea).
UPDATE "Exercise"
SET "inputType" = 'peso'
WHERE "type" = 'core' AND "inputType" = 'reps';
