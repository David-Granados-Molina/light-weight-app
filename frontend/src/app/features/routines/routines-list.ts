import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { RoutineService } from '../../core/services/routine.service';
import { Routine } from '../../core/models/routine.model';
import { CATEGORY_COLOR, CATEGORY_LABEL } from '../../core/models/labels';

@Component({
  selector: 'app-routines-list',
  imports: [RouterLink],
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

  logout(): void {
    this.authService.logout();
  }

  deleteRoutine(id: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
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
