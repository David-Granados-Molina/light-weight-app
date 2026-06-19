import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MultiSelect } from 'primeng/multiselect';
import { Exercise } from '../../../core/models/exercise.model';
import { CATEGORY_LABEL } from '../../../core/models/labels';

interface ExerciseGroup {
  label: string;
  items: Exercise[];
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
  readonly catalog = input.required<Exercise[]>();
  readonly excludeIds = input<string[]>([]);
  readonly placeholder = input('Buscar ejercicio…');
  readonly picked = output<Exercise>();

  readonly selection = signal<Exercise[]>([]);

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
}
