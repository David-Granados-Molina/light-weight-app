import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { AvatarService } from '../../../core/services/avatar.service';

let nextInstanceId = 0;

@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './avatar.html',
  styleUrl: './avatar.css',
})
export class AppAvatar {
  private readonly avatarService = inject(AvatarService);

  readonly avatarId = input<string | null | undefined>(null);
  readonly fallback = input('?');

  /**
   * Clave propia de esta instancia. El SVG se inyecta en línea y lleva ids internos; si dos
   * avatares iguales comparten markup, sus `url(#…)` colisionan y la máscara deja de recortar
   * la figura, dejando un bloque de color macizo.
   */
  private readonly instanceKey = `avatar-${++nextInstanceId}`;

  private readonly svgRaw = computed(() => this.avatarService.get(this.avatarId(), this.instanceKey)());
  readonly svg = computed(() => (this.avatarId() ? this.svgRaw() : null));
}
