import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ExerciseService } from '../../core/services/exercise.service';
import { SessionService } from '../../core/services/session.service';
import { RoutineService } from '../../core/services/routine.service';
import { Exercise, InputType } from '../../core/models/exercise.model';
import { SessionInput, SessionSet } from '../../core/models/session.model';
import { Routine } from '../../core/models/routine.model';
import { CATEGORY_COLOR, sessionTypeLabel, TYPE_LABEL } from '../../core/models/labels';
import { formatSet, formatSets, relativeDayLabel } from '../../core/utils/format';
import { AddedExercise, SetEntry, WorkoutDraftStore } from '../../core/services/workout-draft.store';
import { NumberWheel } from '../../shared/components/number-wheel/number-wheel';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { ExerciseLoader } from '../../shared/components/exercise-loader/exercise-loader';

interface LastSessionData {
  date: string;
  sets: SessionSet[];
}

interface DayCell {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
}

const WEEKDAY_HEADERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
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
  imports: [NumberWheel, ConfirmDialog, ExerciseLoader],
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

  readonly categoryColor = CATEGORY_COLOR;
  readonly typeLabel = TYPE_LABEL;
  readonly relativeDayLabel = relativeDayLabel;
  readonly weekdayHeaders = WEEKDAY_HEADERS;
  readonly todayIso = isoDate(new Date());

  readonly catalog = signal<Exercise[]>([]);
  readonly routines = signal<Routine[]>([]);
  readonly loadingRoutines = signal(true);
  readonly loadingDay = signal(false);
  readonly search = this.draft.search;
  readonly added = this.draft.added;
  readonly selectedDate = this.draft.selectedDate;
  readonly selectedRoutineId = this.draft.selectedRoutineId;
  readonly editingSessionId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly saveError = signal(false);
  readonly savedSummary = signal('');
  readonly comparisonMessage = signal('');
  readonly shareCopied = signal(false);
  readonly showReminder = signal(false);
  readonly reminderDismissed = signal(false);
  readonly pendingRoutine = signal<Routine | null>(null);
  readonly showCalendar = signal(false);
  readonly showDateConfirm = signal(false);
  readonly calendarMonth = signal(startOfMonth(new Date()));

  readonly canShareNative = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  readonly lastData = signal<Record<string, LastSessionData | null>>({});

  private todaySnapshot: { added: AddedExercise[]; routineId: string | null } | null = null;

  readonly searchResults = computed(() => {
    const q = this.search().trim().toLowerCase();
    const addedIds = new Set(this.added().map((a) => a.exercise.id));
    return this.catalog()
      .filter((e) => !addedIds.has(e.id) && (q === '' || e.name.toLowerCase().includes(q)))
      .slice(0, 5);
  });

  readonly showResults = computed(() => this.search().trim() !== '' && this.searchResults().length > 0);

  readonly searchPlaceholder = computed(() =>
    this.added().length > 0 ? 'Añadir ejercicio adicional…' : 'Buscar ejercicio…',
  );

  readonly totalSeries = computed(() => this.added().reduce((total, a) => total + a.sets.length, 0));

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

  readonly calendarMonthLabel = computed(() => {
    const label = this.calendarMonth().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  });

  readonly canNextMonth = computed(() => {
    const m = this.calendarMonth();
    const now = startOfMonth(new Date());
    return (
      m.getFullYear() < now.getFullYear() || (m.getFullYear() === now.getFullYear() && m.getMonth() < now.getMonth())
    );
  });

  readonly calendarWeeks = computed<DayCell[][]>(() => {
    const month = this.calendarMonth();
    const today = this.todayIso;
    const firstWeekday = (month.getDay() + 6) % 7; // Lunes = 0
    const gridStart = new Date(month);
    gridStart.setDate(gridStart.getDate() - firstWeekday);

    const cells: DayCell[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(d.getDate() + i);
      const iso = isoDate(d);
      cells.push({
        iso,
        day: d.getDate(),
        inMonth: d.getMonth() === month.getMonth(),
        isToday: iso === today,
        isFuture: iso > today,
      });
    }

    const weeks: DayCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    while (weeks.length > 4 && weeks[weeks.length - 1].every((c) => !c.inMonth)) weeks.pop();
    return weeks;
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
    const lines = added.map((a) => `${a.exercise.name}: ${formatSets(a.sets, a.exercise.inputType)}`);
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

  setValue(exIndex: number, setIndex: number, field: 'weight' | 'reps' | 'time', value: number | null): void {
    this.added.update((list) =>
      list.map((a, i) => {
        if (i !== exIndex) return a;
        return { ...a, sets: a.sets.map((s, j) => (j === setIndex ? { ...s, [field]: value ?? undefined } : s)) };
      }),
    );
  }

  /** Grupo muscular y rango objetivo de la rutina, p. ej. "Pecho · 8-12 reps". */
  exerciseInfo(item: AddedExercise): string {
    const parts: string[] = [];
    if (item.exercise.muscleGroup) parts.push(item.exercise.muscleGroup);
    if (item.targetRepsMin !== undefined && item.targetRepsMax !== undefined) {
      if (item.exercise.inputType === 'min') {
        const total = item.targetRepsMin;
        const h = Math.floor(total / 60);
        const m = total % 60;
        parts.push(h > 0 ? (m > 0 ? `${h}h ${m}min` : `${h}h`) : `${m}min`);
      } else {
        const unit = item.exercise.inputType === 'tiempo' ? 'seg' : item.exercise.inputType === 'emom' ? 'rondas' : 'reps';
        if (item.targetRepsMin === item.targetRepsMax) {
          parts.push(`${item.targetRepsMin} ${unit}`);
        } else {
          parts.push(`min: ${item.targetRepsMin} - max: ${item.targetRepsMax} ${unit}`);
        }
      }
    }
    return parts.join(' · ');
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

  onRoutineChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (!value) { this.clearRoutine(); return; }
    const routine = this.routines().find((r) => r.id === value);
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
    }));
    this.added.set(added);
    this.selectedRoutineId.set(routine.id);
    this.editingSessionId.set(null);
    this.search.set('');
    this.fetchLastSessions(added.map((item) => item.exercise.id));
  }

  openCalendar(): void {
    this.calendarMonth.set(startOfMonth(new Date(`${this.selectedDate() ?? this.todayIso}T00:00:00`)));
    this.showCalendar.set(true);
  }

  closeCalendar(): void {
    this.showCalendar.set(false);
  }

  prevCalendarMonth(): void {
    const d = new Date(this.calendarMonth());
    d.setMonth(d.getMonth() - 1);
    this.calendarMonth.set(d);
  }

  nextCalendarMonth(): void {
    if (!this.canNextMonth()) return;
    const d = new Date(this.calendarMonth());
    d.setMonth(d.getMonth() + 1);
    this.calendarMonth.set(d);
  }

  pickDate(iso: string): void {
    if (iso > this.todayIso) return;
    this.showCalendar.set(false);
    if (iso === this.selectedDate()) return;

    const wasToday = (this.selectedDate() ?? this.todayIso) === this.todayIso && this.editingSessionId() === null;
    if (wasToday) {
      this.todaySnapshot = { added: this.added(), routineId: this.selectedRoutineId() };
    }

    if (iso === this.todayIso && this.todaySnapshot) {
      this.selectedDate.set(iso);
      this.added.set(this.todaySnapshot.added);
      this.selectedRoutineId.set(this.todaySnapshot.routineId);
      this.editingSessionId.set(null);
      this.todaySnapshot = null;
      this.fetchLastSessions(this.added().map((item) => item.exercise.id));
      return;
    }

    this.selectedDate.set(iso);
    this.loadSessionForDate(iso);
  }

  save(): void {
    if (!this.added().length || this.saving()) return;
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
    if (this.todaySnapshot) {
      this.added.set(this.todaySnapshot.added);
      this.selectedRoutineId.set(this.todaySnapshot.routineId);
      this.todaySnapshot = null;
    } else {
      this.added.set([]);
      this.selectedRoutineId.set(null);
    }
    this.search.set('');
  }

  goHistorial(): void {
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

  lastSummary(item: AddedExercise): { sets: string; when: string } | null {
    const data = this.lastData()[item.exercise.id];
    if (!data) return null;
    return {
      sets: data.sets.map((s) => formatSet(s, item.exercise.inputType)).join(' · '),
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
    this.search.set('');
    this.sessionService.getByDate(iso).subscribe({
      next: (session) => {
        this.editingSessionId.set(session.id);
        this.selectedRoutineId.set(session.routineId ?? null);
        this.added.set(
          session.exercises.map((e) => ({
            exercise: e.exercise,
            sets: e.sets.map((s) => ({
              weight: s.weight ?? undefined,
              reps: s.reps ?? undefined,
              time: s.time ?? undefined,
            })),
          })),
        );
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
      const todayScore = this.exerciseScore(item.exercise.inputType, item.sets);
      const lastScore = this.exerciseScore(item.exercise.inputType, last.sets);
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
      const data = session && sessionExercise ? { date: session.date, sets: sessionExercise.sets } : null;
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
    return { time: targetReps ?? 30 };
  }

  private emptySet(): SetEntry {
    return {};
  }
}
