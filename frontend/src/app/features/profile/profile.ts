import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { resizeImageToDataUrl } from '../../core/utils/image';

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
  readonly avatarUrl = signal<string | null>(null);
  readonly initial = computed(() => (this.name().charAt(0) || '?').toUpperCase());

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);

  readonly canSave = computed(() => this.name().trim().length >= 2 && !this.saving());

  constructor() {
    const user = this.user();
    this.name.set(user?.name ?? '');
    this.avatarUrl.set(user?.avatarUrl ?? null);
  }

  onNameInput(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
    this.success.set(false);
  }

  async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await resizeImageToDataUrl(file);
      this.avatarUrl.set(dataUrl);
      this.success.set(false);
    } catch {
      this.error.set('No se ha podido procesar la imagen.');
    } finally {
      input.value = '';
    }
  }

  removePhoto(): void {
    this.avatarUrl.set(null);
    this.success.set(false);
  }

  save(): void {
    if (!this.canSave()) return;

    this.saving.set(true);
    this.error.set(null);
    this.authService.updateProfile({ name: this.name().trim(), avatarUrl: this.avatarUrl() }).subscribe({
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
