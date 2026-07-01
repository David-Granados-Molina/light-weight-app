-- Zancadas (calistenia) now supports weight input (kg + reps).
-- Previously set to 'reps' only, but can be done weighted (dumbbell, vest, etc.)
UPDATE "Exercise"
SET "inputType" = 'peso'
WHERE "name" = 'Zancadas' AND "category" = 'calistenia';
