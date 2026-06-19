import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { ExerciseService } from '../../core/services/exercise.service';
import { RoutineService } from '../../core/services/routine.service';
import { Category, Exercise, ExerciseType, InputType } from '../../core/models/exercise.model';
import { RoutineInput } from '../../core/models/routine.model';
import { CATEGORY_COLOR, INPUT_TYPE_LABEL, TYPE_LABEL } from '../../core/models/labels';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { ExerciseLoader } from '../../shared/components/exercise-loader/exercise-loader';
import { NumberWheel } from '../../shared/components/number-wheel/number-wheel';
import { ExercisePicker } from '../../shared/components/exercise-picker/exercise-picker';

interface ExerciseRow {
  exerciseId: string;
  exercise: Exercise;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetWeight: number | null;
}

const EXERCISE_TYPES: ExerciseType[] = ['empuje', 'tiron', 'pierna', 'core', 'cardio'];
const INPUT_TYPES: InputType[] = ['peso', 'reps', 'tiempo', 'min'];

@Component({
  selector: 'app-routine-form',
  imports: [RouterLink, CdkDropList, CdkDrag, CdkDragHandle, ConfirmDialog, NumberWheel, ExerciseLoader, ExercisePicker],
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
  readonly saving = signal(false);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly creatingExercise = signal(false);
  readonly newExerciseName = signal('');
  readonly newExerciseType = signal<ExerciseType>('empuje');
  readonly newExerciseInputType = signal<InputType>('peso');

  readonly removeIndex = signal<number | null>(null);
  readonly confirmDeleteRoutine = signal(false);

  readonly exerciseIds = computed(() => this.exercises().map((e) => e.exerciseId));
  readonly catalogForCategory = computed(() => this.catalog().filter((e) => e.category === this.category()));

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
              targetRepsMin: e.targetRepsMin,
              targetRepsMax: e.targetRepsMax,
              targetWeight: e.targetWeight,
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

  selectCategory(cat: Category): void {
    this.category.set(cat);
    this.creatingExercise.set(false);
  }

  addExercise(exercise: Exercise): void {
    const isCardio = exercise.inputType === 'min';
    this.exercises.update((list) => [
      ...list,
      {
        exerciseId: exercise.id,
        exercise,
        targetSets: isCardio ? 1 : 3,
        targetRepsMin: isCardio ? 30 : 8,
        targetRepsMax: isCardio ? 30 : 12,
        targetWeight: null,
      },
    ]);
  }

  askRemoveExercise(index: number): void {
    this.removeIndex.set(index);
  }

  cancelRemoveExercise(): void {
    this.removeIndex.set(null);
  }

  confirmRemoveExercise(): void {
    const index = this.removeIndex();
    if (index === null) return;
    this.exercises.update((list) => list.filter((_, i) => i !== index));
    this.removeIndex.set(null);
  }

  onDrop(event: CdkDragDrop<ExerciseRow[]>): void {
    this.exercises.update((list) => {
      const copy = [...list];
      moveItemInArray(copy, event.previousIndex, event.currentIndex);
      return copy;
    });
  }

  cardioTargetHours(index: number): number {
    return Math.floor((this.exercises()[index]?.targetRepsMin ?? 0) / 60);
  }

  cardioTargetMins(index: number): number {
    return (this.exercises()[index]?.targetRepsMin ?? 0) % 60;
  }

  setCardioHours(index: number, hours: number | null): void {
    this.setTarget(index, 'targetRepsMin', (hours ?? 0) * 60 + this.cardioTargetMins(index));
  }

  setCardioMins(index: number, mins: number | null): void {
    this.setTarget(index, 'targetRepsMin', this.cardioTargetHours(index) * 60 + (mins ?? 0));
  }

  repsUnit(inputType: InputType): string {
    if (inputType === 'tiempo') return 'seg';
    if (inputType === 'min') return 'min';
    if (inputType === 'emom') return 'rondas';
    return 'reps';
  }

  /** En calistenia solo tiene sentido el peso para ejercicios lastrados (ej. "Fondos lastrados"). */
  showWeight(exercise: Exercise): boolean {
    if (exercise.inputType === 'min' || exercise.type === 'cardio') return false;
    return exercise.category === 'gym' || exercise.name.toLowerCase().includes('lastre');
  }

  setTarget(index: number, field: 'targetSets' | 'targetRepsMin' | 'targetRepsMax', value: number | null): void {
    this.exercises.update((list) =>
      list.map((row, i) => {
        if (i !== index || value === null) return row;
        const updated = { ...row, [field]: value };
        if (field === 'targetRepsMin' && updated.targetRepsMax < value) updated.targetRepsMax = value;
        if (field === 'targetRepsMax' && updated.targetRepsMin > value) updated.targetRepsMin = value;
        return updated;
      }),
    );
  }

  setTargetWeight(index: number, value: number | null): void {
    this.exercises.update((list) => list.map((row, i) => (i === index ? { ...row, targetWeight: value } : row)));
  }

  startCreateExercise(): void {
    this.creatingExercise.set(true);
  }

  cancelCreateExercise(): void {
    this.creatingExercise.set(false);
    this.newExerciseName.set('');
  }

  onNewExerciseNameInput(event: Event): void {
    this.newExerciseName.set((event.target as HTMLInputElement).value);
  }

  selectNewExerciseType(type: ExerciseType): void {
    this.newExerciseType.set(type);
  }

  selectNewExerciseInputType(inputType: InputType): void {
    this.newExerciseInputType.set(inputType);
  }

  confirmCreateExercise(): void {
    const name = this.newExerciseName().trim();
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
          this.newExerciseName.set('');
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
        targetRepsMin: e.targetRepsMin,
        targetRepsMax: e.targetRepsMax,
        targetWeight: e.targetWeight,
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

  askDeleteRoutine(): void {
    this.confirmDeleteRoutine.set(true);
  }

  cancelDeleteRoutine(): void {
    this.confirmDeleteRoutine.set(false);
  }

  confirmDeleteRoutineAction(): void {
    const id = this.routineId();
    if (!id) return;
    this.confirmDeleteRoutine.set(false);
    this.routineService.delete(id).subscribe({
      next: () => this.router.navigate(['/rutinas']),
      error: () => this.error.set('No se ha podido eliminar la rutina.'),
    });
  }
}
