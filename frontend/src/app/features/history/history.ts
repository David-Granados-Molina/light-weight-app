import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { SessionService } from '../../core/services/session.service';
import { Category } from '../../core/models/exercise.model';
import { WorkoutSession } from '../../core/models/session.model';
import { CATEGORY_COLOR, CATEGORY_LABEL, TYPE_LABEL } from '../../core/models/labels';
import { formatSets, relativeDayLabel } from '../../core/utils/format';

type HistFilter = 'todos' | Category;

@Component({
  selector: 'app-history',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './history.html',
  styleUrl: './history.css',
})
export class History {
  private readonly sessionService = inject(SessionService);

  readonly categoryColor = CATEGORY_COLOR;
  readonly categoryLabel = CATEGORY_LABEL;
  readonly typeLabel = TYPE_LABEL;
  readonly relativeDayLabel = relativeDayLabel;
  readonly formatSets = formatSets;

  readonly filter = signal<HistFilter>('todos');
  readonly search = signal('');
  readonly sessions = signal<WorkoutSession[]>([]);
  readonly loading = signal(true);
  readonly expandedId = signal<string | null>(null);

  readonly filterChips: { key: HistFilter; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'gym', label: 'Gym' },
    { key: 'calistenia', label: 'Calistenia' },
  ];

  readonly rows = computed(() =>
    this.sessions().map((s) => ({
      id: s.id,
      category: s.category,
      type: s.type,
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

  onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    const filter = this.filter();
    this.sessionService
      .getAll({
        category: filter === 'todos' ? undefined : filter,
        q: this.search().trim() || undefined,
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
