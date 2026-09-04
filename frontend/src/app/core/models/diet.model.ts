/** Las tres comidas del día, en el orden en que se hacen. */
export type MealSlot = 'desayuno' | 'comida' | 'cena';

/** Secciones de la lista de la compra, en el orden en que se recorre un súper. */
export type ShoppingCategory =
  | 'frutas'
  | 'verduras'
  | 'carnes'
  | 'pescados'
  | 'huevos_lacteos'
  | 'cereales'
  | 'frutos_secos'
  | 'grasas'
  | 'despensa'
  | 'suplementos';

export const MEAL_SLOTS: MealSlot[] = ['desayuno', 'comida', 'cena'];

export const MEAL_SLOT_LABEL: Record<MealSlot, string> = {
  desayuno: 'Desayuno',
  comida: 'Comida',
  cena: 'Cena',
};

/** Lunes a domingo. El índice es el `day` que guarda el servidor. */
export const WEEK_DAYS = [
  { index: 0, short: 'L', label: 'Lunes' },
  { index: 1, short: 'M', label: 'Martes' },
  { index: 2, short: 'X', label: 'Miércoles' },
  { index: 3, short: 'J', label: 'Jueves' },
  { index: 4, short: 'V', label: 'Viernes' },
  { index: 5, short: 'S', label: 'Sábado' },
  { index: 6, short: 'D', label: 'Domingo' },
];

export const SHOPPING_CATEGORIES: ShoppingCategory[] = [
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
];

export const SHOPPING_CATEGORY_LABEL: Record<ShoppingCategory, string> = {
  frutas: 'Frutas',
  verduras: 'Verduras y hortalizas',
  carnes: 'Carnes',
  pescados: 'Pescados y mariscos',
  huevos_lacteos: 'Huevos y lácteos',
  cereales: 'Cereales, pan y pasta',
  frutos_secos: 'Frutos secos y semillas',
  grasas: 'Grasas y aceites',
  despensa: 'Despensa / otros',
  suplementos: 'Suplementos',
};

export interface DietItem {
  id: string;
  name: string;
  quantity: string | null;
}

export interface DietMeal {
  id: string;
  slot: MealSlot;
  name: string;
  notes: string | null;
  items: DietItem[];
}

/** Lo que es de la comida entera y no de una de sus opciones. */
export interface DietSlotInfo {
  id: string;
  slot: MealSlot;
  notes: string | null;
  supplements: DietItem[];
}

export interface ShoppingItem {
  id: string;
  category: ShoppingCategory;
  name: string;
  quantity: string | null;
  checked: boolean;
}

export interface DietPlanEntry {
  id: string;
  /** 0 = lunes … 6 = domingo. */
  day: number;
  slot: MealSlot;
  mealId: string;
}

export interface Diet {
  id: string;
  kcal: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  shoppingNotes: string | null;
  meals: DietMeal[];
  slots: DietSlotInfo[];
  shoppingItems: ShoppingItem[];
  planEntries: DietPlanEntry[];
}

/* Al guardar no se mandan los ids: la dieta se sustituye entera y el servidor
   los vuelve a emitir, igual que hace una rutina con sus ejercicios. */

export interface DietItemInput {
  name: string;
  quantity?: string | null;
}

export interface DietMealInput {
  slot: MealSlot;
  name: string;
  notes?: string | null;
  items: DietItemInput[];
}

export interface DietSlotInput {
  slot: MealSlot;
  notes?: string | null;
  supplements: DietItemInput[];
}

export interface ShoppingItemInput {
  category: ShoppingCategory;
  name: string;
  quantity?: string | null;
  checked: boolean;
}

/**
 * `mealIndex` apunta a una posición del array `meals` de este mismo cuerpo. Las
 * opciones se recrean en cada guardado, así que su id todavía no existe cuando
 * se arma la petición; el índice sí.
 */
export interface DietPlanEntryInput {
  day: number;
  slot: MealSlot;
  mealIndex: number;
}

export interface DietInput {
  kcal?: number | null;
  protein?: number | null;
  fat?: number | null;
  carbs?: number | null;
  shoppingNotes?: string | null;
  meals: DietMealInput[];
  slots: DietSlotInput[];
  shoppingItems: ShoppingItemInput[];
  plan: DietPlanEntryInput[];
}
