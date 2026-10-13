-- "Fondos lastrados" estaba clasificado como gym. Es calistenia.
UPDATE "Exercise" SET "category" = 'calistenia' WHERE "name" = 'Fondos lastrados' AND "createdById" IS NULL;
