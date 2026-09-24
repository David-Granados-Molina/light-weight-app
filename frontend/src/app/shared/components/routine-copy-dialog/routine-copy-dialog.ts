import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { AdminUser } from '../../../core/models/admin.model';

@Component({
  selector: 'app-routine-copy-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './routine-copy-dialog.html',
  styleUrl: './routine-copy-dialog.css',
})
export class RoutineCopyDialog {
  private readonly adminService = inject(AdminService);
  private readonly authService = inject(AuthService);

  readonly routineId = input.required<string>();
  readonly routineName = input.required<string>();

  readonly ownerId = input<string | null>(null);

  readonly copied = output<string>();
  readonly cancelled = output<void>();

  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  readonly users = signal<AdminUser[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly copying = signal(false);
  readonly copyError = signal(false);
  readonly selectedId = signal<string | null>(null);

  readonly done = signal<string | null>(null);

  readonly targets = computed<AdminUser[]>(() => {
    const me = this.authService.currentUser();
    const mine: AdminUser[] = me
      ? [{ id: me.id, name: `${me.name} (tu cuenta)`, email: me.email, avatarUrl: me.avatarUrl }]
      : [];
    const owner = this.ownerId();
    return [...mine, ...this.users()].filter((u) => u.id !== owner);
  });

  constructor() {
    afterNextRender(() => {
      const dialog = this.dialogRef().nativeElement;
      if (!dialog.open) dialog.showModal();
    });

    this.adminService.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  select(id: string): void {
    this.selectedId.set(id);
    this.copyError.set(false);
  }

  copy(): void {
    const targetId = this.selectedId();
    if (!targetId || this.copying()) return;

    this.copying.set(true);
    this.copyError.set(false);
    this.adminService.copyRoutine(this.routineId(), targetId).subscribe({
      next: () => {
        this.copying.set(false);
        this.done.set(this.targets().find((u) => u.id === targetId)?.name ?? 'la otra cuenta');
      },
      error: () => {
        this.copying.set(false);
        this.copyError.set(true);
      },
    });
  }

  onCancelEvent(event: Event): void {
    event.preventDefault();
    this.cancelled.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialogRef().nativeElement) this.cancelled.emit();
  }
}
