import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { WorkoutDraftStore } from '../../../core/services/workout-draft.store';
import { AppAvatar } from '../avatar/avatar';

/**
 * Navegación de escritorio. Sustituye a la tab-bar inferior a partir de 900 px:
 * en la mesa el pulgar no manda y una barra fija abajo desperdicia el alto útil.
 * Registrar no es un enlace más de la lista, es la acción primaria del producto,
 * así que aquí es un botón y no una pestaña.
 */
@Component({
  selector: 'app-side-rail',
  imports: [RouterLink, RouterLinkActive, AppAvatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './side-rail.html',
  styleUrl: './side-rail.css',
})
export class SideRail {
  private readonly auth = inject(AuthService);
  private readonly draft = inject(WorkoutDraftStore);

  readonly hasDraftInProgress = this.draft.hasInProgress;
  readonly userName = computed(() => this.auth.currentUser()?.name ?? '');
  readonly avatarId = computed(() => this.auth.currentUser()?.avatarUrl ?? null);
  readonly initial = computed(() => this.userName().charAt(0) || '?');
}
