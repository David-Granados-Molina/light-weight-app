-- Código de un solo uso enviado por email para entrar en la aplicación.
-- Migración aditiva: solo crea tabla e índice. No toca "User".passwordHash ni
-- "PasswordResetToken", que quedan sin uso pero se conservan hasta decidir su
-- limpieza aparte.
CREATE TABLE "LoginCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginCode_pkey" PRIMARY KEY ("id")
);

-- La consulta de verificación siempre es "el último código de este usuario".
CREATE INDEX "LoginCode_userId_createdAt_idx" ON "LoginCode"("userId", "createdAt");

ALTER TABLE "LoginCode" ADD CONSTRAINT "LoginCode_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
