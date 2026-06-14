import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { ProgressService } from '../../core/services/progress.service';
import { Exercise } from '../../core/models/exercise.model';
import { ProgressData, ProgressMetric } from '../../core/models/progress.model';
import { INPUT_TYPE_UNIT } from '../../core/models/labels';
import { formatNumber, shortDateLabel } from '../../core/utils/format';

@Component({
  selector: 'app-progress',
  imports: [ChartModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './progress.html',
  styleUrl: './progress.css',
})
export class Progress {
  private readonly progressService = inject(ProgressService);

  readonly exercises = signal<Exercise[]>([]);
  readonly selectedExerciseId = signal<string | null>(null);
  readonly metric = signal<ProgressMetric>('peso');
  readonly data = signal<ProgressData | null>(null);
  readonly loading = signal(true);

  readonly metricLabel = computed(() => {
    const exercise = this.data()?.exercise;
    if (!exercise) return 'Peso máximo';
    if (exercise.inputType === 'reps') return 'Repeticiones máximas';
    if (exercise.inputType === 'tiempo') return 'Tiempo máximo';
    return 'Peso máximo';
  });

  readonly chartTitle = computed(() => {
    const exercise = this.data()?.exercise;
    if (!exercise) return '';
    const unit = INPUT_TYPE_UNIT[exercise.inputType];
    const label = this.metric() === 'peso' ? this.metricLabel() : 'Volumen total';
    return `${exercise.name} · ${label} (${unit})`;
  });

  readonly pr = computed(() => this.formatValue(this.data()?.pr ?? 0));
  readonly actual = computed(() => this.formatValue(this.data()?.actual ?? 0));
  readonly cambio = computed(() => this.formatChange(this.data()?.cambio ?? 0));
  readonly cambioPositive = computed(() => (this.data()?.cambio ?? 0) >= 0);

  readonly chartData = computed(() => {
    const data = this.data();
    if (!data) return null;
    const color = this.metric() === 'peso' ? '#FF6B00' : '#00E5FF';
    return {
      labels: data.points.map((p) => shortDateLabel(p.date)),
      datasets: [
        {
          data: data.points.map((p) => p.value),
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
  });

  readonly chartOptions = computed(() => {
    const metric = this.metric();
    const unit = INPUT_TYPE_UNIT[this.data()?.exercise.inputType ?? 'peso'];
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
  });

  constructor() {
    this.progressService.getTrackedExercises().subscribe({
      next: (exercises) => {
        this.exercises.set(exercises);
        if (exercises.length) {
          this.selectedExerciseId.set(exercises[0].id);
          this.loadProgress();
        } else {
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  selectExercise(id: string): void {
    if (id === this.selectedExerciseId()) return;
    this.selectedExerciseId.set(id);
    const exercise = this.exercises().find((e) => e.id === id);
    if (exercise?.inputType === 'peso' && this.metric() === 'volumen') {
      this.metric.set('peso');
    }
    this.loadProgress();
  }

  selectMetric(metric: ProgressMetric): void {
    if (metric === this.metric()) return;
    this.metric.set(metric);
    this.loadProgress();
  }

  private loadProgress(): void {
    const id = this.selectedExerciseId();
    if (!id) return;
    this.loading.set(true);
    this.progressService.getProgress(id, this.metric()).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private formatValue(value: number): string {
    const exercise = this.data()?.exercise;
    if (!exercise) return formatNumber(value);
    const unit = INPUT_TYPE_UNIT[exercise.inputType];
    return `${formatNumber(value)} ${unit}`;
  }

  private formatChange(value: number): string {
    const formatted = this.formatValue(Math.abs(value));
    if (value > 0) return `+${formatted}`;
    if (value < 0) return `-${formatted}`;
    return formatted;
  }
}
