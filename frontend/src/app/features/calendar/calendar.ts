import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../core/services/session.service';
import { WorkoutSession } from '../../core/models/session.model';
import { Category } from '../../core/models/exercise.model';
import { CATEGORY_COLOR, TYPE_LABEL } from '../../core/models/labels';
import { formatSets } from '../../core/utils/format';

interface DayCell {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  categories: Category[];
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

@Component({
  selector: 'app-calendar',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
})
export class Calendar {
  private readonly sessionService = inject(SessionService);

  readonly categoryColor = CATEGORY_COLOR;
  readonly typeLabel = TYPE_LABEL;
  readonly weekdayHeaders = WEEKDAY_HEADERS;
  readonly formatSets = formatSets;

  readonly monthDate = signal(startOfMonth(new Date()));
  readonly sessions = signal<WorkoutSession[]>([]);
  readonly loading = signal(true);
  readonly selectedDay = signal<string | null>(null);

  readonly monthLabel = computed(() => {
    const label = this.monthDate().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  });

  readonly sessionsByDay = computed(() => {
    const map = new Map<string, WorkoutSession[]>();
    for (const s of this.sessions()) {
      const iso = s.date.slice(0, 10);
      const list = map.get(iso) ?? [];
      list.push(s);
      map.set(iso, list);
    }
    return map;
  });

  readonly weeks = computed(() => {
    const month = this.monthDate();
    const todayIso = isoDate(new Date());
    const byDay = this.sessionsByDay();

    const firstWeekday = (month.getDay() + 6) % 7; // Lunes = 0
    const gridStart = new Date(month);
    gridStart.setDate(gridStart.getDate() - firstWeekday);

    const cells: DayCell[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(d.getDate() + i);
      const iso = isoDate(d);
      const daySessions = byDay.get(iso) ?? [];
      cells.push({
        iso,
        day: d.getDate(),
        inMonth: d.getMonth() === month.getMonth(),
        isToday: iso === todayIso,
        categories: [...new Set(daySessions.map((s) => s.category))],
      });
    }

    const weeks: DayCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    while (weeks.length > 4 && weeks[weeks.length - 1].every((c) => !c.inMonth)) weeks.pop();
    return weeks;
  });

  readonly selectedSessions = computed(() => {
    const day = this.selectedDay();
    if (!day) return [];
    return this.sessionsByDay().get(day) ?? [];
  });

  readonly selectedDayLabel = computed(() => {
    const day = this.selectedDay();
    if (!day) return '';
    const label = new Date(`${day}T00:00:00`).toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  });

  constructor() {
    this.load();
  }

  prevMonth(): void {
    const d = new Date(this.monthDate());
    d.setMonth(d.getMonth() - 1);
    this.monthDate.set(d);
    this.selectedDay.set(null);
    this.load();
  }

  nextMonth(): void {
    const d = new Date(this.monthDate());
    d.setMonth(d.getMonth() + 1);
    this.monthDate.set(d);
    this.selectedDay.set(null);
    this.load();
  }

  selectDay(cell: DayCell): void {
    if (!this.sessionsByDay().get(cell.iso)?.length) return;
    this.selectedDay.set(this.selectedDay() === cell.iso ? null : cell.iso);
  }

  private load(): void {
    const month = this.monthDate();
    const from = new Date(month.getFullYear(), month.getMonth(), 1);
    const to = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    this.loading.set(true);
    this.sessionService.getAll({ from: isoDate(from), to: isoDate(to) }).subscribe({
      next: (sessions) => {
        this.sessions.set(sessions);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
