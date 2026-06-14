import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { cropImageToDataUrl, readImageFile } from '../../core/utils/image';

const CROP_VIEWPORT = 240;

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

  readonly cropViewport = CROP_VIEWPORT;
  readonly cropSrc = signal<string | null>(null);
  readonly cropNatural = signal({ w: 0, h: 0 });
  readonly cropZoom = signal(1);
  readonly cropOffset = signal({ x: 0, y: 0 });
  private dragStart: { x: number; y: number; offsetX: number; offsetY: number } | null = null;

  readonly cropBaseScale = computed(() => {
    const { w, h } = this.cropNatural();
    return w && h ? CROP_VIEWPORT / Math.min(w, h) : 1;
  });
  readonly cropScale = computed(() => this.cropBaseScale() * this.cropZoom());
  readonly cropDispWidth = computed(() => this.cropNatural().w * this.cropScale());
  readonly cropDispHeight = computed(() => this.cropNatural().h * this.cropScale());

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
      const { src, width, height } = await readImageFile(file);
      this.cropSrc.set(src);
      this.cropNatural.set({ w: width, h: height });
      this.cropZoom.set(1);
      this.cropOffset.set({ x: 0, y: 0 });
    } catch {
      this.error.set('No se ha podido procesar la imagen.');
    } finally {
      input.value = '';
    }
  }

  onCropPointerDown(event: PointerEvent): void {
    event.preventDefault();
    const offset = this.cropOffset();
    this.dragStart = { x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y };
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  onCropPointerMove(event: PointerEvent): void {
    if (!this.dragStart) return;
    const dx = event.clientX - this.dragStart.x;
    const dy = event.clientY - this.dragStart.y;
    this.cropOffset.set(
      this.clampCropOffset(
        { x: this.dragStart.offsetX + dx, y: this.dragStart.offsetY + dy },
        this.cropZoom(),
      ),
    );
  }

  onCropPointerUp(): void {
    this.dragStart = null;
  }

  onZoomInput(event: Event): void {
    const zoom = Number((event.target as HTMLInputElement).value);
    this.cropZoom.set(zoom);
    this.cropOffset.set(this.clampCropOffset(this.cropOffset(), zoom));
  }

  async confirmCrop(): Promise<void> {
    const src = this.cropSrc();
    if (!src) return;

    const { w: natW, h: natH } = this.cropNatural();
    const scale = this.cropScale();
    const offset = this.cropOffset();
    const sourceSize = CROP_VIEWPORT / scale;
    const sourceX = natW / 2 - offset.x / scale - sourceSize / 2;
    const sourceY = natH / 2 - offset.y / scale - sourceSize / 2;

    try {
      const dataUrl = await cropImageToDataUrl(src, { x: sourceX, y: sourceY, size: sourceSize });
      this.avatarUrl.set(dataUrl);
      this.success.set(false);
    } catch {
      this.error.set('No se ha podido procesar la imagen.');
    } finally {
      this.cropSrc.set(null);
    }
  }

  cancelCrop(): void {
    this.cropSrc.set(null);
  }

  removePhoto(): void {
    this.avatarUrl.set(null);
    this.success.set(false);
  }

  private clampCropOffset(offset: { x: number; y: number }, zoom: number): { x: number; y: number } {
    const scale = this.cropBaseScale() * zoom;
    const { w: natW, h: natH } = this.cropNatural();
    const maxX = Math.max(0, (natW * scale - CROP_VIEWPORT) / 2);
    const maxY = Math.max(0, (natH * scale - CROP_VIEWPORT) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, offset.x)),
      y: Math.min(maxY, Math.max(-maxY, offset.y)),
    };
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
