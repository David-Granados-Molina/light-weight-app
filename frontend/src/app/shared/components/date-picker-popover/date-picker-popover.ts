import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { Category } from '../../../core/models/exercise.model';
import { WorkoutSession } from '../../../core/models/session.model';
import { CATEGORY_COLOR } from '../../../core/models/labels';
import { DAY_LETTERS } from '../../../core/utils/format';
import { SessionService } from '../../../core/services/session.service';

interface CalendarDay {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  disabled: boolean;
  categories: Category[];
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Calendario emergente para elegir el día de un entreno.
 *
 * Vive aparte porque es un widget completo —navegación de mes, cuadrícula de seis
 * semanas, puntos de color por categoría y bloqueo de días futuros— y tenerlo
 * dentro de Registrar hacía de esa pantalla la más pesada de la aplicación.
 *
 * Se pide sus propias sesiones: quien lo usa solo tiene que decirle qué día está
 * seleccionado y escuchar cuál se elige.
 */
@Component({
  selector: 'app-date-picker-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './date-picker-popover.html',
  styleUrl: './date-picker-popover.css',
})
export class DatePickerPopover {
  private readonly sessionService = inject(SessionService);

  /** Día seleccionado, en formato ISO. */
  readonly selected = input<string | null>(null);

  /** Se elige un día; el padre decide qué hacer con él. */
  readonly picked = output<string>();

  /** Clic fuera del panel. */
  readonly closed = output<void>();

  readonly categoryColor = CATEGORY_COLOR;
  readonly weekdayHeaders = DAY_LETTERS;
  readonly todayIso = isoDate(new Date());

  readonly month = signal(startOfMonth(new Date()));
  readonly sessions = signal<WorkoutSession[]>([]);
  readonly loading = signal(false);

  constructor() {
    // El mes visible arranca en el del día seleccionado, no siempre en el actual.
    const selected = this.selected();
    if (selected) this.month.set(startOfMonth(new Date(`${selected}T00:00:00`)));
    this.load();
  }

  readonly monthLabel = computed(() => {
    const label = this.month().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  });

  /** Índice rápido iso -> categorías entrenadas, para pintar los puntos. */
  private readonly categoriesByDay = computed(() => {
    const map = new Map<string, Category[]>();
    for (const s of this.sessions()) {
      const iso = s.date.slice(0, 10);
      const list = map.get(iso) ?? [];
      if (!list.includes(s.category)) list.push(s.category);
      map.set(iso, list);
    }
    return map;
  });

  readonly weeks = computed(() => {
    const month = this.month();
    const byDay = this.categoriesByDay();

    const firstWeekday = (month.getDay() + 6) % 7; // Lunes = 0
    const gridStart = new Date(month);
    gridStart.setDate(gridStart.getDate() - firstWeekday);

    const cells: CalendarDay[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(d.getDate() + i);
      const iso = isoDate(d);
      cells.push({
        iso,
        day: d.getDate(),
        inMonth: d.getMonth() === month.getMonth(),
        isToday: iso === this.todayIso,
        disabled: iso > this.todayIso,
        categories: byDay.get(iso) ?? [],
      });
    }

    const weeks: CalendarDay[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    // Recorta la última fila si cae entera fuera del mes.
    while (weeks.length > 4 && weeks[weeks.length - 1].every((c) => !c.inMonth)) weeks.pop();
    return weeks;
  });

  prevMonth(): void {
    const d = new Date(this.month());
    d.setMonth(d.getMonth() - 1);
    this.month.set(d);
    this.load();
  }

  nextMonth(): void {
    const d = new Date(this.month());
    d.setMonth(d.getMonth() + 1);
    this.month.set(d);
    this.load();
  }

  pick(cell: CalendarDay): void {
    if (cell.disabled) return;
    this.picked.emit(cell.iso);
  }

  private load(): void {
    const month = this.month();
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
