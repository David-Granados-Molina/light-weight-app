import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { avatarSrc, AVATAR_IDS } from '../../core/utils/avatar';

const THEME_COLORS = ['#ffbf00', '#ba5a6e', '#9d1d1d', '#32673d', '#005492', '#69418b', '#9c9c9c', '#5fa990'];

@Component({
  selector: 'app-profile',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private readonly user = this.authService.currentUser;

  readonly name = signal('');
  readonly email = computed(() => this.user()?.email ?? '');
  readonly avatarId = signal<string | null>(null);
  readonly themeColor = signal('#ffbf00');
  readonly initial = computed(() => (this.name().charAt(0) || '?').toUpperCase());
  readonly avatarPreview = computed(() => avatarSrc(this.avatarId()));

  readonly avatarIds = AVATAR_IDS;
  readonly avatarSrc = avatarSrc;
  readonly themeColors = THEME_COLORS;

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);

  readonly canSave = computed(() => this.name().trim().length >= 2 && !this.saving());

  constructor() {
    const user = this.user();
    this.name.set(user?.name ?? '');
    this.avatarId.set(user?.avatarUrl ?? null);
    this.themeColor.set(user?.themeColor ?? '#ffbf00');
  }

  onNameInput(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
    this.success.set(false);
  }

  selectAvatar(id: string): void {
    this.avatarId.set(id);
    this.success.set(false);
  }

  selectColor(color: string): void {
    this.themeColor.set(color);
    this.success.set(false);
  }

  save(): void {
    if (!this.canSave()) return;

    this.saving.set(true);
    this.error.set(null);
    this.authService
      .updateProfile({ name: this.name().trim(), avatarUrl: this.avatarId(), themeColor: this.themeColor() })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.success.set(true);
        },
        error: () => {
          this.saving.set(false);
          this.error.set('No se ha podido guardar los cambios.');
        },
      });
  }

  goRecover(): void {
    this.router.navigate(['/recuperar']);
  }

  logout(): void {
    this.authService.logout();
  }
}
