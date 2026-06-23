import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AvatarService } from '../../core/services/avatar.service';
import { AVATAR_IDS, avatarSrc } from '../../core/utils/avatar';
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
    '(document:keydown.escape)': 'closePreview()',
  },
})
export class Profile implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly avatarService = inject(AvatarService);

  private readonly user = this.authService.currentUser;

  readonly name = signal('');
  readonly email = computed(() => this.user()?.email ?? '');
  readonly isAdmin = computed(() => this.user()?.isAdmin ?? false);
  readonly hasPassword = computed(() => this.user()?.hasPassword ?? false);

  readonly passwordRequestSending = signal(false);
  readonly passwordRequestSent = signal(false);
  readonly passwordRequestError = signal<string | null>(null);
  readonly avatarId = signal<string | null>(null);
  readonly themeColor = signal('#ffbf00');
  readonly initial = computed(() => (this.name().charAt(0) || '?').toUpperCase());

  readonly avatarIds = AVATAR_IDS;
  readonly themeOptions = THEME_OPTIONS;

  readonly avatarMenuOpen = signal(false);
  readonly themeMenuOpen = signal(false);
  readonly previewOpen = signal(false);
  readonly lightboxSrc = signal<string | null>(null);

  readonly currentThemeLabel = computed(
    () => this.themeOptions.find((t) => t.color === this.themeColor())?.label ?? 'Tema',
  );

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);

  readonly canSave = computed(() => this.name().trim().length >= 2 && !this.saving());

  private blobUrl: string | null = null;

  constructor() {
    const user = this.user();
    this.name.set(user?.name ?? '');
    this.avatarId.set(user?.avatarUrl ?? null);
    this.themeColor.set(user?.themeColor ?? '#ffbf00');
  }

  ngOnDestroy(): void {
    this.revokeBlobUrl();
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

  openPreview(): void {
    this.previewOpen.set(true);
    this.loadLightboxSrc();
  }

  closePreview(): void {
    this.previewOpen.set(false);
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

  requestPasswordEmail(): void {
    if (this.passwordRequestSending()) return;

    this.passwordRequestSending.set(true);
    this.passwordRequestSent.set(false);
    this.passwordRequestError.set(null);
    this.authService.forgotPassword(this.email()).subscribe({
      next: () => {
        this.passwordRequestSending.set(false);
        this.passwordRequestSent.set(true);
      },
      error: () => {
        this.passwordRequestSending.set(false);
        this.passwordRequestError.set('No se ha podido enviar el email. Inténtalo de nuevo.');
      },
    });
  }

  logout(): void {
    this.authService.logout();
  }

  private loadLightboxSrc(): void {
    const id = this.avatarId();
    if (!id) return;

    const raw = this.avatarService.getRaw(id)();
    if (raw) {
      this.buildBlobUrl(raw);
      return;
    }

    // SVG not yet in cache — wait one tick and retry via the signal
    const src = avatarSrc(id);
    if (!src) return;
    fetch(src)
      .then((r) => r.text())
      .then((text) => this.buildBlobUrl(text))
      .catch(() => {});
  }

  private async buildBlobUrl(raw: string): Promise<void> {
    const origin = window.location.origin;
    let processed = raw.replace(/currentColor/g, this.themeColor());

    // SVGs inside <img> blobs cannot make external network requests.
    // Find relative href="/..." image paths and inline them as base64 data URIs.
    for (const m of [...processed.matchAll(/href="(\/[^"]+)"/g)]) {
      try {
        const resp = await fetch(`${origin}${m[1]}`);
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          resp.blob().then((b) => reader.readAsDataURL(b));
        });
        processed = processed.replace(`href="${m[1]}"`, `href="${dataUrl}"`);
      } catch { /* skip if unreachable */ }
    }

    processed = processed.replace(/<image\b/g, '<image image-rendering="crispEdges"');
    this.revokeBlobUrl();
    this.blobUrl = URL.createObjectURL(new Blob([processed], { type: 'image/svg+xml' }));
    this.lightboxSrc.set(this.blobUrl);
  }

  private revokeBlobUrl(): void {
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }
  }
}
