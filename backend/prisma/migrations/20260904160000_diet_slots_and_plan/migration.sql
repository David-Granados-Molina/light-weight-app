-- Lo que pertenece a la comida entera y no a una de sus opciones (la indicación
-- de cabecera y los suplementos), y el planificador semanal.
-- Migración aditiva: una columna nueva y tres tablas nuevas.

ALTER TABLE "Diet" ADD COLUMN "shoppingNotes" TEXT;

CREATE TABLE "DietSlotInfo" (
    "id" TEXT NOT NULL,
    "dietId" TEXT NOT NULL,
    "slot" "MealSlot" NOT NULL,
    "notes" TEXT,

    CONSTRAINT "DietSlotInfo_pkey" PRIMARY KEY ("id")
);

-- Una ficha por comida y dieta.
CREATE UNIQUE INDEX "DietSlotInfo_dietId_slot_key" ON "DietSlotInfo"("dietId", "slot");

CREATE TABLE "DietSupplement" (
    "id" TEXT NOT NULL,
    "slotInfoId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "DietSupplement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DietSupplement_slotInfoId_order_idx" ON "DietSupplement"("slotInfoId", "order");

CREATE TABLE "DietPlanEntry" (
    "id" TEXT NOT NULL,
    "dietId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "slot" "MealSlot" NOT NULL,
    "mealId" TEXT NOT NULL,

    CONSTRAINT "DietPlanEntry_pkey" PRIMARY KEY ("id")
);

-- Una sola opción por celda del calendario.
CREATE UNIQUE INDEX "DietPlanEntry_dietId_day_slot_key" ON "DietPlanEntry"("dietId", "day", "slot");
CREATE INDEX "DietPlanEntry_mealId_idx" ON "DietPlanEntry"("mealId");

ALTER TABLE "DietSlotInfo" ADD CONSTRAINT "DietSlotInfo_dietId_fkey"
    FOREIGN KEY ("dietId") REFERENCES "Diet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DietSupplement" ADD CONSTRAINT "DietSupplement_slotInfoId_fkey"
    FOREIGN KEY ("slotInfoId") REFERENCES "DietSlotInfo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DietPlanEntry" ADD CONSTRAINT "DietPlanEntry_dietId_fkey"
    FOREIGN KEY ("dietId") REFERENCES "Diet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Al borrar una opción, su casilla del calendario se va con ella.
ALTER TABLE "DietPlanEntry" ADD CONSTRAINT "DietPlanEntry_mealId_fkey"
    FOREIGN KEY ("mealId") REFERENCES "DietMeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
