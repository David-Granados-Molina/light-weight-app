import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { AdminService } from '../../core/services/admin.service';
import { Routine, RoutineExercise } from '../../core/models/routine.model';
import { CATEGORY_COLOR, CATEGORY_LABEL } from '../../core/models/labels';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { RoutineCopyDialog } from '../../shared/components/routine-copy-dialog/routine-copy-dialog';

@Component({
  selector: 'app-friend-routines',
  imports: [RouterLink, ConfirmDialog, RoutineCopyDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './friend-routines.html',
  styleUrl: './friend-routines.css',
})
export class FriendRoutines {
  private readonly adminService = inject(AdminService);
  private readonly route = inject(ActivatedRoute);

  readonly targetUserId = toSignal(this.route.paramMap.pipe(map((p) => p.get('userId'))), {
    initialValue: this.route.snapshot.paramMap.get('userId'),
  });
  readonly targetUserName = toSignal(this.route.queryParamMap.pipe(map((p) => p.get('name'))), {
    initialValue: this.route.snapshot.queryParamMap.get('name'),
  });

  readonly categoryColor = CATEGORY_COLOR;
  readonly categoryLabel = CATEGORY_LABEL;

  readonly routines = signal<Routine[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  /** Rutina pendiente de que se confirme su borrado. */
  readonly deleteTarget = signal<{ id: string; name: string } | null>(null);

  readonly copyTarget = signal<{ id: string; name: string } | null>(null);

  askCopy(id: string, name: string): void {
    this.copyTarget.set({ id, name });
  }

  closeCopy(): void {
    this.copyTarget.set(null);
  }

  /** Los enlaces al formulario llevan el nombre para que la cabecera pueda decir de quién es. */
  readonly nameQuery = computed(() => ({ name: this.targetUserName() }));

  readonly rows = computed(() =>
    this.routines().map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      exercises: r.exercises.map((e) => ({
        id: e.id,
        name: e.exercise.name,
        muscleGroup: e.exercise.muscleGroup,
        primaryMuscles: e.exercise.primaryMuscles,
        secondaryMuscles: e.exercise.secondaryMuscles,
        target: this.formatTarget(e),
        note: e.note,
        description: e.description,
        videoUrl: e.videoUrl,
        restSeconds: e.restSeconds,
      })),
      count: r.exercises.length,
    })),
  );

  /** Resumen del objetivo de un ejercicio de rutina, ej. "3 series · 20kg · 8-12 reps · RIR 2". */
  /** "90 s", "1 min", "1 min 30 s". Null cuando la rutina no fija descanso. */
  restLabel(total: number | null | undefined): string | null {
    if (total === null || total === undefined || total <= 0) return null;
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    if (!minutes) return `${seconds} s`;
    if (!seconds) return `${minutes} min`;
    return `${minutes} min ${seconds} s`;
  }

  private formatTarget(re: RoutineExercise): string {
    const inputType = re.exercise.inputType;
    const parts: string[] = [re.targetSets === 1 ? '1 serie' : `${re.targetSets} series`];

    if (inputType === 'min') {
      const total = re.targetRepsMin;
      const h = Math.floor(total / 60);
      const m = total % 60;
      parts.push(h > 0 ? (m > 0 ? `${h}h ${m}min` : `${h}h`) : `${m}min`);
      return parts.join(' · ');
    }

    if (re.targetWeight !== null && re.targetWeight !== undefined && re.targetWeight > 0) {
      parts.push(`${re.targetWeight}kg`);
    }

    const unit = inputType === 'tiempo' ? 'seg' : inputType === 'emom' ? 'rondas' : 'reps';
    parts.push(
      re.targetRepsMin === re.targetRepsMax
        ? `${re.targetRepsMin} ${unit}`
        : `${re.targetRepsMin}-${re.targetRepsMax} ${unit}`,
    );

    if (re.targetRIR !== null && re.targetRIR !== undefined) {
      parts.push(`RIR ${re.targetRIR}`);
    }

    return parts.join(' · ');
  }

  askDelete(id: string, name: string): void {
    this.deleteTarget.set({ id, name });
  }

  cancelDelete(): void {
    this.deleteTarget.set(null);
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    const userId = this.targetUserId();
    if (!target || !userId) return;

    this.deleteTarget.set(null);
    this.error.set(null);
    this.adminService.deleteRoutine(userId, target.id).subscribe({
      next: () => this.routines.update((list) => list.filter((r) => r.id !== target.id)),
      error: () => this.error.set('No se ha podido eliminar la rutina.'),
    });
  }

  constructor() {
    const userId = this.targetUserId();
    if (userId) {
      this.adminService.getRoutines(userId).subscribe({
        next: (list) => {
          this.routines.set(list);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    } else {
      this.loading.set(false);
    }
  }
}
