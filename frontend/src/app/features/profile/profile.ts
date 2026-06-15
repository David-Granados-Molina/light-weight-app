import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AVATAR_IDS } from '../../core/utils/avatar';
import { AppAvatar } from '../../shared/components/avatar/avatar';

const THEME_OPTIONS = [
  { color: '#ffbf00', label: 'Ámbar' },
  { color: '#ba5a6e', label: 'Rosa' },
  { color: '#9d1d1d', label: 'Rojo' },
  { color: '#32673d', label: 'Verde' },
  { color: '#005492', label: 'Azul' },
  { color: '#69418b', label: 'Morado' },
  { color: '#9c9c9c', label: 'Gris' },
  { color: '#5fa990', label: 'Menta' },
];

@Component({
  selector: 'app-profile',
  imports: [RouterLink, AppAvatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.html',
  styleUrl: './profile.css',
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
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

  readonly avatarIds = AVATAR_IDS;
  readonly themeOptions = THEME_OPTIONS;

  readonly avatarMenuOpen = signal(false);
  readonly themeMenuOpen = signal(false);
  readonly currentThemeLabel = computed(
    () => this.themeOptions.find((t) => t.color === this.themeColor())?.label ?? 'Tema',
  );

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

  toggleAvatarMenu(): void {
    this.avatarMenuOpen.update((open) => !open);
    this.themeMenuOpen.set(false);
  }

  toggleThemeMenu(): void {
    this.themeMenuOpen.update((open) => !open);
    this.avatarMenuOpen.set(false);
  }

  selectAvatar(id: string | null): void {
    this.avatarId.set(id);
    this.avatarMenuOpen.set(false);
    this.success.set(false);
  }

  selectColor(color: string): void {
    this.themeColor.set(color);
    this.themeMenuOpen.set(false);
    this.success.set(false);
  }

  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.closest('.dropdown')) return;
    this.avatarMenuOpen.set(false);
    this.themeMenuOpen.set(false);
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
