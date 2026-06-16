import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { AvatarService } from '../../../core/services/avatar.service';
import { avatarIsPng, avatarSrc } from '../../../core/utils/avatar';

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

  readonly isPng = computed(() => avatarIsPng(this.avatarId()));
  readonly pngSrc = computed(() => (this.isPng() ? avatarSrc(this.avatarId()) : null));

  private readonly svgRaw = computed(() => this.avatarService.get(this.avatarId())());
  readonly svg = computed(() => (!this.isPng() && this.avatarId() ? this.svgRaw() : null));
}
