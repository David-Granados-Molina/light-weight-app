import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler';
import { prisma } from '../lib/prisma';

export const dietRouter = Router();

const MEAL_SLOTS = ['desayuno', 'comida', 'cena'] as const;

const SHOPPING_CATEGORIES = [
  'frutas',
  'verduras',
  'carnes',
  'pescados',
  'huevos_lacteos',
  'cereales',
  'frutos_secos',
  'grasas',
  'despensa',
  'suplementos',
] as const;

const itemSchema = z.object({
  name: z.string().min(1).max(160),
  quantity: z.string().max(80).optional().nullable(),
});

const mealSchema = z.object({
  slot: z.enum(MEAL_SLOTS),
  name: z.string().min(1).max(80),
  notes: z.string().max(2000).optional().nullable(),
  items: z.array(itemSchema).max(60).default([]),
});

/** Lo que es de la comida entera: su indicación de cabecera y sus suplementos. */
const slotSchema = z.object({
  slot: z.enum(MEAL_SLOTS),
  notes: z.string().max(2000).optional().nullable(),
  supplements: z.array(itemSchema).max(30).default([]),
});

const shoppingItemSchema = z.object({
  category: z.enum(SHOPPING_CATEGORIES),
  name: z.string().min(1).max(160),
  quantity: z.string().max(80).optional().nullable(),
  checked: z.boolean().default(false),
});

/**
 * Una casilla del calendario semanal.
 *
 * `mealIndex` apunta a una posición del array `meals` de esta misma petición, no
 * a un id. Como la dieta se guarda sustituyéndola entera, las opciones se crean
 * de nuevo en cada guardado y sus ids todavía no existen cuando el cliente arma
 * el cuerpo; el índice sí es estable dentro de la petición.
 */
const planEntrySchema = z.object({
  day: z.number().int().min(0).max(6),
  slot: z.enum(MEAL_SLOTS),
  mealIndex: z.number().int().min(0),
});

/**
 * La dieta se guarda entera de una vez, igual que una rutina: llega el estado
 * completo de la pantalla y sustituye al anterior. Con estas cantidades —tres
 * comidas y una lista de la compra— no compensa la complejidad de sincronizar
 * altas, bajas y reordenaciones una a una.
 */
const dietSchema = z.object({
  kcal: z.number().int().min(0).max(20000).optional().nullable(),
  protein: z.number().int().min(0).max(2000).optional().nullable(),
  fat: z.number().int().min(0).max(2000).optional().nullable(),
  carbs: z.number().int().min(0).max(2000).optional().nullable(),
  shoppingNotes: z.string().max(2000).optional().nullable(),
  meals: z.array(mealSchema).max(60).default([]),
  slots: z.array(slotSchema).max(3).default([]),
  shoppingItems: z.array(shoppingItemSchema).max(300).default([]),
  plan: z.array(planEntrySchema).max(21).default([]),
});

const include = {
  meals: {
    orderBy: [{ slot: 'asc' as const }, { order: 'asc' as const }],
    include: { items: { orderBy: { order: 'asc' as const } } },
  },
  slots: {
    orderBy: { slot: 'asc' as const },
    include: { supplements: { orderBy: { order: 'asc' as const } } },
  },
  shoppingItems: { orderBy: [{ category: 'asc' as const }, { order: 'asc' as const }] },
  planEntries: { orderBy: [{ day: 'asc' as const }, { slot: 'asc' as const }] },
};

// GET /api/diet -> la dieta del usuario, creándola vacía la primera vez para que
// la pantalla no tenga que distinguir entre "no hay" y "está vacía".
dietRouter.get('/', asyncHandler(async (req, res) => {
  const userId = req.userId!;

  const existing = await prisma.diet.findUnique({ where: { userId }, include });
  if (existing) return res.json(existing);

  res.json(await prisma.diet.create({ data: { userId }, include }));
}));

// PUT /api/diet -> sustituye la dieta entera.
dietRouter.put('/', asyncHandler(async (req, res) => {
  const parsed = dietSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const userId = req.userId!;
  const { meals, slots, shoppingItems, plan, ...targets } = parsed.data;

  const diet = await prisma.diet.upsert({
    where: { userId },
    create: { userId, ...targets },
    update: targets,
    select: { id: true },
  });

  // El borrado en cascada se lleva por delante los hijos de cada uno: los
  // DietItem de las comidas, los DietSupplement de las fichas, y las casillas
  // del calendario que apuntaban a las opciones borradas.
  await prisma.dietMeal.deleteMany({ where: { dietId: diet.id } });
  await prisma.dietSlotInfo.deleteMany({ where: { dietId: diet.id } });
  await prisma.shoppingItem.deleteMany({ where: { dietId: diet.id } });

  // El `order` se recalcula por comida, no sobre la lista entera: es la posición
  // de la opción dentro de su desayuno/comida/cena. Los ids recién creados se
  // guardan en el mismo orden que llegaron, para resolver el calendario después.
  const orderBySlot = new Map<string, number>();
  const createdMealIds: string[] = [];

  for (const meal of meals) {
    const order = orderBySlot.get(meal.slot) ?? 0;
    orderBySlot.set(meal.slot, order + 1);

    const created = await prisma.dietMeal.create({
      data: {
        dietId: diet.id,
        slot: meal.slot,
        name: meal.name,
        notes: meal.notes || null,
        order,
        items: {
          create: meal.items.map((item, i) => ({
            // `kind` es vestigial (ver el enum en schema.prisma): desde que los
            // suplementos son de la comida y no de la opción, aquí solo hay comida.
            kind: 'alimento' as const,
            name: item.name,
            quantity: item.quantity || null,
            order: i,
          })),
        },
      },
      select: { id: true },
    });
    createdMealIds.push(created.id);
  }

  for (const slot of slots) {
    await prisma.dietSlotInfo.create({
      data: {
        dietId: diet.id,
        slot: slot.slot,
        notes: slot.notes || null,
        supplements: {
          create: slot.supplements.map((s, i) => ({
            name: s.name,
            quantity: s.quantity || null,
            order: i,
          })),
        },
      },
    });
  }

  const orderByCategory = new Map<string, number>();
  await prisma.shoppingItem.createMany({
    data: shoppingItems.map((item) => {
      const order = orderByCategory.get(item.category) ?? 0;
      orderByCategory.set(item.category, order + 1);
      return {
        dietId: diet.id,
        category: item.category,
        name: item.name,
        quantity: item.quantity || null,
        checked: item.checked,
        order,
      };
    }),
  });

  // Las casillas que apunten a una opción que ya no existe se descartan: es lo
  // mismo que habría hecho el borrado en cascada.
  await prisma.dietPlanEntry.createMany({
    data: plan
      .filter((entry) => createdMealIds[entry.mealIndex])
      .map((entry) => ({
        dietId: diet.id,
        day: entry.day,
        slot: entry.slot,
        mealId: createdMealIds[entry.mealIndex],
      })),
  });

  res.json(await prisma.diet.findUnique({ where: { id: diet.id }, include }));
}));
