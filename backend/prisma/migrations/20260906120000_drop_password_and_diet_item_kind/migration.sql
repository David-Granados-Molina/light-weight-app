-- Limpieza de la estructura huérfana que quedó de dos cambios anteriores. Es la
-- primera migración DESTRUCTIVA del proyecto: borra columnas y una tabla, y no
-- se puede deshacer con otra migración. Antes de aplicarla conviene tener a mano
-- la copia de seguridad de Neon.
--
-- Nada de lo que se borra aquí se lee ni se escribe desde el código: comprobado
-- con una búsqueda de `passwordHash`, `PasswordResetToken`, `resetTokens`,
-- `googleId` y `DietItemKind` sobre `backend/src` y `frontend/src`.

-- 1. Restos del login por contraseña. Desde el acceso por código no hay registro
--    público, ni contraseña, ni por tanto nada que restablecer: la tabla lleva
--    vacía de propósito desde entonces y la columna nunca se consulta.
DROP TABLE "PasswordResetToken";

ALTER TABLE "User" DROP COLUMN "passwordHash";

-- 2. Resto del login con Google, que tampoco existe ya. Su índice único
--    `User_googleId_key` se va con la columna; no hay que borrarlo aparte.
ALTER TABLE "User" DROP COLUMN "googleId";

-- 3. `DietItem.kind`. Los suplementos se movieron a `DietSlotInfo` cuando quedó
--    claro que se toman con la comida entera y no con una opción concreta, así
--    que desde entonces la columna vale 'alimento' en todas las filas y el
--    servidor la escribe con esa constante. El enum se queda sin usuarios al
--    caer la columna, así que se borra con ella.
ALTER TABLE "DietItem" DROP COLUMN "kind";

DROP TYPE "DietItemKind";
