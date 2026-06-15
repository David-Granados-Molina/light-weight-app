import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { ProgressService } from '../../core/services/progress.service';
import { RoutineService } from '../../core/services/routine.service';
import { Routine } from '../../core/models/routine.model';
import { ProgressMetric, RoutineProgressData, RoutineProgressItem } from '../../core/models/progress.model';
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
  readonly metric = signal<ProgressMetric>('peso');
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

  selectMetric(metric: ProgressMetric): void {
    if (metric === this.metric()) return;
    this.metric.set(metric);
    this.loadProgress();
  }

  itemMetricLabel(item: RoutineProgressItem): string {
    if (this.metric() === 'volumen') return 'Volumen total';
    if (item.exercise.inputType === 'reps') return 'Repeticiones máximas';
    if (item.exercise.inputType === 'tiempo') return 'Tiempo máximo';
    if (item.exercise.inputType === 'emom') return 'Mejor EMOM';
    return 'Peso máximo';
  }

  itemChartTitle(item: RoutineProgressItem): string {
    const unit = INPUT_TYPE_UNIT[item.exercise.inputType];
    return `${item.exercise.name} · ${this.itemMetricLabel(item)} (${unit})`;
  }

  itemPr(item: RoutineProgressItem): string {
    return this.formatValue(item, item.pr);
  }

  itemActual(item: RoutineProgressItem): string {
    return this.formatValue(item, item.actual);
  }

  itemCambio(item: RoutineProgressItem): string {
    return this.formatChange(item, item.cambio);
  }

  itemCambioPositive(item: RoutineProgressItem): boolean {
    return item.cambio >= 0;
  }

  itemChartData(item: RoutineProgressItem) {
    const color = this.metric() === 'peso' ? '#ffbf00' : '#00E5FF';
    return {
      labels: item.points.map((p) => shortDateLabel(p.date)),
      datasets: [
        {
          data: item.points.map((p) => p.value),
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
    const metric = this.metric();
    const unit = INPUT_TYPE_UNIT[item.exercise.inputType];
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
            label: (context: { parsed: { y: number } }) =>
              metric === 'volumen'
                ? formatNumber(context.parsed.y) + ' ' + unit
                : context.parsed.y + ' ' + unit,
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

  private loadProgress(): void {
    const id = this.selectedRoutineId();
    if (!id) return;
    this.loading.set(true);
    this.progressService.getRoutineProgress(id, this.metric()).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private formatValue(item: RoutineProgressItem, value: number): string {
    const unit = INPUT_TYPE_UNIT[item.exercise.inputType];
    return `${formatNumber(value)} ${unit}`;
  }

  private formatChange(item: RoutineProgressItem, value: number): string {
    const formatted = this.formatValue(item, Math.abs(value));
    if (value > 0) return `+${formatted}`;
    if (value < 0) return `-${formatted}`;
    return formatted;
  }
}
