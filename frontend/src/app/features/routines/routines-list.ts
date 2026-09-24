import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { RoutineService } from '../../core/services/routine.service';
import { Routine } from '../../core/models/routine.model';
import { CATEGORY_COLOR, CATEGORY_LABEL } from '../../core/models/labels';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { RoutineCopyDialog } from '../../shared/components/routine-copy-dialog/routine-copy-dialog';

@Component({
  selector: 'app-routines-list',
  imports: [RouterLink, ConfirmDialog, RoutineCopyDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './routines-list.html',
  styleUrl: './routines-list.css',
})
export class RoutinesList {
  private readonly routineService = inject(RoutineService);
  private readonly authService = inject(AuthService);

  readonly categoryColor = CATEGORY_COLOR;
  readonly categoryLabel = CATEGORY_LABEL;

  readonly routines = signal<Routine[]>([]);
  readonly loading = signal(true);
  readonly confirmDeleteId = signal<string | null>(null);

  readonly isAdmin = computed(() => this.authService.currentUser()?.isAdmin ?? false);
  readonly copyTarget = signal<{ id: string; name: string } | null>(null);

  askCopy(id: string, name: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.copyTarget.set({ id, name });
  }

  closeCopy(): void {
    this.copyTarget.set(null);
  }

  readonly rows = computed(() =>
    this.routines().map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      exercisesText: r.exercises.map((e) => e.exercise.name).join(' · '),
      count: r.exercises.length,
    })),
  );

  constructor() {
    this.load();
  }

  askDeleteRoutine(id: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.confirmDeleteId.set(id);
  }

  cancelDeleteRoutine(): void {
    this.confirmDeleteId.set(null);
  }

  confirmDeleteRoutine(): void {
    const id = this.confirmDeleteId();
    if (!id) return;
    this.confirmDeleteId.set(null);
    this.routineService.delete(id).subscribe(() => {
      this.routines.update((list) => list.filter((r) => r.id !== id));
    });
  }

  private load(): void {
    this.loading.set(true);
    this.routineService.getAll().subscribe({
      next: (routines) => {
        this.routines.set(routines);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
