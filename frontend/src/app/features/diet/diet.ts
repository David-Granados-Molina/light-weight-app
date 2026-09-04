import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DietService } from '../../core/services/diet.service';
import {
  Diet,
  DietInput,
  MEAL_SLOT_LABEL,
  MEAL_SLOTS,
  MealSlot,
  SHOPPING_CATEGORIES,
  SHOPPING_CATEGORY_LABEL,
  ShoppingCategory,
  WEEK_DAYS,
} from '../../core/models/diet.model';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';

/**
 * Fila editable de la pantalla. Lleva una `key` propia porque el `id` del
 * servidor no existe hasta el primer guardado, y `@for` necesita algo estable
 * con lo que seguir la fila mientras se escribe dentro de ella.
 */
interface ItemRow {
  key: string;
  name: string;
  quantity: string;
}

interface MealRow {
  key: string;
  slot: MealSlot;
  name: string;
  notes: string;
  items: ItemRow[];
}

interface SlotRow {
  slot: MealSlot;
  notes: string;
  supplements: ItemRow[];
}

interface ShoppingRow {
  key: string;
  category: ShoppingCategory;
  name: string;
  quantity: string;
  checked: boolean;
}

/** Casilla del calendario que se está eligiendo. */
interface PlanPick {
  day: number;
  dayLabel: string;
  slot: MealSlot;
  slotLabel: string;
}

let nextKey = 0;
const newKey = () => `row-${++nextKey}`;

@Component({
  selector: 'app-diet',
  imports: [RouterLink, ConfirmDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './diet.html',
  styleUrl: './diet.css',
})
export class DietScreen {
  private readonly dietService = inject(DietService);

  readonly weekDays = WEEK_DAYS;
  readonly mealSlots = MEAL_SLOTS;
  readonly mealSlotLabel = MEAL_SLOT_LABEL;
  readonly shoppingCategories = SHOPPING_CATEGORIES;
  readonly shoppingCategoryLabel = SHOPPING_CATEGORY_LABEL;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly error = signal<string | null>(null);

  /* Objetivos del día. Se guardan como texto porque un campo vacío no es un 0. */
  readonly kcal = signal('');
  readonly protein = signal('');
  readonly fat = signal('');
  readonly carbs = signal('');

  readonly shoppingNotes = signal('');

  readonly meals = signal<MealRow[]>([]);
  readonly slotInfo = signal<SlotRow[]>(MEAL_SLOTS.map((slot) => ({ slot, notes: '', supplements: [] })));
  readonly shopping = signal<ShoppingRow[]>([]);

  /** `mealKey` de la opción elegida para cada casilla, indexado por "día:comida". */
  readonly plan = signal<Record<string, string>>({});

  /** Opción de comida pendiente de que se confirme su borrado. */
  readonly mealToRemove = signal<MealRow | null>(null);

  /** Casilla del calendario abierta para elegir opción. */
  readonly planPick = signal<PlanPick | null>(null);

  /** Las opciones ya repartidas por comida, con su ficha, para que la plantilla no filtre. */
  readonly mealsBySlot = computed(() => {
    const bySlot = new Map<MealSlot, MealRow[]>(MEAL_SLOTS.map((slot) => [slot, [] as MealRow[]]));
    for (const meal of this.meals()) bySlot.get(meal.slot)?.push(meal);
    const info = this.slotInfo();
    return MEAL_SLOTS.map((slot) => ({
      slot,
      label: MEAL_SLOT_LABEL[slot],
      // En minúscula para las frases ("Añadir opción de desayuno"); se calcula
      // aquí y no con un pipe para no cargar CommonModule por una palabra.
      lowerLabel: MEAL_SLOT_LABEL[slot].toLowerCase(),
      options: bySlot.get(slot) ?? [],
      info: info.find((i) => i.slot === slot)!,
    }));
  });

  /**
   * El calendario tal y como se pinta: una fila por día, tres celdas por fila.
   *
   * Cada celda lleva el nombre de la opción y un resumen de sus alimentos, que es
   * justo lo que faltaba en la tabla de números: saber qué toca sin ir a mirarlo
   * a otro sitio.
   */
  readonly planGrid = computed(() => {
    const byKey = new Map(this.meals().map((m) => [m.key, m]));
    const plan = this.plan();

    return WEEK_DAYS.map((day) => ({
      ...day,
      cells: MEAL_SLOTS.map((slot) => {
        const meal = byKey.get(plan[`${day.index}:${slot}`] ?? '');
        return {
          slot,
          slotLabel: MEAL_SLOT_LABEL[slot],
          meal: meal ?? null,
          summary: meal ? meal.items.map((i) => i.name).filter(Boolean).join(' · ') : '',
        };
      }),
    }));
  });

  readonly hasPlan = computed(() => Object.keys(this.plan()).length > 0);

  /** Las opciones disponibles para la casilla abierta, con su resumen. */
  readonly pickOptions = computed(() => {
    const pick = this.planPick();
    if (!pick) return [];
    return this.meals()
      .filter((m) => m.slot === pick.slot)
      .map((m) => ({
        key: m.key,
        name: m.name,
        items: m.items.filter((i) => i.name.trim()),
        selected: this.plan()[`${pick.day}:${pick.slot}`] === m.key,
      }));
  });

  /** Solo las categorías con algo dentro: diez cabeceras vacías no son una lista. */
  readonly shoppingBySection = computed(() => {
    const rows = this.shopping();
    return SHOPPING_CATEGORIES.map((category) => ({
      category,
      label: SHOPPING_CATEGORY_LABEL[category],
      items: rows.filter((item) => item.category === category),
    })).filter((section) => section.items.length > 0);
  });

  readonly pendingCount = computed(() => this.shopping().filter((item) => !item.checked).length);
  readonly checkedCount = computed(() => this.shopping().filter((item) => item.checked).length);

  constructor() {
    this.dietService.get().subscribe({
      next: (diet) => {
        this.apply(diet);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se ha podido cargar la dieta.');
        this.loading.set(false);
      },
    });
  }

  /* --- Objetivos ---------------------------------------------------------- */

  onTargetInput(field: 'kcal' | 'protein' | 'fat' | 'carbs', event: Event): void {
    // Solo dígitos: un `type="number"` deja escribir "e", "+" y "-".
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '');
    input.value = value;
    this[field].set(value);
  }

  onShoppingNotes(event: Event): void {
    this.shoppingNotes.set((event.target as HTMLTextAreaElement).value);
  }

  /* --- Ficha de la comida (indicación y suplementos) ----------------------- */

  setSlotNotes(slot: MealSlot, event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.slotInfo.update((list) => list.map((s) => (s.slot === slot ? { ...s, notes: value } : s)));
  }

  addSupplement(slot: MealSlot): void {
    this.slotInfo.update((list) =>
      list.map((s) =>
        s.slot === slot ? { ...s, supplements: [...s.supplements, { key: newKey(), name: '', quantity: '' }] } : s,
      ),
    );
  }

  removeSupplement(slot: MealSlot, itemKey: string): void {
    this.slotInfo.update((list) =>
      list.map((s) => (s.slot === slot ? { ...s, supplements: s.supplements.filter((i) => i.key !== itemKey) } : s)),
    );
  }

  setSupplementField(slot: MealSlot, itemKey: string, field: 'name' | 'quantity', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.slotInfo.update((list) =>
      list.map((s) =>
        s.slot === slot
          ? { ...s, supplements: s.supplements.map((i) => (i.key === itemKey ? { ...i, [field]: value } : i)) }
          : s,
      ),
    );
  }

  /* --- Opciones de comida -------------------------------------------------- */

  addMeal(slot: MealSlot): void {
    const count = this.meals().filter((m) => m.slot === slot).length;
    this.meals.update((list) => [
      ...list,
      { key: newKey(), slot, name: `Opción ${count + 1}`, notes: '', items: [] },
    ]);
  }

  askRemoveMeal(meal: MealRow): void {
    this.mealToRemove.set(meal);
  }

  cancelRemoveMeal(): void {
    this.mealToRemove.set(null);
  }

  confirmRemoveMeal(): void {
    const target = this.mealToRemove();
    if (!target) return;
    this.mealToRemove.set(null);
    this.meals.update((list) => list.filter((m) => m.key !== target.key));

    // Las casillas del calendario que la tenían puesta se vacían: dejarlas
    // señalando a una opción que ya no existe sería peor que dejarlas en blanco.
    this.plan.update((current) =>
      Object.fromEntries(Object.entries(current).filter(([, mealKey]) => mealKey !== target.key)),
    );
  }

  setMealName(mealKey: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.meals.update((list) => list.map((m) => (m.key === mealKey ? { ...m, name: value } : m)));
  }

  setMealNotes(mealKey: string, event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.meals.update((list) => list.map((m) => (m.key === mealKey ? { ...m, notes: value } : m)));
  }

  addItem(mealKey: string): void {
    this.meals.update((list) =>
      list.map((m) =>
        m.key === mealKey ? { ...m, items: [...m.items, { key: newKey(), name: '', quantity: '' }] } : m,
      ),
    );
  }

  removeItem(mealKey: string, itemKey: string): void {
    this.meals.update((list) =>
      list.map((m) => (m.key === mealKey ? { ...m, items: m.items.filter((i) => i.key !== itemKey) } : m)),
    );
  }

  setItemField(mealKey: string, itemKey: string, field: 'name' | 'quantity', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.meals.update((list) =>
      list.map((m) =>
        m.key === mealKey
          ? { ...m, items: m.items.map((i) => (i.key === itemKey ? { ...i, [field]: value } : i)) }
          : m,
      ),
    );
  }

  /* --- Calendario semanal --------------------------------------------------- */

  openPlanPick(day: number, dayLabel: string, slot: MealSlot): void {
    this.planPick.set({ day, dayLabel, slot, slotLabel: MEAL_SLOT_LABEL[slot] });
  }

  closePlanPick(): void {
    this.planPick.set(null);
  }

  choosePlanOption(mealKey: string | null): void {
    const pick = this.planPick();
    if (!pick) return;

    const cell = `${pick.day}:${pick.slot}`;
    this.plan.update((current) => {
      const next = { ...current };
      if (mealKey) next[cell] = mealKey;
      else delete next[cell];
      return next;
    });
    this.planPick.set(null);
  }

  /** Vacía la semana entera sin tocar las opciones. */
  clearPlan(): void {
    this.plan.set({});
  }

  /* --- Lista de la compra -------------------------------------------------- */

  readonly newShoppingName = signal('');
  readonly newShoppingQuantity = signal('');
  readonly newShoppingCategory = signal<ShoppingCategory>('frutas');

  readonly canAddShopping = computed(() => this.newShoppingName().trim().length > 0);

  onNewShoppingName(event: Event): void {
    this.newShoppingName.set((event.target as HTMLInputElement).value);
  }

  onNewShoppingQuantity(event: Event): void {
    this.newShoppingQuantity.set((event.target as HTMLInputElement).value);
  }

  onNewShoppingCategory(event: Event): void {
    this.newShoppingCategory.set((event.target as HTMLSelectElement).value as ShoppingCategory);
  }

  addShoppingItem(): void {
    if (!this.canAddShopping()) return;
    this.shopping.update((list) => [
      ...list,
      {
        key: newKey(),
        category: this.newShoppingCategory(),
        name: this.newShoppingName().trim(),
        quantity: this.newShoppingQuantity().trim(),
        checked: false,
      },
    ]);
    // La categoría se queda como está: al hacer la lista se añaden varias cosas
    // seguidas de la misma sección.
    this.newShoppingName.set('');
    this.newShoppingQuantity.set('');
  }

  toggleShoppingItem(itemKey: string): void {
    this.shopping.update((list) => list.map((i) => (i.key === itemKey ? { ...i, checked: !i.checked } : i)));
  }

  removeShoppingItem(itemKey: string): void {
    this.shopping.update((list) => list.filter((i) => i.key !== itemKey));
  }

  /** Vacía lo ya comprado sin tocar lo que falta. */
  clearCheckedShopping(): void {
    this.shopping.update((list) => list.filter((i) => !i.checked));
  }

  /* --- Guardado ----------------------------------------------------------- */

  save(): void {
    if (this.saving()) return;

    this.saving.set(true);
    this.saved.set(false);
    this.error.set(null);

    // Las filas sin nombre son las que se acaban de añadir y no se han escrito:
    // se descartan en silencio en vez de guardar líneas en blanco.
    const meals = this.meals();
    const mealIndexByKey = new Map(meals.map((m, i) => [m.key, i]));

    const input: DietInput = {
      kcal: this.toNumber(this.kcal()),
      protein: this.toNumber(this.protein()),
      fat: this.toNumber(this.fat()),
      carbs: this.toNumber(this.carbs()),
      shoppingNotes: this.shoppingNotes().trim() || null,
      meals: meals.map((m) => ({
        slot: m.slot,
        name: m.name.trim() || 'Opción',
        notes: m.notes.trim() || null,
        items: m.items
          .filter((i) => i.name.trim())
          .map((i) => ({ name: i.name.trim(), quantity: i.quantity.trim() || null })),
      })),
      slots: this.slotInfo().map((s) => ({
        slot: s.slot,
        notes: s.notes.trim() || null,
        supplements: s.supplements
          .filter((i) => i.name.trim())
          .map((i) => ({ name: i.name.trim(), quantity: i.quantity.trim() || null })),
      })),
      shoppingItems: this.shopping()
        .filter((i) => i.name.trim())
        .map((i) => ({
          category: i.category,
          name: i.name.trim(),
          quantity: i.quantity.trim() || null,
          checked: i.checked,
        })),
      // El calendario viaja por índice porque las opciones se recrean al guardar.
      plan: Object.entries(this.plan())
        .map(([cell, mealKey]) => {
          const [day, slot] = cell.split(':');
          const mealIndex = mealIndexByKey.get(mealKey);
          return mealIndex === undefined
            ? null
            : { day: Number(day), slot: slot as MealSlot, mealIndex };
        })
        .filter((entry): entry is { day: number; slot: MealSlot; mealIndex: number } => entry !== null),
    };

    this.dietService.save(input).subscribe({
      next: (diet) => {
        this.apply(diet);
        this.saving.set(false);
        this.saved.set(true);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se ha podido guardar la dieta.');
      },
    });
  }

  private toNumber(raw: string): number | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const value = Number(trimmed);
    return Number.isFinite(value) ? Math.trunc(value) : null;
  }

  private apply(diet: Diet): void {
    this.kcal.set(diet.kcal?.toString() ?? '');
    this.protein.set(diet.protein?.toString() ?? '');
    this.fat.set(diet.fat?.toString() ?? '');
    this.carbs.set(diet.carbs?.toString() ?? '');
    this.shoppingNotes.set(diet.shoppingNotes ?? '');

    // El id del servidor se cambia por la `key` local, y se guarda la equivalencia
    // para poder reconstruir el calendario, que viene referido a esos ids.
    const keyByServerId = new Map<string, string>();
    this.meals.set(
      diet.meals.map((m) => {
        const key = newKey();
        keyByServerId.set(m.id, key);
        return {
          key,
          slot: m.slot,
          name: m.name,
          notes: m.notes ?? '',
          items: m.items.map((i) => ({ key: newKey(), name: i.name, quantity: i.quantity ?? '' })),
        };
      }),
    );

    this.slotInfo.set(
      MEAL_SLOTS.map((slot) => {
        const info = diet.slots.find((s) => s.slot === slot);
        return {
          slot,
          notes: info?.notes ?? '',
          supplements: (info?.supplements ?? []).map((s) => ({
            key: newKey(),
            name: s.name,
            quantity: s.quantity ?? '',
          })),
        };
      }),
    );

    // Las casillas que apuntaran a una opción que ya no viene se descartan.
    const plan: Record<string, string> = {};
    for (const entry of diet.planEntries) {
      const key = keyByServerId.get(entry.mealId);
      if (key) plan[`${entry.day}:${entry.slot}`] = key;
    }
    this.plan.set(plan);

    this.shopping.set(
      diet.shoppingItems.map((i) => ({
        key: newKey(),
        category: i.category,
        name: i.name,
        quantity: i.quantity ?? '',
        checked: i.checked,
      })),
    );
  }
}
