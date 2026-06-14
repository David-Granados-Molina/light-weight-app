import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ExerciseService } from '../../core/services/exercise.service';
import { SessionService } from '../../core/services/session.service';
import { RoutineService } from '../../core/services/routine.service';
import { Exercise, InputType } from '../../core/models/exercise.model';
import { SessionInput, SessionSet } from '../../core/models/session.model';
import { Routine } from '../../core/models/routine.model';
import { CATEGORY_COLOR, TYPE_LABEL } from '../../core/models/labels';
import { formatSet, relativeDayLabel } from '../../core/utils/format';
import { SetEntry, WorkoutDraftStore } from '../../core/services/workout-draft.store';
import { NumberWheel } from '../../shared/components/number-wheel/number-wheel';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';

interface DateChip {
  iso: string;
  label: string;
}

interface LastSessionData {
  date: string;
  sets: SessionSet[];
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-register-workout',
  imports: [NumberWheel, ConfirmDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './register-workout.html',
  styleUrl: './register-workout.css',
})
export class RegisterWorkout {
  private readonly exerciseService = inject(ExerciseService);
  private readonly sessionService = inject(SessionService);
  private readonly routineService = inject(RoutineService);
  private readonly router = inject(Router);
  private readonly draft = inject(WorkoutDraftStore);

  readonly categoryColor = CATEGORY_COLOR;
  readonly typeLabel = TYPE_LABEL;
  readonly relativeDayLabel = relativeDayLabel;

  readonly dateChips: DateChip[] = Array.from({ length: 4 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = isoDate(d);
    return { iso, label: relativeDayLabel(iso) };
  });

  readonly catalog = signal<Exercise[]>([]);
  readonly routines = signal<Routine[]>([]);
  readonly search = this.draft.search;
  readonly added = this.draft.added;
  readonly selectedDate = this.draft.selectedDate;
  readonly selectedRoutineId = this.draft.selectedRoutineId;
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly savedSummary = signal('');
  readonly pendingRoutine = signal<Routine | null>(null);

  readonly lastData = signal<Record<string, LastSessionData | null>>({});

  readonly searchResults = computed(() => {
    const q = this.search().trim().toLowerCase();
    const addedIds = new Set(this.added().map((a) => a.exercise.id));
    return this.catalog()
      .filter((e) => !addedIds.has(e.id) && (q === '' || e.name.toLowerCase().includes(q)))
      .slice(0, 5);
  });

  readonly showResults = computed(() => this.search().trim() !== '' && this.searchResults().length > 0);

  readonly totalSeries = computed(() => this.added().reduce((total, a) => total + a.sets.length, 0));

  constructor() {
    this.exerciseService.getAll().subscribe((list) => this.catalog.set(list));
    this.routineService.getAll().subscribe((list) => this.routines.set(list));
    if (!this.selectedDate()) {
      this.selectedDate.set(this.dateChips[0].iso);
    }
    for (const item of this.added()) {
      this.fetchLastSession(item.exercise.id);
    }
  }

  selectDate(iso: string): void {
    this.selectedDate.set(iso);
  }

  onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  addExercise(exercise: Exercise): void {
    this.added.update((list) => [...list, { exercise, sets: [this.defaultSet(exercise.inputType)] }]);
    this.search.set('');
    this.fetchLastSession(exercise.id);
  }

  removeExercise(index: number): void {
    this.added.update((list) => list.filter((_, i) => i !== index));
  }

  addSet(index: number): void {
    this.added.update((list) =>
      list.map((a, i) => {
        if (i !== index) return a;
        const prev = a.sets[a.sets.length - 1];
        return { ...a, sets: [...a.sets, { ...prev }] };
      }),
    );
  }

  removeSet(exIndex: number, setIndex: number): void {
    this.added.update((list) =>
      list.map((a, i) => (i === exIndex ? { ...a, sets: a.sets.filter((_, j) => j !== setIndex) } : a)),
    );
  }

  setValue(exIndex: number, setIndex: number, field: 'weight' | 'reps' | 'time', value: number): void {
    this.added.update((list) =>
      list.map((a, i) => {
        if (i !== exIndex) return a;
        return { ...a, sets: a.sets.map((s, j) => (j === setIndex ? { ...s, [field]: value } : s)) };
      }),
    );
  }

  selectRoutine(routine: Routine): void {
    if (this.added().length > 0) {
      this.pendingRoutine.set(routine);
      return;
    }
    this.loadRoutine(routine);
  }

  confirmLoadRoutine(): void {
    const routine = this.pendingRoutine();
    if (!routine) return;
    this.pendingRoutine.set(null);
    this.loadRoutine(routine);
  }

  cancelLoadRoutine(): void {
    this.pendingRoutine.set(null);
  }

  clearRoutine(): void {
    this.added.set([]);
    this.selectedRoutineId.set(null);
  }

  private loadRoutine(routine: Routine): void {
    const added = routine.exercises.map((re) => ({
      exercise: re.exercise,
      sets: Array.from({ length: re.targetSets }, () => this.defaultSet(re.exercise.inputType, re.targetReps)),
    }));
    this.added.set(added);
    this.selectedRoutineId.set(routine.id);
    this.search.set('');
    for (const item of added) {
      this.fetchLastSession(item.exercise.id);
    }
  }

  save(): void {
    const added = this.added();
    if (!added.length || this.saving()) return;

    const input: SessionInput = {
      date: this.selectedDate() ?? this.dateChips[0].iso,
      category: added[0].exercise.category,
      type: added[0].exercise.type,
      exercises: added.map((a) => ({
        exerciseId: a.exercise.id,
        sets: a.sets.map((s, i) => ({
          setNumber: i + 1,
          weight: s.weight ?? null,
          reps: s.reps ?? null,
          time: s.time ?? null,
        })),
      })),
    };

    this.saving.set(true);
    this.sessionService.create(input).subscribe({
      next: () => {
        const series = this.totalSeries();
        this.savedSummary.set(series === 1 ? '1 serie guardada' : `${series} series guardadas`);
        this.saving.set(false);
        this.saved.set(true);
      },
      error: () => this.saving.set(false),
    });
  }

  closeSaved(): void {
    this.saved.set(false);
    this.draft.reset();
  }

  goHistorial(): void {
    this.router.navigate(['/historial']);
  }

  lastSummary(exerciseId: string): { sets: string; when: string } | null {
    const data = this.lastData()[exerciseId];
    if (!data) return null;
    return {
      sets: data.sets.map((s) => formatSet(s)).join(' · '),
      when: relativeDayLabel(data.date),
    };
  }

  private fetchLastSession(exerciseId: string): void {
    if (this.lastData()[exerciseId] !== undefined) return;
    this.sessionService.getAll({ exerciseId, limit: 1 }).subscribe((sessions) => {
      const session = sessions[0];
      const sessionExercise = session?.exercises.find((e) => e.exerciseId === exerciseId);
      const data = session && sessionExercise ? { date: session.date, sets: sessionExercise.sets } : null;
      this.lastData.update((m) => ({ ...m, [exerciseId]: data }));
    });
  }

  private defaultSet(inputType: InputType, targetReps?: number): SetEntry {
    if (inputType === 'peso') return { weight: 40, reps: targetReps ?? 8 };
    if (inputType === 'reps') return { reps: targetReps ?? 10, weight: 0 };
    return { time: targetReps ?? 30 };
  }
}
