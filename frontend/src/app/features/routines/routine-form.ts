import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ExerciseService } from '../../core/services/exercise.service';
import { RoutineService } from '../../core/services/routine.service';
import { Category, Exercise, ExerciseType, InputType } from '../../core/models/exercise.model';
import { RoutineInput } from '../../core/models/routine.model';
import { CATEGORY_COLOR, INPUT_TYPE_LABEL, TYPE_LABEL } from '../../core/models/labels';

interface ExerciseRow {
  exerciseId: string;
  exercise: Exercise;
  targetSets: number;
  targetReps: number;
}

const EXERCISE_TYPES: ExerciseType[] = ['empuje', 'tiron', 'pierna', 'core'];
const INPUT_TYPES: InputType[] = ['peso', 'reps', 'tiempo'];

@Component({
  selector: 'app-routine-form',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './routine-form.html',
  styleUrl: './routine-form.css',
})
export class RoutineForm {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly routineService = inject(RoutineService);
  private readonly exerciseService = inject(ExerciseService);

  readonly categoryColor = CATEGORY_COLOR;
  readonly typeLabel = TYPE_LABEL;
  readonly inputTypeLabel = INPUT_TYPE_LABEL;
  readonly exerciseTypes = EXERCISE_TYPES;
  readonly inputTypes = INPUT_TYPES;

  readonly routineId = signal<string | null>(null);
  readonly isEdit = computed(() => this.routineId() !== null);

  readonly name = signal('');
  readonly category = signal<Category>('gym');
  readonly exercises = signal<ExerciseRow[]>([]);
  readonly catalog = signal<Exercise[]>([]);
  readonly search = signal('');
  readonly saving = signal(false);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly creatingExercise = signal(false);
  readonly newExerciseType = signal<ExerciseType>('empuje');
  readonly newExerciseInputType = signal<InputType>('peso');

  readonly searchResults = computed(() => {
    const q = this.search().trim().toLowerCase();
    const addedIds = new Set(this.exercises().map((e) => e.exerciseId));
    return this.catalog()
      .filter(
        (e) =>
          e.category === this.category() &&
          !addedIds.has(e.id) &&
          (q === '' || e.name.toLowerCase().includes(q)),
      )
      .slice(0, 5);
  });

  readonly showResults = computed(() => this.search().trim() !== '' && this.searchResults().length > 0);
  readonly showCreateOption = computed(
    () => this.search().trim().length >= 2 && this.searchResults().length === 0 && !this.creatingExercise(),
  );

  readonly canSave = computed(() => this.name().trim().length >= 2 && this.exercises().length > 0 && !this.saving());

  constructor() {
    this.exerciseService.getAll().subscribe((list) => this.catalog.set(list));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.routineId.set(id);
      this.routineService.getOne(id).subscribe({
        next: (routine) => {
          this.name.set(routine.name);
          this.category.set(routine.category);
          this.exercises.set(
            routine.exercises.map((e) => ({
              exerciseId: e.exerciseId,
              exercise: e.exercise,
              targetSets: e.targetSets,
              targetReps: e.targetReps,
            })),
          );
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se ha podido cargar la rutina.');
          this.loading.set(false);
        },
      });
    } else {
      this.loading.set(false);
    }
  }

  onNameInput(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
  }

  onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
    this.creatingExercise.set(false);
  }

  selectCategory(cat: Category): void {
    this.category.set(cat);
    this.search.set('');
    this.creatingExercise.set(false);
  }

  addExercise(exercise: Exercise): void {
    this.exercises.update((list) => [...list, { exerciseId: exercise.id, exercise, targetSets: 3, targetReps: 10 }]);
    this.search.set('');
  }

  removeExercise(index: number): void {
    this.exercises.update((list) => list.filter((_, i) => i !== index));
  }

  moveExercise(index: number, direction: -1 | 1): void {
    this.exercises.update((list) => {
      const target = index + direction;
      if (target < 0 || target >= list.length) return list;
      const copy = [...list];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  bumpTarget(index: number, field: 'targetSets' | 'targetReps', delta: number): void {
    const min = 1;
    const max = field === 'targetSets' ? 20 : 200;
    this.exercises.update((list) =>
      list.map((row, i) => {
        if (i !== index) return row;
        const value = Math.min(max, Math.max(min, row[field] + delta));
        return { ...row, [field]: value };
      }),
    );
  }

  startCreateExercise(): void {
    this.creatingExercise.set(true);
  }

  cancelCreateExercise(): void {
    this.creatingExercise.set(false);
  }

  selectNewExerciseType(type: ExerciseType): void {
    this.newExerciseType.set(type);
  }

  selectNewExerciseInputType(inputType: InputType): void {
    this.newExerciseInputType.set(inputType);
  }

  confirmCreateExercise(): void {
    const name = this.search().trim();
    if (name.length < 2) return;

    this.exerciseService
      .create({
        name,
        category: this.category(),
        type: this.newExerciseType(),
        inputType: this.newExerciseInputType(),
      })
      .subscribe({
        next: (exercise) => {
          this.catalog.update((list) => [...list, exercise]);
          this.addExercise(exercise);
          this.creatingExercise.set(false);
          this.newExerciseType.set('empuje');
          this.newExerciseInputType.set('peso');
        },
        error: () => this.error.set('No se ha podido crear el ejercicio. Comprueba que el nombre no esté repetido.'),
      });
  }

  save(): void {
    if (!this.canSave()) return;

    const input: RoutineInput = {
      name: this.name().trim(),
      category: this.category(),
      exercises: this.exercises().map((e) => ({
        exerciseId: e.exerciseId,
        targetSets: e.targetSets,
        targetReps: e.targetReps,
      })),
    };

    this.saving.set(true);
    this.error.set(null);
    const obs = this.routineId()
      ? this.routineService.update(this.routineId()!, input)
      : this.routineService.create(input);

    obs.subscribe({
      next: () => this.router.navigate(['/rutinas']),
      error: () => {
        this.saving.set(false);
        this.error.set('No se ha podido guardar la rutina.');
      },
    });
  }

  deleteRoutine(): void {
    const id = this.routineId();
    if (!id) return;
    this.routineService.delete(id).subscribe({
      next: () => this.router.navigate(['/rutinas']),
      error: () => this.error.set('No se ha podido eliminar la rutina.'),
    });
  }
}
