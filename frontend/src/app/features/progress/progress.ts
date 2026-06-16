import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { ProgressService } from '../../core/services/progress.service';
import { RoutineService } from '../../core/services/routine.service';
import { Routine } from '../../core/models/routine.model';
import { ProgressPoint, ProgressStat, RoutineProgressData, RoutineProgressItem } from '../../core/models/progress.model';
import { CATEGORY_COLOR, INPUT_TYPE_UNIT } from '../../core/models/labels';
import { formatNumber, shortDateLabel } from '../../core/utils/format';
import { ExerciseLoader } from '../../shared/components/exercise-loader/exercise-loader';

@Component({
  selector: 'app-progress',
  imports: [ChartModule, ExerciseLoader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './progress.html',
  styleUrl: './progress.css',
})
export class Progress {
  private readonly progressService = inject(ProgressService);
  private readonly routineService = inject(RoutineService);

  readonly categoryColor = CATEGORY_COLOR;

  readonly routines = signal<Routine[]>([]);
  readonly selectedRoutineId = signal<string | null>(null);
  readonly timeRange = signal<'1M' | '3M' | '1A'>('1A');
  readonly data = signal<RoutineProgressData | null>(null);
  readonly loading = signal(true);

  constructor() {
    this.routineService.getAll().subscribe({
      next: (routines) => {
        this.routines.set(routines);
        if (routines.length) {
          this.selectedRoutineId.set(routines[0].id);
          this.loadProgress();
        } else {
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  selectRoutine(id: string): void {
    if (id === this.selectedRoutineId()) return;
    this.selectedRoutineId.set(id);
    this.loadProgress();
  }

  selectTimeRange(range: '1M' | '3M' | '1A'): void {
    this.timeRange.set(range);
  }

  itemMetricLabel(item: RoutineProgressItem): string {
    if (item.exercise.inputType === 'reps') return 'Repeticiones máximas';
    if (item.exercise.inputType === 'tiempo') return 'Tiempo máximo';
    if (item.exercise.inputType === 'min') return 'Tiempo máximo';
    if (item.exercise.inputType === 'emom') return 'Mejor EMOM';
    return 'Peso máximo';
  }

  itemChartTitle(item: RoutineProgressItem): string {
    const unit = INPUT_TYPE_UNIT[item.exercise.inputType];
    return `${item.exercise.name} · ${this.itemMetricLabel(item)} (${unit})`;
  }

  itemPr(item: RoutineProgressItem): string {
    return this.formatStat(item, this.computePr(this.getFilteredPoints(item)));
  }

  itemPrReps(item: RoutineProgressItem): string | null {
    const pr = this.computePr(this.getFilteredPoints(item));
    return pr.reps !== null ? `${pr.reps} reps` : null;
  }

  itemActual(item: RoutineProgressItem): string {
    return this.formatStat(item, this.computeActual(this.getFilteredPoints(item)));
  }

  itemActualReps(item: RoutineProgressItem): string | null {
    const actual = this.computeActual(this.getFilteredPoints(item));
    return actual.reps !== null ? `${actual.reps} reps` : null;
  }

  itemCambio(item: RoutineProgressItem): string {
    return this.formatChange(item, this.computeCambio(this.getFilteredPoints(item)));
  }

  itemCambioPositive(item: RoutineProgressItem): boolean {
    return this.computeCambio(this.getFilteredPoints(item)) >= 0;
  }

  itemChartData(item: RoutineProgressItem) {
    const color = '#ffbf00';
    const points = this.getFilteredPoints(item);
    return {
      labels: points.map((p) => shortDateLabel(p.date)),
      datasets: [
        {
          data: points.map((p) => p.value),
          borderColor: color,
          backgroundColor: (context: { chart: { ctx: CanvasRenderingContext2D } }) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 200);
            gradient.addColorStop(0, color + '50');
            gradient.addColorStop(1, color + '00');
            return gradient;
          },
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: color,
          pointBorderColor: '#0B0B0B',
          pointBorderWidth: 2,
        },
      ],
    };
  }

  itemChartOptions(item: RoutineProgressItem) {
    const unit = INPUT_TYPE_UNIT[item.exercise.inputType];
    const points = this.getFilteredPoints(item);
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#000',
          borderColor: '#2a2a2a',
          borderWidth: 1,
          titleColor: '#9E9E9E',
          bodyColor: '#fff',
          padding: 10,
          displayColors: false,
          titleFont: { family: 'Space Grotesk' },
          bodyFont: { family: 'Space Grotesk', weight: '700', size: 14 },
          callbacks: {
            label: (context: { dataIndex: number; parsed: { y: number } }) => {
              const value = `${context.parsed.y} ${unit}`;
              const reps = points[context.dataIndex]?.reps;
              return reps !== null && reps !== undefined ? `${value} × ${reps} reps` : value;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#6B6B6B', font: { family: 'Space Grotesk', size: 10 } },
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.06)' },
          border: { display: false },
          ticks: { color: '#6B6B6B', font: { family: 'Space Grotesk', size: 10 }, maxTicksLimit: 5 },
        },
      },
    };
  }

  private getFilteredPoints(item: RoutineProgressItem): ProgressPoint[] {
    const range = this.timeRange();
    const ms = range === '1M' ? 30 * 86400000 : range === '3M' ? 91 * 86400000 : 365 * 86400000;
    const cutoff = Date.now() - ms;
    return item.points.filter((p) => new Date(p.date).getTime() >= cutoff);
  }

  private computePr(points: ProgressPoint[]): ProgressStat {
    return points.reduce<ProgressStat>((acc, p) => (p.value > acc.value ? p : acc), { value: 0, reps: null });
  }

  private computeActual(points: ProgressPoint[]): ProgressStat {
    return points.length ? points[points.length - 1] : { value: 0, reps: null };
  }

  private computeCambio(points: ProgressPoint[]): number {
    const byMonth = new Map<string, number[]>();
    for (const p of points) {
      const key = p.date.slice(0, 7);
      const vals = byMonth.get(key) ?? [];
      vals.push(p.value);
      byMonth.set(key, vals);
    }
    const months = [...byMonth.keys()].sort();
    if (months.length < 2) return 0;
    const cur = Math.max(...byMonth.get(months[months.length - 1])!);
    const prev = Math.max(...byMonth.get(months[months.length - 2])!);
    return cur - prev;
  }

  private loadProgress(): void {
    const id = this.selectedRoutineId();
    if (!id) return;
    this.loading.set(true);
    this.progressService.getRoutineProgress(id).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private formatStat(item: RoutineProgressItem, stat: ProgressStat): string {
    const unit = INPUT_TYPE_UNIT[item.exercise.inputType];
    return `${formatNumber(stat.value)} ${unit}`;
  }

  private formatChange(item: RoutineProgressItem, value: number): string {
    const unit = INPUT_TYPE_UNIT[item.exercise.inputType];
    const formatted = `${formatNumber(Math.abs(value))} ${unit}`;
    if (value > 0) return `+${formatted}`;
    if (value < 0) return `-${formatted}`;
    return formatted;
  }
}
