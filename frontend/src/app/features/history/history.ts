import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { SessionService } from '../../core/services/session.service';
import { Category } from '../../core/models/exercise.model';
import { WorkoutSession } from '../../core/models/session.model';
import { CATEGORY_COLOR, CATEGORY_LABEL, sessionTypeLabel } from '../../core/models/labels';
import { formatSets, relativeDayLabel } from '../../core/utils/format';
import { ExerciseLoader } from '../../shared/components/exercise-loader/exercise-loader';

type HistFilter = 'todos' | Category;
type DateMode = 'todos' | 'dia' | 'mes' | 'anio';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

@Component({
  selector: 'app-history',
  imports: [ExerciseLoader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './history.html',
  styleUrl: './history.css',
})
export class History {
  private readonly sessionService = inject(SessionService);

  readonly categoryColor = CATEGORY_COLOR;
  readonly categoryLabel = CATEGORY_LABEL;
  readonly relativeDayLabel = relativeDayLabel;
  readonly formatSets = formatSets;
  readonly todayIso = isoDate(new Date());

  readonly filter = signal<HistFilter>('todos');
  readonly search = signal('');
  readonly sessions = signal<WorkoutSession[]>([]);
  readonly loading = signal(true);
  readonly expandedId = signal<string | null>(null);

  readonly dateMode = signal<DateMode>('todos');
  readonly selectedDay = signal(this.todayIso);
  readonly selectedMonth = signal(new Date().getMonth());
  readonly selectedYear = signal(new Date().getFullYear());

  readonly filterChips: { key: HistFilter; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'gym', label: 'Gym' },
    { key: 'calistenia', label: 'Calistenia' },
  ];

  readonly dateModeChips: { key: DateMode; label: string }[] = [
    { key: 'todos', label: 'Todas las fechas' },
    { key: 'dia', label: 'Día' },
    { key: 'mes', label: 'Mes' },
    { key: 'anio', label: 'Año' },
  ];

  readonly months = MONTHS.map((label, value) => ({ value, label }));

  readonly years = computed(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => current - i);
  });

  readonly rows = computed(() =>
    this.sessions().map((s) => ({
      id: s.id,
      category: s.category,
      typeLabel: sessionTypeLabel(s.exercises.map((e) => e.exercise.type)),
      dateLabel: relativeDayLabel(s.date),
      exercisesText: s.exercises.map((e) => e.exercise.name).join(' · '),
      count: `${s.exercises.length} ejercicios`,
      exercises: s.exercises,
    })),
  );

  constructor() {
    this.load();
  }

  toggleExpand(id: string): void {
    this.expandedId.update((current) => (current === id ? null : id));
  }

  selectFilter(key: HistFilter): void {
    this.filter.set(key);
    this.load();
  }

  selectDateMode(key: DateMode): void {
    this.dateMode.set(key);
    this.load();
  }

  onDayInput(event: Event): void {
    this.selectedDay.set((event.target as HTMLInputElement).value);
    this.load();
  }

  onMonthInput(event: Event): void {
    this.selectedMonth.set(Number((event.target as HTMLSelectElement).value));
    this.load();
  }

  onYearInput(event: Event): void {
    this.selectedYear.set(Number((event.target as HTMLSelectElement).value));
    this.load();
  }

  onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
    this.load();
  }

  private dateRange(): { from?: string; to?: string } {
    const mode = this.dateMode();
    if (mode === 'dia') {
      const day = this.selectedDay();
      return { from: day, to: day };
    }
    if (mode === 'mes') {
      const y = this.selectedYear();
      const m = this.selectedMonth();
      const from = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m + 1, 0).getDate();
      const to = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return { from, to };
    }
    if (mode === 'anio') {
      const y = this.selectedYear();
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    }
    return {};
  }

  private load(): void {
    this.loading.set(true);
    const filter = this.filter();
    const { from, to } = this.dateRange();
    this.sessionService
      .getAll({
        category: filter === 'todos' ? undefined : filter,
        q: this.search().trim() || undefined,
        from,
        to,
      })
      .subscribe({
        next: (sessions) => {
          this.sessions.set(sessions);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
