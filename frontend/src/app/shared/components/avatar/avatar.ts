import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { AvatarService } from '../../../core/services/avatar.service';

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

  private readonly svgRaw = computed(() => this.avatarService.get(this.avatarId())());
  readonly svg = computed(() => (this.avatarId() ? this.svgRaw() : null));
}
