import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { AdminService } from '../../core/services/admin.service';
import { SessionService } from '../../core/services/session.service';
import { WorkoutDraftStore } from '../../core/services/workout-draft.store';
import { Category } from '../../core/models/exercise.model';
import { WorkoutSession } from '../../core/models/session.model';
import { CATEGORY_COLOR, CATEGORY_LABEL, sessionTypeLabel } from '../../core/models/labels';
import { dayPhrase, effectiveInputType, formatSets, relativeDayLabel } from '../../core/utils/format';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';

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

const PAGE_SIZE = 5;

@Component({
  selector: 'app-history',
  imports: [RouterLink, ConfirmDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './history.html',
  styleUrl: './history.css',
})
export class History {
  private readonly sessionService = inject(SessionService);
  private readonly adminService = inject(AdminService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly draft = inject(WorkoutDraftStore);

  readonly targetUserId = toSignal(this.route.paramMap.pipe(map((p) => p.get('userId'))), {
    initialValue: this.route.snapshot.paramMap.get('userId'),
  });
  readonly targetUserName = toSignal(this.route.queryParamMap.pipe(map((p) => p.get('name'))), {
    initialValue: this.route.snapshot.queryParamMap.get('name'),
  });

  readonly categoryColor = CATEGORY_COLOR;
  readonly categoryLabel = CATEGORY_LABEL;
  readonly relativeDayLabel = relativeDayLabel;
  readonly formatSets = formatSets;
  readonly effectiveInputType = effectiveInputType;
  readonly todayIso = isoDate(new Date());

  readonly filter = signal<HistFilter>('todos');
  readonly search = signal('');
  readonly sessions = signal<WorkoutSession[]>([]);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly hasMore = signal(true);
  readonly expandedId = signal<string | null>(null);

  readonly deleteTarget = signal<{ id: string; when: string; typeLabel: string } | null>(null);
  readonly deleting = signal(false);
  readonly deleteError = signal(false);

  readonly dateMode = signal<DateMode>('todos');
  readonly selectedDay = signal(this.todayIso);
  readonly selectedMonth = signal(new Date().getMonth());
  readonly selectedYear = signal(new Date().getFullYear());

  private offset = 0;

  readonly filterChips: { key: HistFilter; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'gym', label: 'Gym' },
    { key: 'calistenia', label: 'Calistenia' },
  ];

  readonly dateModeChips: { key: DateMode; label: string }[] = [
    { key: 'todos', label: 'General' },
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
      date: s.date,
      category: s.category,
      typeLabel: sessionTypeLabel(s.exercises.map((e) => e.exercise.type)),
      dateLabel: relativeDayLabel(s.date),
      when: dayPhrase(s.date),
      exercisesText: s.exercises.map((e) => e.exercise.name).join(' · '),
      count: `${s.exercises.length} ejercicios`,
      /* Con la fila cerrada no hay forma de saber que hay algo escrito dentro.
         Una nota se apunta una vez y se busca semanas después: si no se anuncia,
         no se abre. */
      hasNotes: s.exercises.some((e) => !!e.note),
      exercises: s.exercises,
    })),
  );

  constructor() {
    effect(() => {
      this.targetUserId();
      untracked(() => this.reset());
    });
  }

  toggleExpand(id: string): void {
    this.expandedId.update((current) => (current === id ? null : id));
  }

  askDelete(row: { id: string; when: string; typeLabel: string }, event: Event): void {
    event.stopPropagation();
    if (this.targetUserId()) return;
    this.deleteTarget.set({ id: row.id, when: row.when, typeLabel: row.typeLabel });
  }

  cancelDelete(): void {
    this.deleteTarget.set(null);
    this.deleteError.set(false);
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.deleteError.set(false);
    this.deleting.set(true);
    this.sessionService.delete(target.id).subscribe({
      next: () => {
        this.sessions.update((list) => list.filter((s) => s.id !== target.id));
        if (this.offset > 0) this.offset--;
        this.deleting.set(false);
        this.deleteTarget.set(null);
      },
      error: () => {
        this.deleting.set(false);
        this.deleteError.set(true);
      },
    });
  }

  editSession(date: string, event: Event): void {
    event.stopPropagation();
    if (this.targetUserId()) return;
    const iso = date.slice(0, 10);
    this.draft.reset();
    this.draft.selectedDate.set(iso);
    this.draft.pendingEditDate.set(iso);
    this.router.navigate(['/registrar']);
  }

  selectFilter(key: HistFilter): void {
    this.filter.set(key);
    this.reset();
  }

  selectDateMode(key: DateMode): void {
    this.dateMode.set(key);
    this.reset();
  }

  onDayInput(event: Event): void {
    this.selectedDay.set((event.target as HTMLInputElement).value);
    this.reset();
  }

  onMonthInput(event: Event): void {
    this.selectedMonth.set(Number((event.target as HTMLSelectElement).value));
    this.reset();
  }

  onYearInput(event: Event): void {
    this.selectedYear.set(Number((event.target as HTMLSelectElement).value));
    this.reset();
  }

  onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
    this.reset();
  }

  loadMore(): void {
    if (!this.hasMore() || this.loadingMore()) return;
    this.loadChunk(false);
  }

  private reset(): void {
    this.offset = 0;
    this.hasMore.set(true);
    this.sessions.set([]);
    this.loadChunk(true);
  }

  private fetchSessions(params: {
    category?: Category;
    q?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }) {
    const targetUserId = this.targetUserId();
    return targetUserId ? this.adminService.getSessions(targetUserId, params) : this.sessionService.getAll(params);
  }

  private loadChunk(isFirst: boolean): void {
    const mode = this.dateMode();
    const filterVal = this.filter();
    const category: Category | undefined = filterVal === 'todos' ? undefined : filterVal;
    const q = this.search().trim() || undefined;

    if (mode !== 'todos') {
      this.loading.set(true);
      const { from, to } = this.dateRange();
      this.fetchSessions({ category, q, from, to }).subscribe({
        next: (sessions) => {
          this.sessions.set(sessions);
          this.loading.set(false);
          this.hasMore.set(false);
        },
        error: () => this.loading.set(false),
      });
      return;
    }

    if (isFirst) this.loading.set(true);
    else this.loadingMore.set(true);

    this.fetchSessions({ category, q, limit: PAGE_SIZE, offset: this.offset }).subscribe({
      next: (sessions) => {
        if (isFirst) {
          this.sessions.set(sessions);
          this.loading.set(false);
        } else {
          this.sessions.update((prev) => [...prev, ...sessions]);
          this.loadingMore.set(false);
        }
        this.offset += sessions.length;
        this.hasMore.set(sessions.length === PAGE_SIZE);
      },
      error: () => {
        this.loading.set(false);
        this.loadingMore.set(false);
      },
    });
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
}
