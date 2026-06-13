import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ExerciseService } from '../../core/services/exercise.service';
import { SessionService } from '../../core/services/session.service';
import { Exercise, InputType } from '../../core/models/exercise.model';
import { SessionInput } from '../../core/models/session.model';
import { CATEGORY_COLOR, TYPE_LABEL } from '../../core/models/labels';
import { formatVolume, relativeDayLabel } from '../../core/utils/format';
import { SetEntry, WorkoutDraftStore } from '../../core/services/workout-draft.store';

interface DateChip {
  iso: string;
  label: string;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-register-workout',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './register-workout.html',
  styleUrl: './register-workout.css',
})
export class RegisterWorkout {
  private readonly exerciseService = inject(ExerciseService);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);
  private readonly draft = inject(WorkoutDraftStore);

  readonly categoryColor = CATEGORY_COLOR;
  readonly typeLabel = TYPE_LABEL;
  readonly formatVolume = formatVolume;

  readonly dateChips: DateChip[] = Array.from({ length: 4 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = isoDate(d);
    return { iso, label: relativeDayLabel(iso) };
  });

  readonly catalog = signal<Exercise[]>([]);
  readonly search = this.draft.search;
  readonly added = this.draft.added;
  readonly selectedDate = this.draft.selectedDate;
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly savedSummary = signal('');

  readonly searchResults = computed(() => {
    const q = this.search().trim().toLowerCase();
    const addedIds = new Set(this.added().map((a) => a.exercise.id));
    return this.catalog()
      .filter((e) => !addedIds.has(e.id) && (q === '' || e.name.toLowerCase().includes(q)))
      .slice(0, 5);
  });

  readonly showResults = computed(() => this.search().trim() !== '' && this.searchResults().length > 0);

  readonly totals = computed(() => {
    let series = 0;
    let volume = 0;
    for (const a of this.added()) {
      for (const s of a.sets) {
        series++;
        if (s.weight !== undefined && s.reps !== undefined) volume += s.weight * s.reps;
      }
    }
    return { series, volume };
  });

  constructor() {
    this.exerciseService.getAll().subscribe((list) => this.catalog.set(list));
    if (!this.selectedDate()) {
      this.selectedDate.set(this.dateChips[0].iso);
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

  bump(exIndex: number, setIndex: number, field: 'weight' | 'reps' | 'time', delta: number): void {
    this.added.update((list) =>
      list.map((a, i) => {
        if (i !== exIndex) return a;
        return {
          ...a,
          sets: a.sets.map((s, j) => {
            if (j !== setIndex) return s;
            let v = (s[field] ?? 0) + delta;
            v = field === 'weight' ? Math.max(0, Math.round(v * 2) / 2) : Math.max(0, Math.round(v));
            return { ...s, [field]: v };
          }),
        };
      }),
    );
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
        const totals = this.totals();
        this.savedSummary.set(`${totals.series} series · ${formatVolume(Math.round(totals.volume))}`);
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

  private defaultSet(inputType: InputType): SetEntry {
    if (inputType === 'peso') return { weight: 40, reps: 8 };
    if (inputType === 'reps') return { reps: 10 };
    return { time: 30 };
  }
}
