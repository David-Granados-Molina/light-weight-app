import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FilterService } from 'primeng/api';
import { MultiSelect } from 'primeng/multiselect';
import { Exercise } from '../../../core/models/exercise.model';
import { CATEGORY_COLOR, CATEGORY_LABEL } from '../../../core/models/labels';

interface ExerciseGroup {
  label: string;
  items: Exercise[];
}

/** Modo de filtrado propio, registrado en el FilterService global de PrimeNG. */
const FLEXIBLE_MATCH_MODE = 'lwFlexible';

/**
 * Coincidencia por palabras sueltas.
 *
 * El `contains` de PrimeNG compara la consulta entera como una sola cadena, así
 * que "Dominadas " (con el espacio de más que deja el teclado del móvil al
 * autocompletar) deja de encontrar "Dominadas". Aquí la consulta se parte en
 * palabras y se exige que estén todas, en cualquier orden: "Dominadas " encuentra
 * "Dominadas" y "Dominadas negativas", y "banca press" encuentra "Press banca".
 */
function flexibleMatch(value: unknown, filter: unknown, filterLocale?: string): boolean {
  if (filter === undefined || filter === null) return true;

  const normalize = (input: string) =>
    input
      .normalize('NFD')
      // Marcas diacríticas combinantes: separadas por NFD y descartadas aquí,
      // de modo que "dominadas" encuentre también "Dominádas" mal escrito.
      .replace(/[̀-ͯ]/g, '')
      .toLocaleLowerCase(filterLocale);

  const tokens = normalize(String(filter))
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.length) return true;

  if (value === undefined || value === null) return false;
  const haystack = normalize(String(value));
  return tokens.every((token) => haystack.includes(token));
}

/**
 * Catálogo de ejercicios agrupado por categoría (gym / calistenia) con filtro de texto.
 * Cada selección se emite al instante mediante `picked` y se limpia, de modo que el
 * componente actúa como un "añadir desde catálogo" en vez de un multiselect persistente.
 */
@Component({
  selector: 'app-exercise-picker',
  imports: [FormsModule, MultiSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Sin encapsulación: el panel desplegable de p-multiselect se renderiza en un overlay
  // fuera de este componente, así que hay que poder llegar a él con selectores globales
  // (acotados por las clases .exercise-picker / .exercise-picker-panel).
  encapsulation: ViewEncapsulation.None,
  templateUrl: './exercise-picker.html',
  styleUrl: './exercise-picker.css',
})
export class ExercisePicker {
  private readonly filterService = inject(FilterService);

  readonly categoryColor = CATEGORY_COLOR;
  /**
   * El input `filterMatchMode` de PrimeNG está tipado con la lista cerrada de sus
   * modos, pero `FilterService.register()` existe precisamente para añadir otros:
   * el tipo es más estrecho que el contrato en ejecución. La aserción se queda
   * acotada aquí, en la única línea donde hace falta.
   */
  readonly filterMatchMode = FLEXIBLE_MATCH_MODE as 'contains';

  readonly catalog = input.required<Exercise[]>();
  readonly excludeIds = input<string[]>([]);
  readonly placeholder = input('Buscar ejercicio…');

  /** Muestra el botón de añadir ejercicio nuevo. */
  readonly allowCreate = input(false, { transform: booleanAttribute });

  readonly picked = output<Exercise>();

  /** El usuario quiere dar de alta un ejercicio nuevo; el padre abre el formulario. */
  readonly createRequested = output<void>();

  readonly selection = signal<Exercise[]>([]);

  constructor() {
    this.filterService.register(FLEXIBLE_MATCH_MODE, flexibleMatch);
  }

  readonly groups = computed<ExerciseGroup[]>(() => {
    const excluded = new Set(this.excludeIds());
    const available = this.catalog().filter((e) => !excluded.has(e.id));
    return (['gym', 'calistenia'] as const)
      .map((category) => ({ label: CATEGORY_LABEL[category], items: available.filter((e) => e.category === category) }))
      .filter((group) => group.items.length > 0);
  });

  onSelectionChange(value: Exercise[]): void {
    for (const exercise of value) this.picked.emit(exercise);
    this.selection.set([]);
  }

  dotColor(exercise: Exercise): string {
    return this.categoryColor[exercise.category];
  }
}
