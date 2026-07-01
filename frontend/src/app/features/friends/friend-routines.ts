import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { AdminService } from '../../core/services/admin.service';
import { Routine } from '../../core/models/routine.model';
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
      exercisesText: r.exercises.map((e) => e.exercise.name).join(' · '),
      count: r.exercises.length,
    })),
  );

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
