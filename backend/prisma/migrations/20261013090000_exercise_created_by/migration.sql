-- Quién creó cada ejercicio, para que pueda administrarlo. Los del catálogo base
-- se quedan en NULL: esos los lleva quien administra. Migración aditiva.
ALTER TABLE "Exercise" ADD COLUMN "createdById" TEXT;

ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Exercise_createdById_idx" ON "Exercise"("createdById");
