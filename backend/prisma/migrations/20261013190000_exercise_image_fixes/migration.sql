-- Cinco imágenes que no eran de ese ejercicio: un gripper de mano en «Agarrar
-- peso estático», una sentadilla al cajón en «Salto al cajón»... Se quedan sin
-- imagen hasta que haya una que corresponda.
UPDATE "Exercise"
SET "imageUrl" = NULL, "imageAuthor" = NULL, "imageLicense" = NULL
WHERE "createdById" IS NULL
  AND "name" IN ('Agarrar peso estático', 'Dead hang', 'Salto al cajón', 'Sentadilla sumo', 'Superman');
