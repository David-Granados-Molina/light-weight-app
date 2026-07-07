import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { AdminService } from '../../core/services/admin.service';
import { Routine, RoutineExercise } from '../../core/models/routine.model';
import { CATEGORY_COLOR, CATEGORY_LABEL } from '../../core/models/labels';
import { ExerciseLoader } from '../../shared/components/exercise-loader/exercise-loader';

@Component({
  selector: 'app-friend-routines',
  imports: [RouterLink, ExerciseLoader],
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

  readonly rows = computed(() =>
    this.routines().map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      exercises: r.exercises.map((e) => ({
        id: e.id,
        name: e.exercise.name,
        muscleGroup: e.exercise.muscleGroup,
        target: this.formatTarget(e),
        note: e.note,
      })),
      count: r.exercises.length,
    })),
  );

  /** Resumen del objetivo de un ejercicio de rutina, ej. "3 series · 20kg · 8-12 reps · RIR 2". */
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
