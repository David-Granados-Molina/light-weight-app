import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WorkoutDraftStore } from '../../../core/services/workout-draft.store';
import { relativeDayLabel } from '../../../core/utils/format';
import { CATEGORY_COLOR } from '../../../core/models/labels';

/**
 * Consola de sesión persistente: la estructura sobre la que se compone la app.
 *
 * `WorkoutDraftStore` ya guardaba el entreno a medias en localStorage, pero la
 * única señal de que existía era un punto de 6 px sobre el icono de registrar.
 * Aquí ese estado se convierte en un objeto visible desde cualquier pantalla:
 * columna fija en escritorio ancho, tarjeta flotante en escritorio medio y
 * barra acoplada sobre la tab-bar en móvil.
 *
 * Quién la muestra lo decide `App`, que es el único que conoce a la vez la ruta
 * activa y el hueco que hay que reservar al pie del contenido.
 */
@Component({
  selector: 'app-session-console',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './session-console.html',
  styleUrl: './session-console.css',
})
export class SessionConsole {
  private readonly draft = inject(WorkoutDraftStore);

  readonly categoryColor = CATEGORY_COLOR;
  readonly added = this.draft.added;

  readonly dateLabel = computed(() => {
    const date = this.draft.selectedDate();
    return date ? relativeDayLabel(date) : 'Hoy';
  });

  readonly isEditing = computed(() => this.draft.editingSessionId() !== null);

  readonly exerciseCount = computed(() => this.added().length);

  readonly setCount = computed(() => this.added().reduce((total, item) => total + item.sets.length, 0));

  /** Los primeros ejercicios bastan para reconocer el entreno; el resto se resume. */
  readonly preview = computed(() => this.added().slice(0, 4));

  readonly overflowCount = computed(() => Math.max(0, this.added().length - 4));
}
