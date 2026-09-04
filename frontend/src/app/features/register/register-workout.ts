import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { Accordion, AccordionContent, AccordionHeader, AccordionPanel } from 'primeng/accordion';
import { Dialog } from 'primeng/dialog';
import { ProgressBar } from 'primeng/progressbar';
import { ExerciseService } from '../../core/services/exercise.service';
import { SessionService } from '../../core/services/session.service';
import { RoutineService } from '../../core/services/routine.service';
import { Category, Exercise, ExerciseType, InputType } from '../../core/models/exercise.model';
import { SessionInput, SessionSet, WorkoutSession } from '../../core/models/session.model';
import { Routine } from '../../core/models/routine.model';
import { CATEGORY_COLOR, INPUT_TYPE_LABEL, sessionTypeLabel, TYPE_LABEL } from '../../core/models/labels';
import { effectiveInputType, formatSet, formatSets, relativeDayLabel } from '../../core/utils/format';
import { AddedExercise, SetEntry, WorkoutDraftStore } from '../../core/services/workout-draft.store';
import { youtubeEmbedUrl } from '../../core/utils/video';
import { NumberWheel } from '../../shared/components/number-wheel/number-wheel';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { ExerciseLoader } from '../../shared/components/exercise-loader/exercise-loader';
import { RoutineSelect } from '../../shared/components/routine-select/routine-select';
import { ExercisePicker } from '../../shared/components/exercise-picker/exercise-picker';
import { DatePickerPopover } from '../../shared/components/date-picker-popover/date-picker-popover';

interface LastSessionData {
  date: string;
  sets: SessionSet[];
  inputTypeOverride: InputType | null;
}

function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const WORSE_MESSAGES = [
  'Hoy ha costado un poco más, pero lo importante es seguir presentándote. ¡A por el próximo!',
  'No todos los días se rinde igual. Descansa bien y vuelve con más fuerza.',
  'Un entreno más flojo no borra todo tu progreso. ¡Sigue adelante!',
];

const EQUAL_MESSAGES = [
  '¡Buen trabajo! Has mantenido el nivel de tu último entreno.',
  'Constancia ante todo, eso también es progreso. ¡Gran entreno!',
  'Mismo nivel que la última vez. Sigue así de regular.',
];

const BETTER_MESSAGES = [
  'Has mejorado conforme al último entreno, ¡muy bien, sigue así!',
  'Más fuerte que la última vez. ¡Gran trabajo!',
  'Progreso real. ¡A por el siguiente reto!',
];

const FIRST_TIME_MESSAGES = ['¡Entreno registrado! A partir de ahora podrás ver aquí tu progreso.'];

function pickRandom(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}

@Component({
  selector: 'app-register-workout',
  imports: [
    NumberWheel,
    ConfirmDialog,
    ExerciseLoader,
    RoutineSelect,
    ExercisePicker,
    DatePickerPopover,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    Dialog,
    Accordion,
    AccordionPanel,
    AccordionHeader,
    AccordionContent,
    ProgressBar,
  ],
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly sanitizer = inject(DomSanitizer);

  readonly categoryColor = CATEGORY_COLOR;
  readonly typeLabel = TYPE_LABEL;
  readonly relativeDayLabel = relativeDayLabel;
  readonly effectiveInputType = effectiveInputType;
  readonly todayIso = isoDate(new Date());

  readonly catalog = signal<Exercise[]>([]);
  readonly routines = signal<Routine[]>([]);

  /* --- Calentamiento -------------------------------------------------------
     Vive en la rutina, no en el entreno: la hoja solo lo muestra. Si la sesión
     no viene de una rutina, no hay calentamiento que enseñar. */

  readonly selectedRoutine = computed(() => {
    const id = this.selectedRoutineId();
    return id ? (this.routines().find((r) => r.id === id) ?? null) : null;
  });

  readonly warmupDescription = computed(() => this.selectedRoutine()?.warmupDescription?.trim() || null);

  /** Sanitizada aquí y no en la plantilla: Angular exige un `SafeResourceUrl` en el `src` de un iframe. */
  readonly warmupEmbedUrl = computed(() => {
    const embed = youtubeEmbedUrl(this.selectedRoutine()?.warmupVideoUrl);
    return embed ? this.sanitizer.bypassSecurityTrustResourceUrl(embed) : null;
  });

  readonly hasWarmup = computed(() => !!this.warmupDescription() || !!this.warmupEmbedUrl());

  readonly warmupOpen = signal(false);
  readonly loadingRoutines = signal(true);
  readonly loadingDay = signal(false);
  readonly added = this.draft.added;
  readonly selectedDate = this.draft.selectedDate;
  readonly selectedRoutineId = this.draft.selectedRoutineId;
  readonly editingSessionId = this.draft.editingSessionId;
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly saveError = signal(false);
  readonly savedSummary = signal('');
  readonly comparisonMessage = signal('');
  readonly shareCopied = signal(false);
  readonly showReminder = signal(false);
  readonly reminderDismissed = signal(false);
  readonly pendingRoutine = signal<Routine | null>(null);
  readonly pendingDate = signal<string | null>(null);
  readonly showDateConfirm = signal(false);
  /** Índice del ejercicio cuya nota se está escribiendo, y el texto en curso. */
  readonly noteEditIndex = signal<number | null>(null);
  readonly noteDraft = signal('');

  /** Ejercicio cuyo cambio de modo EMOM está pendiente de confirmar. */
  readonly emomConfirmIndex = signal<number | null>(null);

  /** Ejercicio pendiente de que se confirme su salida de la hoja. */
  readonly removeConfirmIndex = signal<number | null>(null);

  /** Aviso previo al guardado cuando quedan ejercicios sin marcar como completados. */
  readonly showPendingConfirm = signal(false);

  /** Ejercicio cuya descripción o vídeo se está consultando. */
  readonly detailIndex = signal<number | null>(null);

  /* --- Alta de un ejercicio que no está en el catálogo ------------------------
     Se abre desde el propio buscador, que es donde el usuario descubre que le
     falta. Al crearlo se añade a la hoja directamente. */
  readonly creatingExercise = signal(false);
  readonly newExerciseName = signal('');
  readonly newExerciseCategory = signal<Category>('gym');
  readonly newExerciseType = signal<ExerciseType>('empuje');
  readonly newExerciseInputType = signal<InputType>('peso');
  readonly creatingExerciseError = signal<string | null>(null);
  readonly savingExercise = signal(false);

  readonly exerciseTypes: ExerciseType[] = ['empuje', 'tiron', 'pierna', 'core', 'cardio'];
  readonly inputTypes: InputType[] = ['peso', 'reps', 'tiempo', 'min', 'emom'];
  readonly inputTypeLabel = INPUT_TYPE_LABEL;

  readonly canCreateExercise = computed(
    () => this.newExerciseName().trim().length >= 2 && !this.savingExercise(),
  );

  startCreateExercise(): void {
    this.creatingExerciseError.set(null);
    this.creatingExercise.set(true);
  }

  cancelCreateExercise(): void {
    this.creatingExercise.set(false);
    this.newExerciseName.set('');
    this.creatingExerciseError.set(null);
  }

  onCreateVisibleChange(visible: boolean): void {
    if (!visible) this.cancelCreateExercise();
  }

  onNewExerciseNameInput(event: Event): void {
    this.newExerciseName.set((event.target as HTMLInputElement).value);
  }

  selectNewExerciseCategory(category: Category): void {
    this.newExerciseCategory.set(category);
  }

  selectNewExerciseType(type: ExerciseType): void {
    this.newExerciseType.set(type);
  }

  selectNewExerciseInputType(inputType: InputType): void {
    this.newExerciseInputType.set(inputType);
  }

  confirmCreateExercise(): void {
    if (!this.canCreateExercise()) return;
    this.savingExercise.set(true);
    this.creatingExerciseError.set(null);
    this.exerciseService
      .create({
        name: this.newExerciseName().trim(),
        category: this.newExerciseCategory(),
        type: this.newExerciseType(),
        inputType: this.newExerciseInputType(),
      })
      .subscribe({
        next: (exercise) => {
          this.catalog.update((list) => [...list, exercise].sort((a, b) => a.name.localeCompare(b.name, 'es')));
          this.addExercise(exercise);
          this.savingExercise.set(false);
          this.creatingExercise.set(false);
          this.newExerciseName.set('');
        },
        error: () => {
          this.savingExercise.set(false);
          this.creatingExerciseError.set('No se ha podido crear. Puede que ya exista un ejercicio con ese nombre.');
        },
      });
  }

  /**
   * Ejercicio abierto en el acordeón. Solo uno a la vez: abrir el siguiente
   * cierra el anterior, que es como se entrena —de un ejercicio al siguiente—
   * y evita tener que buscar dónde estabas en una lista desplegada entera.
   */
  readonly openPanel = signal<string | undefined>(undefined);

  /** El calendario emergente vive en su propio componente; aquí solo se abre y se cierra. */
  readonly showDatePicker = signal(false);

  readonly canShareNative = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  readonly lastData = signal<Record<string, LastSessionData | null>>({});

  readonly addedIds = computed(() => this.added().map((a) => a.exercise.id));

  readonly searchPlaceholder = computed(() =>
    this.added().length > 0 ? 'Añadir ejercicio adicional…' : 'Buscar ejercicio…',
  );

  readonly totalSeries = computed(() => this.added().reduce((total, a) => total + a.sets.length, 0));

  /**
   * Número de columnas de la hoja: la serie más larga de todo el entreno. Todos
   * los ejercicios comparten la misma retícula aunque hagan menos series, que es
   * lo que permite leer la hoja en vertical, columna a columna, igual que la de
   * papel del gimnasio.
   */
  readonly maxSets = computed(() => this.added().reduce((max, a) => Math.max(max, a.sets.length), 1));

  readonly setColumns = computed(() => Array.from({ length: this.maxSets() }, (_, i) => i));

  readonly completedCount = computed(() => this.added().filter((a) => a.completed).length);

  /** Ejercicios que siguen sin marcar. Alimenta la barra y el aviso al guardar. */
  readonly pendingExercises = computed(() => this.added().filter((a) => !a.completed));

  /** 0–100 para el p-progressbar. Con la hoja vacía no hay nada que medir. */
  readonly progressValue = computed(() => {
    const total = this.added().length;
    return total === 0 ? 0 : Math.round((this.completedCount() / total) * 100);
  });

  readonly selectedDateLabel = computed(() => {
    const iso = this.selectedDate() ?? this.todayIso;
    if (iso === this.todayIso) return 'Hoy';
    const label = new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  });




  readonly shareText = computed(() => {
    const added = this.added();
    if (!added.length) return '';
    const date = this.selectedDate() ?? this.todayIso;
    const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const capitalized = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
    const type = sessionTypeLabel(added.map((a) => a.exercise.type));
    const lines = added.map((a) => `${a.exercise.name}: ${formatSets(a.sets, effectiveInputType(a))}`);
    return `💪 Entreno · ${capitalized} (${type})\n\n${lines.join('\n')}\n\n— Light Weight`;
  });

  constructor() {
    this.exerciseService.getAll().subscribe((list) => this.catalog.set(list));
    this.routineService.getAll().subscribe({
      next: (list) => {
        this.routines.set(list);
        this.loadingRoutines.set(false);
      },
      error: () => this.loadingRoutines.set(false),
    });
    if (!this.selectedDate()) {
      this.selectedDate.set(this.todayIso);
    }
    const initialDate = this.selectedDate();
    const pendingEditDate = this.draft.pendingEditDate();
    this.draft.pendingEditDate.set(null);
    // Para hoy, solo se carga el entreno ya guardado si se llegó con intención
    // explícita de editar (botón "Editar" de Historial/Inicio) — de lo
    // contrario, entrar a Registrar para hoy siempre parte de cero, aunque ya
    // exista un entreno guardado. Para cualquier otra fecha, sí se carga
    // siempre (no hay otra forma de "empezar de cero" en un día pasado).
    const shouldLoad = initialDate !== this.todayIso || pendingEditDate === initialDate;
    if (initialDate && this.added().length === 0 && shouldLoad) {
      this.loadSessionForDate(initialDate);
    }
    this.fetchLastSessions(this.added().map((a) => a.exercise.id));

    const reminderId = setInterval(() => {
      if (this.added().length > 0 && !this.saved() && !this.saving() && !this.reminderDismissed()) {
        this.showReminder.set(true);
      }
    }, 45_000);
    this.destroyRef.onDestroy(() => clearInterval(reminderId));
  }

  closeReminder(): void {
    this.showReminder.set(false);
    this.reminderDismissed.set(true);
  }

  addExercise(exercise: Exercise): void {
    this.added.update((list) => [...list, { exercise, sets: [this.defaultSet(exercise.inputType)] }]);
    // El ejercicio recién añadido es el que se va a rellenar: se abre él.
    this.openPanel.set(exercise.id);
    this.fetchLastSession(exercise.id);
  }

  /**
   * Marca o desmarca el ejercicio como hecho. Tiñe la tarjeta y alimenta la barra de progreso.
   *
   * Al marcarlo se cierra el acordeón: el ejercicio ya está hecho, y dejarlo
   * abierto obliga a plegarlo a mano antes de llegar al siguiente. Al desmarcarlo
   * no se reabre nada, porque quien desmarca suele querer seguir mirando la ficha.
   */
  toggleComplete(index: number): void {
    const willComplete = !this.added()[index]?.completed;
    this.added.update((list) => list.map((a, i) => (i === index ? { ...a, completed: !a.completed } : a)));
    if (willComplete && this.openPanel() === this.added()[index]?.exercise.id) {
      this.openPanel.set(undefined);
    }
  }

  openWarmup(): void {
    this.warmupOpen.set(true);
  }

  closeWarmup(): void {
    this.warmupOpen.set(false);
  }

  onWarmupVisibleChange(visible: boolean): void {
    this.warmupOpen.set(visible);
  }

  openDetail(index: number): void {
    this.detailIndex.set(index);
  }

  closeDetail(): void {
    this.detailIndex.set(null);
  }

  onDetailVisibleChange(visible: boolean): void {
    if (!visible) this.closeDetail();
  }

  /** "90 s", "1 min", "1 min 30 s". Null cuando la rutina no fija descanso. */
  restLabel(item: AddedExercise): string | null {
    const total = item.restSeconds;
    if (total === null || total === undefined || total <= 0) return null;
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    if (!minutes) return `${seconds} s`;
    if (!seconds) return `${minutes} min`;
    return `${minutes} min ${seconds} s`;
  }

  /**
   * Sacar un ejercicio se lleva con él las series ya escritas y no hay deshacer,
   * así que se pregunta antes.
   */
  askRemoveExercise(index: number): void {
    this.removeConfirmIndex.set(index);
  }

  cancelRemoveExercise(): void {
    this.removeConfirmIndex.set(null);
  }

  confirmRemoveExercise(): void {
    const index = this.removeConfirmIndex();
    if (index === null) return;
    this.removeConfirmIndex.set(null);
    this.removeExercise(index);
  }

  /** Nombre del ejercicio pendiente de quitar, para nombrarlo en el modal. */
  readonly removeConfirmName = computed(() => {
    const index = this.removeConfirmIndex();
    if (index === null) return '';
    return this.added()[index]?.exercise.name ?? '';
  });

  removeExercise(index: number): void {
    this.added.update((list) => list.filter((_, i) => i !== index));
  }

  onDrop(event: CdkDragDrop<AddedExercise[]>): void {
    this.added.update((list) => {
      const copy = [...list];
      moveItemInArray(copy, event.previousIndex, event.currentIndex);
      return copy;
    });
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

  setValue(exIndex: number, setIndex: number, field: 'weight' | 'reps' | 'time', value: number | null): void {
    this.added.update((list) =>
      list.map((a, i) => {
        if (i !== exIndex) return a;
        return { ...a, sets: a.sets.map((s, j) => (j === setIndex ? { ...s, [field]: value ?? undefined } : s)) };
      }),
    );
  }

  /** Solo tiene sentido alternar a modo EMOM en ejercicios de peso/reps; tiempo, cardio y EMOM ya tienen su propio modo. */
  canToggleEmom(item: AddedExercise): boolean {
    return item.exercise.inputType === 'peso' || item.exercise.inputType === 'reps';
  }

  /** Pide confirmación antes de cambiar de modo: al hacerlo se descartan las series ya escritas. */
  askToggleEmom(index: number): void {
    this.emomConfirmIndex.set(index);
  }

  cancelToggleEmom(): void {
    this.emomConfirmIndex.set(null);
  }

  confirmToggleEmom(): void {
    const index = this.emomConfirmIndex();
    if (index === null) return;
    this.emomConfirmIndex.set(null);
    this.toggleEmom(index);
  }

  /** True si el ejercicio pendiente de confirmar va a ENTRAR en modo EMOM. */
  readonly emomTurningOn = computed(() => {
    const index = this.emomConfirmIndex();
    if (index === null) return false;
    return this.added()[index]?.inputTypeOverride !== 'emom';
  });

  /** Explica qué es un EMOM antes de cambiar de modo, porque el cambio borra las series. */
  readonly emomMessage = computed(() =>
    this.emomTurningOn()
      ? 'EMOM (every minute on the minute) es entrenar por minutos: cada minuto empiezas una tanda de ' +
        'repeticiones y descansas lo que sobre hasta el siguiente. Este ejercicio pasará a medirse en minutos ' +
        'y repeticiones por minuto, y se descartarán las series que ya hayas escrito.'
      : 'Este ejercicio volverá a medirse como de costumbre y se descartarán las series que ya hayas escrito.',
  );

  /** Lista los ejercicios sin marcar, que es lo que el aviso previo al guardado tiene que decir. */
  readonly pendingMessage = computed(() => {
    const names = this.pendingExercises().map((a) => a.exercise.name);
    if (!names.length) return '';
    const list = names.join(', ');
    return names.length === 1
      ? `Todavía no has marcado ${list} como completado. Puedes guardar el entreno igualmente, pero se quedará a medias.`
      : `Todavía no has marcado como completados estos ${names.length} ejercicios: ${list}. Puedes guardar el ` +
        'entreno igualmente, pero se quedará a medias.';
  });

  /** Activa/desactiva el modo EMOM solo para este entreno, sin cambiar el inputType del ejercicio en el catálogo. */
  toggleEmom(index: number): void {
    this.added.update((list) =>
      list.map((a, i) => {
        if (i !== index) return a;
        const nextOverride: InputType | null = a.inputTypeOverride === 'emom' ? null : 'emom';
        const nextType = nextOverride ?? a.exercise.inputType;
        return { ...a, inputTypeOverride: nextOverride, sets: [this.defaultSet(nextType, a.targetRepsMin)] };
      }),
    );
  }

  openNoteEditor(index: number): void {
    this.noteDraft.set(this.added()[index]?.note ?? '');
    this.noteEditIndex.set(index);
  }

  onNoteDraftInput(event: Event): void {
    this.noteDraft.set((event.target as HTMLTextAreaElement).value);
  }

  /** La nota viaja con el ejercicio de este entreno, así que se guarda en el borrador. */
  saveNote(): void {
    const index = this.noteEditIndex();
    if (index === null) return;
    const text = this.noteDraft().trim();
    this.added.update((list) => list.map((a, i) => (i === index ? { ...a, note: text || undefined } : a)));
    this.noteEditIndex.set(null);
  }

  closeNoteEditor(): void {
    this.noteEditIndex.set(null);
  }

  onNoteEditorVisibleChange(visible: boolean): void {
    if (!visible) this.closeNoteEditor();
  }

  /**
   * Lo que la rutina pide para este ejercicio, un dato por chip: p. ej.
   * ["8-12 reps", "RIR 2", "4 series"].
   *
   * No incluye el grupo muscular: eso ya lo dicen los chips de «Principales»
   * justo debajo, y repetirlo junto al título era la misma información dos
   * veces en la misma tarjeta.
   */
  planChips(item: AddedExercise): string[] {
    const chips: string[] = [];
    if (item.targetRepsMin !== undefined && item.targetRepsMax !== undefined) {
      if (item.exercise.inputType === 'min') {
        const total = item.targetRepsMin;
        const h = Math.floor(total / 60);
        const m = total % 60;
        chips.push(h > 0 ? (m > 0 ? `${h}h ${m}min` : `${h}h`) : `${m}min`);
      } else {
        const unit = item.exercise.inputType === 'tiempo' ? 'seg' : item.exercise.inputType === 'emom' ? 'rondas' : 'reps';
        if (item.targetRepsMin === item.targetRepsMax) {
          chips.push(`${item.targetRepsMin} ${unit}`);
        } else {
          chips.push(`${item.targetRepsMin}-${item.targetRepsMax} ${unit}`);
        }
      }
    }
    if (item.targetRIR !== undefined) chips.push(`RIR ${item.targetRIR}`);
    chips.push(`${item.sets.length} ${item.sets.length === 1 ? 'serie' : 'series'}`);
    return chips;
  }

  cardioHours(exIndex: number, setIndex: number): number {
    return Math.floor((this.added()[exIndex]?.sets[setIndex]?.time ?? 0) / 60);
  }

  cardioMins(exIndex: number, setIndex: number): number {
    return (this.added()[exIndex]?.sets[setIndex]?.time ?? 0) % 60;
  }

  setCardioHours(exIndex: number, setIndex: number, hours: number | null): void {
    this.setValue(exIndex, setIndex, 'time', (hours ?? 0) * 60 + this.cardioMins(exIndex, setIndex));
  }

  setCardioMins(exIndex: number, setIndex: number, mins: number | null): void {
    this.setValue(exIndex, setIndex, 'time', this.cardioHours(exIndex, setIndex) * 60 + (mins ?? 0));
  }

  onRoutineChanged(id: string | null): void {
    if (!id) { this.clearRoutine(); return; }
    const routine = this.routines().find((r) => r.id === id);
    if (routine) this.selectRoutine(routine);
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
    const added: AddedExercise[] = routine.exercises.map((re) => ({
      exercise: re.exercise,
      sets: Array.from({ length: re.targetSets }, () => this.emptySet()),
      targetRepsMin: re.targetRepsMin,
      targetRepsMax: re.targetRepsMax,
      targetRIR: re.targetRIR ?? undefined,
      note: re.note ?? undefined,
      description: re.description,
      videoUrl: re.videoUrl,
      restSeconds: re.restSeconds,
    }));
    this.added.set(added);
    this.openPanel.set(added[0]?.exercise.id);
    this.selectedRoutineId.set(routine.id);
    this.editingSessionId.set(null);
    this.fetchLastSessions(added.map((item) => item.exercise.id));
  }

  goToToday(): void {
    this.applyDateChange(this.todayIso);
  }

  /** El calendario emergente ha devuelto un día: se cierra y se aplica el cambio. */
  onDatePicked(iso: string): void {
    this.showDatePicker.set(false);
    this.onDatePick(iso);
  }

  onDatePick(iso: string): void {
    if (!iso || iso === (this.selectedDate() ?? this.todayIso)) return;
    if (this.added().length > 0) {
      this.pendingDate.set(iso);
      return;
    }
    this.applyDateChange(iso);
  }

  confirmDateChange(): void {
    const date = this.pendingDate();
    if (!date) return;
    this.pendingDate.set(null);
    this.applyDateChange(date);
  }

  cancelDateChange(): void {
    this.pendingDate.set(null);
  }

  private applyDateChange(iso: string): void {
    this.added.set([]);
    this.selectedRoutineId.set(null);
    this.editingSessionId.set(null);
    this.selectedDate.set(iso);
    this.loadSessionForDate(iso);
  }

  /** Descarta la edición en curso y deja una pantalla en blanco para esta fecha. */
  cancelEdit(): void {
    this.draft.reset();
  }

  save(): void {
    if (!this.added().length || this.saving()) return;
    // Primero lo que se puede haber olvidado, después la fecha: si quedan
    // ejercicios sin marcar, lo más probable es que el entreno no haya terminado.
    if (this.pendingExercises().length > 0) {
      this.showPendingConfirm.set(true);
      return;
    }
    this.continueSave();
  }

  confirmPending(): void {
    this.showPendingConfirm.set(false);
    this.continueSave();
  }

  cancelPending(): void {
    this.showPendingConfirm.set(false);
  }

  private continueSave(): void {
    const date = this.selectedDate() ?? this.todayIso;
    if (date !== this.todayIso) {
      this.showDateConfirm.set(true);
      return;
    }
    this.doSave();
  }

  confirmSaveDate(): void {
    this.showDateConfirm.set(false);
    this.doSave();
  }

  cancelSaveDate(): void {
    this.showDateConfirm.set(false);
  }

  closeSaved(): void {
    this.saved.set(false);
    this.shareCopied.set(false);
    const wasToday = (this.selectedDate() ?? this.todayIso) === this.todayIso;
    this.editingSessionId.set(null);
    if (wasToday) {
      this.draft.reset();
      return;
    }
    this.selectedDate.set(this.todayIso);
    this.added.set([]);
    this.selectedRoutineId.set(null);
  }

  goHistorial(): void {
    this.closeSaved();
    this.router.navigate(['/historial']);
  }

  async shareNative(): Promise<void> {
    try {
      await navigator.share({ text: this.shareText() });
    } catch {
      // el usuario canceló o el navegador no soporta el share nativo
    }
  }

  shareWhatsapp(): void {
    window.open(`https://wa.me/?text=${encodeURIComponent(this.shareText())}`, '_blank');
  }

  async copyShareText(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.shareText());
      this.shareCopied.set(true);
      setTimeout(() => this.shareCopied.set(false), 2000);
    } catch {
      // clipboard no disponible
    }
  }

  /**
   * Valor de esa misma serie el último día que se hizo el ejercicio. Es lo que
   * el usuario compara mentalmente entre serie y serie; puesto en la misma
   * columna, la comparación deja de necesitar memoria.
   */
  lastSetValue(item: AddedExercise, setIndex: number): string | null {
    const data = this.lastData()[item.exercise.id];
    const set = data?.sets[setIndex];
    if (!set) return null;
    return formatSet(set, data.inputTypeOverride ?? item.exercise.inputType);
  }

  lastWhen(item: AddedExercise): string | null {
    const data = this.lastData()[item.exercise.id];
    return data ? relativeDayLabel(data.date) : null;
  }

  lastSummary(item: AddedExercise): { sets: string; when: string } | null {
    const data = this.lastData()[item.exercise.id];
    if (!data) return null;
    return {
      sets: formatSets(data.sets, data.inputTypeOverride ?? item.exercise.inputType),
      when: relativeDayLabel(data.date),
    };
  }

  private doSave(): void {
    const added = this.added();
    const date = this.selectedDate() ?? this.todayIso;

    const input: SessionInput = {
      date,
      category: added[0].exercise.category,
      type: added[0].exercise.type,
      routineId: this.selectedRoutineId(),
      exercises: added.map((a) => ({
        exerciseId: a.exercise.id,
        note: a.note ?? null,
        inputTypeOverride: a.inputTypeOverride ?? null,
        sets: a.sets.map((s, i) => ({
          setNumber: i + 1,
          weight: s.weight ?? null,
          reps: s.reps ?? null,
          time: s.time ?? null,
        })),
      })),
    };

    this.saving.set(true);
    this.saveError.set(false);
    const editingId = this.editingSessionId();
    const request = editingId ? this.sessionService.update(editingId, input) : this.sessionService.create(input);
    request.subscribe({
      next: () => {
        const series = this.totalSeries();
        this.savedSummary.set(series === 1 ? '1 serie guardada' : `${series} series guardadas`);
        this.comparisonMessage.set(pickRandom(this.comparisonPool()));
        this.saving.set(false);
        this.saved.set(true);
        this.showReminder.set(false);
        this.reminderDismissed.set(false);
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set(true);
      },
    });
  }

  private loadSessionForDate(iso: string): void {
    this.loadingDay.set(true);
    this.sessionService.getByDate(iso).subscribe({
      next: (session) => {
        this.editingSessionId.set(session.id);
        this.selectedRoutineId.set(session.routineId ?? null);
        this.added.set(
          session.exercises.map((e) => ({
            exercise: e.exercise,
            inputTypeOverride: e.inputTypeOverride,
            // La nota es del ejercicio dentro de este entreno: sin arrastrarla, editar
            // un entreno pasado y volver a guardarlo la borraría.
            note: e.note ?? undefined,
            // Un entreno ya guardado está hecho por definición; así la barra de
            // progreso no aparece a cero y el guardado no avisa de pendientes.
            completed: true,
            sets: e.sets.map((s) => ({
              weight: s.weight ?? undefined,
              reps: s.reps ?? undefined,
              time: s.time ?? undefined,
            })),
          })),
        );
        this.openPanel.set(this.added()[0]?.exercise.id);
        this.loadingDay.set(false);
        this.fetchLastSessions(this.added().map((item) => item.exercise.id));
      },
      error: () => {
        this.editingSessionId.set(null);
        this.selectedRoutineId.set(null);
        this.added.set([]);
        this.loadingDay.set(false);
      },
    });
  }

  private comparisonPool(): string[] {
    const lastData = this.lastData();
    let delta = 0;
    let comparisons = 0;

    for (const item of this.added()) {
      const last = lastData[item.exercise.id];
      if (!last) continue;
      comparisons++;
      const todayScore = this.exerciseScore(effectiveInputType(item), item.sets);
      const lastScore = this.exerciseScore(last.inputTypeOverride ?? item.exercise.inputType, last.sets);
      if (todayScore > lastScore) delta++;
      else if (todayScore < lastScore) delta--;
    }

    if (comparisons === 0) return FIRST_TIME_MESSAGES;
    if (delta > 0) return BETTER_MESSAGES;
    if (delta < 0) return WORSE_MESSAGES;
    return EQUAL_MESSAGES;
  }

  private exerciseScore(
    inputType: InputType,
    sets: { weight?: number | null; reps?: number | null; time?: number | null }[],
  ): number {
    if (inputType === 'peso') return sets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);
    if (inputType === 'reps') return sets.reduce((sum, s) => sum + (s.reps ?? 0), 0);
    if (inputType === 'emom') return sets.reduce((sum, s) => sum + (s.time ?? 0) * (s.reps ?? 0), 0);
    return sets.reduce((sum, s) => sum + (s.time ?? 0), 0);
  }

  private fetchLastSession(exerciseId: string): void {
    if (this.lastData()[exerciseId] !== undefined) return;
    this.sessionService.getAll({ exerciseId, limit: 1 }).subscribe((sessions) => {
      const session = sessions[0];
      const sessionExercise = session?.exercises.find((e) => e.exerciseId === exerciseId);
      const data =
        session && sessionExercise
          ? { date: session.date, sets: sessionExercise.sets, inputTypeOverride: sessionExercise.inputTypeOverride }
          : null;
      this.lastData.update((m) => ({ ...m, [exerciseId]: data }));
    });
  }

  /** Carga el último entreno de varios ejercicios en una sola petición. */
  private fetchLastSessions(exerciseIds: string[]): void {
    const pending = [...new Set(exerciseIds)].filter((id) => this.lastData()[id] === undefined);
    if (!pending.length) return;
    this.sessionService.getLastByExercises(pending).subscribe((map) => {
      this.lastData.update((m) => ({ ...m, ...map }));
    });
  }

  private defaultSet(inputType: InputType, targetReps?: number): SetEntry {
    if (inputType === 'peso') return { weight: 40, reps: targetReps ?? 8 };
    if (inputType === 'reps') return { reps: targetReps ?? 10, weight: 0 };
    if (inputType === 'emom') return { time: 10, reps: targetReps ?? 8 };
    if (inputType === 'min') return { time: targetReps ?? 30 };
    return { time: targetReps ?? 30, weight: 0 };
  }

  private emptySet(): SetEntry {
    return {};
  }
}
