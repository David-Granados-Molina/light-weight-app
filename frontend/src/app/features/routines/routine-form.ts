import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { Dialog } from 'primeng/dialog';
import { ExerciseService } from '../../core/services/exercise.service';
import { RoutineService } from '../../core/services/routine.service';
import { AdminService } from '../../core/services/admin.service';
import { Category, Exercise, ExerciseType, InputType } from '../../core/models/exercise.model';
import { RoutineInput } from '../../core/models/routine.model';
import { CATEGORY_COLOR, INPUT_TYPE_LABEL, TYPE_LABEL } from '../../core/models/labels';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { ExerciseLoader } from '../../shared/components/exercise-loader/exercise-loader';
import { NumberWheel } from '../../shared/components/number-wheel/number-wheel';
import { ExercisePicker } from '../../shared/components/exercise-picker/exercise-picker';
import { parseVideoUrl, VIDEO_PROVIDER_LABEL, videoEmbedUrl } from '../../core/utils/video';

interface ExerciseRow {
  exerciseId: string;
  exercise: Exercise;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetWeight: number | null;
  targetRIR: number | null;
  /** Consejos para quien vaya a seguir la rutina. */
  description: string;
  /** Enlace a un vídeo que muestra la ejecución. */
  videoUrl: string;
  /** Descanso entre series, en segundos. */
  restSeconds: number | null;
}

const EXERCISE_TYPES: ExerciseType[] = ['empuje', 'tiron', 'pierna', 'core', 'cardio'];
const INPUT_TYPES: InputType[] = ['peso', 'reps', 'tiempo', 'min', 'emom'];

@Component({
  selector: 'app-routine-form',
  imports: [RouterLink, CdkDropList, CdkDrag, CdkDragHandle, ConfirmDialog, NumberWheel, ExerciseLoader, ExercisePicker, Dialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './routine-form.html',
  styleUrl: './routine-form.css',
})
export class RoutineForm {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly routineService = inject(RoutineService);
  private readonly adminService = inject(AdminService);
  private readonly exerciseService = inject(ExerciseService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly categoryColor = CATEGORY_COLOR;
  readonly typeLabel = TYPE_LABEL;
  readonly inputTypeLabel = INPUT_TYPE_LABEL;
  readonly exerciseTypes = EXERCISE_TYPES;
  readonly inputTypes = INPUT_TYPES;

  readonly routineId = signal<string | null>(null);
  readonly isEdit = computed(() => this.routineId() !== null);

  /**
   * Dueño de la rutina cuando el admin edita la de otra persona. `null` es el
   * caso normal: la rutina es de quien está usando la aplicación.
   *
   * Es lo único que cambia entre los dos modos —la pantalla y las validaciones
   * son idénticas—, así que en vez de duplicar el formulario se elige aquí a qué
   * servicio se le habla.
   */
  readonly targetUserId = signal<string | null>(null);
  readonly targetUserName = signal<string | null>(null);
  readonly isForOther = computed(() => this.targetUserId() !== null);

  /** A dónde vuelve la pantalla al guardar, cancelar o borrar. */
  readonly backLink = computed(() =>
    this.isForOther() ? ['/amigos', this.targetUserId()!, 'rutinas'] : ['/rutinas'],
  );

  readonly backQueryParams = computed(() => (this.isForOther() ? { name: this.targetUserName() } : {}));

  readonly name = signal('');

  /* Calentamiento de la rutina entera: una explicación, un vídeo, o los dos. */
  readonly warmupDescription = signal('');
  readonly warmupVideoUrl = signal('');
  readonly warmupDialogOpen = signal(false);
  readonly hasWarmup = computed(() => !!this.warmupDescription().trim() || !!this.warmupVideoUrl().trim());

  readonly exercises = signal<ExerciseRow[]>([]);
  readonly catalog = signal<Exercise[]>([]);
  readonly saving = signal(false);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  // Category is auto-detected from exercises (majority wins)
  readonly category = computed<Category>(() => {
    const rows = this.exercises();
    if (!rows.length) return 'gym';
    const caliCount = rows.filter((r) => r.exercise.category === 'calistenia').length;
    return caliCount * 2 > rows.length ? 'calistenia' : 'gym';
  });

  readonly creatingExercise = signal(false);
  readonly newExerciseName = signal('');
  readonly newExerciseCategory = signal<Category>('gym');
  readonly newExerciseType = signal<ExerciseType>('empuje');
  readonly newExerciseInputType = signal<InputType>('peso');

  readonly removeIndex = signal<number | null>(null);
  readonly confirmDeleteRoutine = signal(false);
  readonly detailsDialogIndex = signal<number | null>(null);

  /**
   * Índice del ejercicio cuyo vídeo se está viendo. Se puede abrir desde la
   * propia fila, sin entrar en los detalles: al montar una rutina se comprueba
   * el vídeo de varios ejercicios seguidos, y abrir y cerrar una ficha entera
   * para cada uno es un paso de más.
   */
  readonly videoIndex = signal<number | null>(null);

  private readonly videoRef = computed(() => {
    const index = this.videoIndex();
    return index === null ? null : parseVideoUrl(this.exercises()[index]?.videoUrl);
  });

  /** Sanitizada aquí: Angular exige un `SafeResourceUrl` en el `src` de un iframe. */
  readonly videoEmbed = computed(() => {
    const ref = this.videoRef();
    return ref ? this.sanitizer.bypassSecurityTrustResourceUrl(ref.embedUrl) : null;
  });

  /** Vertical en TikTok e Instagram, apaisado en YouTube (ver `.lw-video`). */
  readonly videoPortrait = computed(() => {
    const provider = this.videoRef()?.provider;
    return provider === 'tiktok' || provider === 'instagram';
  });

  readonly videoProviderLabel = computed(() => {
    const provider = this.videoRef()?.provider;
    return provider ? VIDEO_PROVIDER_LABEL[provider] : null;
  });

  readonly videoRawUrl = computed(() => {
    const index = this.videoIndex();
    return index === null ? null : (this.exercises()[index]?.videoUrl ?? null);
  });

  readonly videoExerciseName = computed(() => {
    const index = this.videoIndex();
    return index === null ? '' : (this.exercises()[index]?.exercise.name ?? '');
  });

  readonly exerciseIds = computed(() => this.exercises().map((e) => e.exerciseId));

  readonly canSave = computed(
    () =>
      this.name().trim().length >= 2 &&
      this.exercises().length > 0 &&
      !this.saving() &&
      !this.hasInvalidVideo() &&
      !this.warmupVideoInvalid(),
  );

  constructor() {
    this.exerciseService.getAll().subscribe((list) => this.catalog.set(list));

    // Con `userId` en la ruta (/amigos/:userId/rutinas/...) el formulario opera
    // sobre la rutina de esa persona; sin él, sobre la de quien está dentro.
    const userId = this.route.snapshot.paramMap.get('userId');
    this.targetUserId.set(userId);
    this.targetUserName.set(this.route.snapshot.queryParamMap.get('name'));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.routineId.set(id);
      const load$ = userId ? this.adminService.getRoutine(userId, id) : this.routineService.getOne(id);
      load$.subscribe({
        next: (routine) => {
          this.name.set(routine.name);
          this.warmupDescription.set(routine.warmupDescription ?? '');
          this.warmupVideoUrl.set(routine.warmupVideoUrl ?? '');
          this.exercises.set(
            routine.exercises.map((e) => ({
              exerciseId: e.exerciseId,
              exercise: e.exercise,
              targetSets: e.targetSets,
              targetRepsMin: e.targetRepsMin,
              targetRepsMax: e.targetRepsMax,
              targetWeight: e.targetWeight,
              targetRIR: e.targetRIR,
              description: e.description ?? '',
              videoUrl: e.videoUrl ?? '',
              restSeconds: e.restSeconds ?? null,
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
        targetRIR: null,
        description: '',
        videoUrl: '',
        restSeconds: isCardio ? null : 90,
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

  showWeight(exercise: Exercise): boolean {
    if (exercise.inputType === 'min' || exercise.type === 'cardio') return false;
    return exercise.category === 'gym' || exercise.inputType === 'peso' || exercise.name.toLowerCase().includes('lastre');
  }

  isTimeExercise(exercise: Exercise): boolean {
    return exercise.inputType === 'tiempo' || exercise.inputType === 'min' || exercise.inputType === 'emom';
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

  setTargetRIR(index: number, value: number | null): void {
    this.exercises.update((list) => list.map((row, i) => (i === index ? { ...row, targetRIR: value } : row)));
  }

  setDescription(index: number, event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.exercises.update((list) => list.map((row, i) => (i === index ? { ...row, description: value } : row)));
  }

  setVideoUrl(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.exercises.update((list) => list.map((row, i) => (i === index ? { ...row, videoUrl: value } : row)));
  }

  /** El descanso se pide en minutos y segundos, pero se guarda en segundos. */
  restMinutes(index: number): number {
    return Math.floor((this.exercises()[index]?.restSeconds ?? 0) / 60);
  }

  restRemainderSeconds(index: number): number {
    return (this.exercises()[index]?.restSeconds ?? 0) % 60;
  }

  setRestMinutes(index: number, minutes: number | null): void {
    const total = (minutes ?? 0) * 60 + this.restRemainderSeconds(index);
    this.setRestSeconds(index, total);
  }

  setRestRemainderSeconds(index: number, seconds: number | null): void {
    const total = this.restMinutes(index) * 60 + (seconds ?? 0);
    this.setRestSeconds(index, total);
  }

  private setRestSeconds(index: number, total: number): void {
    this.exercises.update((list) =>
      list.map((row, i) => (i === index ? { ...row, restSeconds: total > 0 ? total : null } : row)),
    );
  }

  /** Un enlace vacío es válido; uno escrito a medias no, y avisarlo aquí evita un 400 al guardar. */
  videoUrlInvalid(index: number): boolean {
    const raw = this.exercises()[index]?.videoUrl?.trim();
    if (!raw) return false;
    try {
      const url = new URL(raw);
      return url.protocol !== 'http:' && url.protocol !== 'https:';
    } catch {
      return true;
    }
  }

  readonly hasInvalidVideo = computed(() =>
    this.exercises().some((row) => {
      const raw = row.videoUrl?.trim();
      if (!raw) return false;
      try {
        const url = new URL(raw);
        return url.protocol !== 'http:' && url.protocol !== 'https:';
      } catch {
        return true;
      }
    }),
  );

  openWarmupDialog(): void {
    this.warmupDialogOpen.set(true);
  }

  closeWarmupDialog(): void {
    this.warmupDialogOpen.set(false);
  }

  onWarmupDialogVisibleChange(visible: boolean): void {
    this.warmupDialogOpen.set(visible);
  }

  setWarmupDescription(event: Event): void {
    this.warmupDescription.set((event.target as HTMLTextAreaElement).value);
  }

  setWarmupVideoUrl(event: Event): void {
    this.warmupVideoUrl.set((event.target as HTMLInputElement).value);
  }

  /** Vacía el calentamiento de un gesto, sin tener que borrar los dos campos. */
  clearWarmup(): void {
    this.warmupDescription.set('');
    this.warmupVideoUrl.set('');
  }

  /**
   * El vídeo del calentamiento se incrusta en «Registrar», así que tiene que ser
   * de uno de los tres sitios que se saben incrustar; cualquier otro enlace se
   * avisa aquí y no al guardar.
   */
  readonly warmupVideoInvalid = computed(() => {
    const raw = this.warmupVideoUrl().trim();
    return !!raw && videoEmbedUrl(raw) === null;
  });

  openDetailsDialog(index: number): void {
    this.detailsDialogIndex.set(index);
  }

  openVideo(index: number): void {
    this.videoIndex.set(index);
  }

  closeVideo(): void {
    this.videoIndex.set(null);
  }

  onVideoDialogVisibleChange(visible: boolean): void {
    if (!visible) this.closeVideo();
  }

  closeDetailsDialog(): void {
    this.detailsDialogIndex.set(null);
  }

  onDetailsDialogVisibleChange(visible: boolean): void {
    if (!visible) this.closeDetailsDialog();
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

  selectNewExerciseCategory(cat: Category): void {
    this.newExerciseCategory.set(cat);
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
        category: this.newExerciseCategory(),
        type: this.newExerciseType(),
        inputType: this.newExerciseInputType(),
      })
      .subscribe({
        next: (exercise) => {
          this.catalog.update((list) => [...list, exercise]);
          this.addExercise(exercise);
          this.creatingExercise.set(false);
          this.newExerciseName.set('');
          this.newExerciseCategory.set('gym');
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
      warmupDescription: this.warmupDescription().trim() || null,
      warmupVideoUrl: this.warmupVideoUrl().trim() || null,
      exercises: this.exercises().map((e) => ({
        exerciseId: e.exerciseId,
        targetSets: e.targetSets,
        targetRepsMin: e.targetRepsMin,
        targetRepsMax: e.targetRepsMax,
        targetWeight: e.targetWeight,
        targetRIR: e.targetRIR,
        description: e.description.trim() || null,
        videoUrl: e.videoUrl.trim() || null,
        restSeconds: e.restSeconds,
      })),
    };

    this.saving.set(true);
    this.error.set(null);

    const userId = this.targetUserId();
    const routineId = this.routineId();
    const obs = userId
      ? routineId
        ? this.adminService.updateRoutine(userId, routineId, input)
        : this.adminService.createRoutine(userId, input)
      : routineId
        ? this.routineService.update(routineId, input)
        : this.routineService.create(input);

    obs.subscribe({
      next: () => this.goBack(),
      error: () => {
        this.saving.set(false);
        this.error.set('No se ha podido guardar la rutina.');
      },
    });
  }

  private goBack(): void {
    this.router.navigate(this.backLink(), { queryParams: this.backQueryParams() });
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

    const userId = this.targetUserId();
    const obs = userId ? this.adminService.deleteRoutine(userId, id) : this.routineService.delete(id);

    obs.subscribe({
      next: () => this.goBack(),
      error: () => this.error.set('No se ha podido eliminar la rutina.'),
    });
  }
}
