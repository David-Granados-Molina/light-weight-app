-- Cada usuario ve el catálogo base (createdById NULL) más los ejercicios que ha
-- creado. Por eso el nombre deja de ser único en toda la tabla: dos personas
-- pueden tener un ejercicio con el mismo nombre sin pisarse.
DROP INDEX "Exercise_name_key";

-- Único por autor. Las filas con createdById NULL no chocan entre sí en este
-- índice, así que el catálogo base lleva el suyo aparte.
CREATE UNIQUE INDEX "Exercise_createdById_name_key" ON "Exercise"("createdById", "name");

CREATE UNIQUE INDEX "Exercise_name_base_key" ON "Exercise"("name") WHERE "createdById" IS NULL;
