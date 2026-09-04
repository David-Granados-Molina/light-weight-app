/**
 * Carga la dieta de David tal y como estaba en su hoja original.
 *
 * Es un script de un solo uso, idempotente: sustituye por completo la dieta del
 * usuario, así que se puede volver a lanzar sin duplicar nada. Se ejecuta con
 *
 *     npx tsx prisma/seed-diet-david.ts
 *
 * Los pesos de los alimentos van tal cual venían («en seco», «peso en crudo»),
 * porque quitar esa coletilla cambiaría la cantidad real.
 */
import { MealSlot, PrismaClient, ShoppingCategory } from '@prisma/client';

const prisma = new PrismaClient();

/** Por defecto David; se puede pasar otro email como argumento para probar. */
const EMAIL = process.argv[2] ?? 'davidgranadosmolina@gmail.com';

type Item = [name: string, quantity?: string];

interface MealSeed {
  name: string;
  notes?: string;
  items: Item[];
}

const TARGETS = { kcal: 2505, protein: 129, carbs: 237, fat: 108 };

const SLOT_INFO: Record<MealSlot, { notes: string; supplements: Item[] }> = {
  desayuno: {
    notes: 'Elige una opción cada día — las tres cubren la proteína; si tienes más hambre, añade fruta.',
    supplements: [
      ['Omega 3', '1 cápsula'],
      ['Creatina monohidrato', '5 g, todos los días incluidos los de descanso'],
    ],
  },
  comida: {
    notes:
      'Comida previa al entreno (19h): poca verdura y grasa para digerir ligero. Si comes justo antes de entrenar, elige la opción 6 (absorción rápida).',
    supplements: [
      ['Omega 3', '1 cápsula'],
      ['Vitamina C', '1 comprimido'],
      ['Vitamina B12'],
    ],
  },
  cena: {
    notes:
      'Es la comida de después de entrenar — prioriza la opción con más hidrato (boniato, patata o arroz).',
    supplements: [
      ['Omega 3', '1 cápsula'],
      ['Magnesio', '1 cápsula, mejor por la noche (ayuda al descanso)'],
      ['Ashwagandha'],
    ],
  },
};

const MEALS: Record<MealSlot, MealSeed[]> = {
  desayuno: [
    {
      name: 'Opción 1',
      items: [
        ['Pan integral en tostadas', '160 g (4 rebanadas)'],
        ['Huevos revueltos', '3 uds'],
        ['Tomate natural rallado + AOVE', '1 cucharada'],
        ['Café solo', '1 taza'],
      ],
    },
    {
      name: 'Opción 2',
      items: [
        ['Copos de maíz sin azúcar (Mercadona)', '100 g'],
        ['Leche semidesnatada', '300 ml'],
        ['Proteína en polvo', '1 cazo (30 g)'],
        ['Plátano', '1 ud'],
        ['Crema de cacahuete', '25 g'],
      ],
    },
    {
      name: 'Opción 3',
      notes: 'Dejar la avena en remojo la noche anterior.',
      items: [
        ['Yogur griego natural', '250 g'],
        ['Avena en copos (a remojo en leche)', '80 g'],
        ['Leche semidesnatada (para el remojo)', '150 ml'],
        ['Nueces', '20 g'],
        ['Plátano o arándanos + miel', 'al gusto'],
      ],
    },
  ],
  comida: [
    {
      name: 'Opción 1',
      notes: 'Tu lasaña habitual, ración generosa. Una vez cada 15 días.',
      items: [['Lasaña casera (carne picada, bechamel, mozzarella, tomate)', 'ración ~430 g']],
    },
    {
      name: 'Opción 2',
      notes: 'Cottage sube la proteína; guacamole sube la grasa buena.',
      items: [
        ['Carne picada de ternera magra (cocinada)', '200 g'],
        ['Patata cocida o asada', '400 g'],
        ['Guacamole o queso cottage (a elegir)', '100 g / 150 g'],
        ['Fruta', '1 pieza'],
      ],
    },
    {
      name: 'Opción 3',
      notes: 'Corte magro (redondo o tapa de ternera, o pavo); digiere ligero. Plátano = hidrato extra pre-entreno.',
      items: [
        ['Filete de ternera muy magro o pechuga de pavo a la plancha', '220 g'],
        ['Arroz blanco (en seco)', '140 g'],
        ['Plátano', '1 ud'],
      ],
    },
    {
      name: 'Opción 4',
      notes: 'La pechuga es para subir la proteína del plato.',
      items: [
        ['Tortilla de patata casera', '~250 g (1/3 de una grande)'],
        ['Pechuga de pollo o pavo a la plancha', '150 g'],
        ['Arroz blanco (en seco)', '70 g'],
      ],
    },
    {
      name: 'Opción 5',
      items: [
        ['Arroz blanco (en seco)', '120 g'],
        ['Lubina o dorada a la plancha', '220 g'],
        ['Queso cottage', '100 g'],
        ['AOVE para cocinar', '1 cucharada'],
      ],
    },
    {
      name: 'Opción 6',
      notes: 'Opción de absorción rápida: arroz como carburante, proteína magra ligera, energía rápida pre-entreno.',
      items: [
        ['Arroz blanco (en seco)', '145 g'],
        ['Pechuga de pollo o pavo a la plancha', '180 g'],
        ['Plátano + miel', '1 ud + 1 cdta'],
      ],
    },
  ],
  cena: [
    {
      name: 'Opción 1',
      items: [
        ['Salmón a la plancha', '200 g'],
        ['Boniato o patata al horno', '450 g'],
        ['Verduras salteadas con AOVE', 'ración + 1 cda'],
      ],
    },
    {
      name: 'Opción 2',
      items: [
        ['Tortilla francesa', '5 huevos'],
        ['Pan integral', '100 g'],
        ['Queso curado o semi', '40 g'],
        ['Ensalada con AOVE', 'plato + 1 cda'],
      ],
    },
    {
      name: 'Opción 3',
      items: [
        ['Chuletas de cerdo de palo o pechuga de pollo', '200 g'],
        ['Patata cocida (peso en crudo)', '300 g'],
        ['Verdura con AOVE', 'ración + 1 cda'],
        ['Pan integral', '70 g'],
      ],
    },
    {
      name: 'Opción 4',
      items: [
        ['Merluza o pescado blanco a la plancha', '220 g'],
        ['Arroz basmati (en seco)', '120 g'],
        ['Verduras con AOVE', 'ración + 1 cda'],
      ],
    },
    {
      name: 'Opción 5',
      items: [
        ['Boniato al horno (peso en crudo)', '450 g'],
        ['Brócoli al vapor', '200 g'],
        ['Contramuslo de pollo a la plancha, sin piel', '250 g'],
        ['AOVE', '1 cucharada'],
      ],
    },
    {
      name: 'Opción 6',
      notes: 'Pela los pimientos después de asarlos: digieren mucho mejor.',
      items: [
        ['Patata cocida o al horno (peso en crudo)', '450 g'],
        ['Sardinas a la plancha o al natural', '200 g'],
        ['Pimientos asados', '150 g'],
        ['AOVE', '1 cucharada'],
      ],
    },
  ],
};

const SHOPPING_NOTES =
  'Alimentos base de todas las opciones, agrupados por tipo y sin repetidos — úsala como guía flexible, sin pesos.';

const SHOPPING: Record<ShoppingCategory, string[]> = {
  frutas: ['Plátano', 'Arándanos', 'Fruta de temporada'],
  verduras: [
    'Tomate natural',
    'Boniato',
    'Patata',
    'Brócoli',
    'Pimientos',
    'Verduras para saltear/acompañar',
    'Ensalada (lechuga y variantes)',
  ],
  carnes: [
    'Carne picada de ternera magra',
    'Filete de ternera magro',
    'Pechuga de pollo',
    'Pechuga de pavo',
    'Contramuslo de pollo sin piel',
    'Chuletas de cerdo de palo',
  ],
  pescados: ['Salmón', 'Lubina o dorada', 'Merluza / pescado blanco', 'Sardinas'],
  huevos_lacteos: [
    'Huevos',
    'Leche semidesnatada',
    'Yogur griego natural',
    'Queso cottage',
    'Queso curado o semicurado',
    'Mozzarella',
    'Bechamel',
  ],
  cereales: [
    'Pan integral',
    'Copos de maíz sin azúcar',
    'Avena en copos',
    'Arroz blanco',
    'Arroz basmati',
    'Láminas de lasaña',
  ],
  frutos_secos: ['Nueces', 'Crema de cacahuete'],
  grasas: ['AOVE (aceite de oliva virgen extra)'],
  despensa: ['Miel', 'Café solo', 'Guacamole (o aguacate)', 'Proteína en polvo'],
  suplementos: ['Omega 3', 'Creatina monohidrato', 'Vitamina C', 'Vitamina B12', 'Magnesio', 'Ashwagandha'],
};

/**
 * La semana tal y como la tenías apuntada. Los números son la opción; `null` es
 * una casilla en blanco. Índices de día: 0 = lunes … 6 = domingo.
 */
const PLAN: Record<MealSlot, (number | null)[]> = {
  desayuno: [null, null, 1, 3, null, null, null],
  comida: [null, null, 2, 4, 2, 6, null],
  cena: [null, null, 2, 3, 5, 1, null],
};

const SLOTS: MealSlot[] = ['desayuno', 'comida', 'cena'];

async function main() {
  const user = await prisma.user.findUnique({ where: { email: EMAIL }, select: { id: true, name: true } });
  if (!user) throw new Error(`No existe ningún usuario con el email ${EMAIL}`);

  const diet = await prisma.diet.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...TARGETS, shoppingNotes: SHOPPING_NOTES },
    update: { ...TARGETS, shoppingNotes: SHOPPING_NOTES },
    select: { id: true },
  });

  // Sustituye por completo: así relanzar el script no duplica nada.
  await prisma.dietMeal.deleteMany({ where: { dietId: diet.id } });
  await prisma.dietSlotInfo.deleteMany({ where: { dietId: diet.id } });
  await prisma.shoppingItem.deleteMany({ where: { dietId: diet.id } });

  // Los ids de las opciones se guardan para poder montar el calendario después.
  const mealIds: Record<MealSlot, string[]> = { desayuno: [], comida: [], cena: [] };

  for (const slot of SLOTS) {
    for (const [order, meal] of MEALS[slot].entries()) {
      const created = await prisma.dietMeal.create({
        data: {
          dietId: diet.id,
          slot,
          name: meal.name,
          notes: meal.notes ?? null,
          order,
          items: {
            create: meal.items.map(([name, quantity], i) => ({
              kind: 'alimento' as const,
              name,
              quantity: quantity ?? null,
              order: i,
            })),
          },
        },
        select: { id: true },
      });
      mealIds[slot].push(created.id);
    }

    await prisma.dietSlotInfo.create({
      data: {
        dietId: diet.id,
        slot,
        notes: SLOT_INFO[slot].notes,
        supplements: {
          create: SLOT_INFO[slot].supplements.map(([name, quantity], i) => ({
            name,
            quantity: quantity ?? null,
            order: i,
          })),
        },
      },
    });
  }

  for (const [category, names] of Object.entries(SHOPPING) as [ShoppingCategory, string[]][]) {
    await prisma.shoppingItem.createMany({
      data: names.map((name, order) => ({ dietId: diet.id, category, name, order })),
    });
  }

  const planRows = SLOTS.flatMap((slot) =>
    PLAN[slot].flatMap((option, day) => {
      if (option === null) return [];
      const mealId = mealIds[slot][option - 1];
      return mealId ? [{ dietId: diet.id, day, slot, mealId }] : [];
    }),
  );
  await prisma.dietPlanEntry.createMany({ data: planRows });

  const counts = SLOTS.map((slot) => `${slot} ${MEALS[slot].length}`).join(', ');
  const shoppingCount = Object.values(SHOPPING).reduce((total, names) => total + names.length, 0);
  console.log(
    `Dieta cargada para ${user.name}: opciones (${counts}); ` +
      `${shoppingCount} artículos en la compra; ${planRows.length} casillas de la semana.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
