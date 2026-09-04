-- Dieta: objetivos del día, comidas con sus opciones, y lista de la compra.
-- Migración aditiva: solo crea tipos y tablas nuevas, no toca nada existente.

CREATE TYPE "MealSlot" AS ENUM ('desayuno', 'comida', 'cena');
CREATE TYPE "DietItemKind" AS ENUM ('alimento', 'suplemento');
CREATE TYPE "ShoppingCategory" AS ENUM (
    'frutas', 'verduras', 'carnes', 'pescados', 'huevos_lacteos',
    'cereales', 'frutos_secos', 'grasas', 'despensa', 'suplementos'
);

CREATE TABLE "Diet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kcal" INTEGER,
    "protein" INTEGER,
    "fat" INTEGER,
    "carbs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Diet_pkey" PRIMARY KEY ("id")
);

-- Una dieta por usuario.
CREATE UNIQUE INDEX "Diet_userId_key" ON "Diet"("userId");

CREATE TABLE "DietMeal" (
    "id" TEXT NOT NULL,
    "dietId" TEXT NOT NULL,
    "slot" "MealSlot" NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "DietMeal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DietMeal_dietId_slot_order_idx" ON "DietMeal"("dietId", "slot", "order");

CREATE TABLE "DietItem" (
    "id" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "kind" "DietItemKind" NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "DietItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DietItem_mealId_order_idx" ON "DietItem"("mealId", "order");

CREATE TABLE "ShoppingItem" (
    "id" TEXT NOT NULL,
    "dietId" TEXT NOT NULL,
    "category" "ShoppingCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" TEXT,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,

    CONSTRAINT "ShoppingItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShoppingItem_dietId_category_order_idx" ON "ShoppingItem"("dietId", "category", "order");

ALTER TABLE "Diet" ADD CONSTRAINT "Diet_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DietMeal" ADD CONSTRAINT "DietMeal_dietId_fkey"
    FOREIGN KEY ("dietId") REFERENCES "Diet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DietItem" ADD CONSTRAINT "DietItem_mealId_fkey"
    FOREIGN KEY ("mealId") REFERENCES "DietMeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShoppingItem" ADD CONSTRAINT "ShoppingItem_dietId_fkey"
    FOREIGN KEY ("dietId") REFERENCES "Diet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
