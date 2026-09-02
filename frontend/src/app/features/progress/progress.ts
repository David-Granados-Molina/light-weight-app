import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, map } from 'rxjs';
import { ChartModule } from 'primeng/chart';
import { AdminService } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';
import { ProgressService } from '../../core/services/progress.service';
import { RoutineService } from '../../core/services/routine.service';
import { Routine } from '../../core/models/routine.model';
import { ProgressPoint, ProgressStat, RoutineProgressData, RoutineProgressItem } from '../../core/models/progress.model';
import { CATEGORY_COLOR, INPUT_TYPE_UNIT } from '../../core/models/labels';
import { formatNumber, shortDateLabel } from '../../core/utils/format';
import { ExerciseLoader } from '../../shared/components/exercise-loader/exercise-loader';
import { RoutineSelect } from '../../shared/components/routine-select/routine-select';


/**
 * Valores del sistema de diseño que Chart.js necesita como literales: pinta
 * sobre canvas y no resuelve variables CSS. Se mantienen sincronizados a mano
 * con los tokens de `styles.css`.
 */
const CHART_FONT = 'Archivo, system-ui, sans-serif';
const SURFACE = '#101319';
const SURFACE_RAISED = '#161A22';
const LINE = 'rgba(255, 255, 255, 0.07)';
const LINE_STRONG = 'rgba(255, 255, 255, 0.13)';
const TEXT = '#F1F3F7';
const TEXT_SECONDARY = '#98A0AE';
const TEXT_MUTED = '#666E7C';
const DEFAULT_ACCENT = '#ffbf00';
const CHART_GRADIENT_HEIGHT = 220;
const MIN_ACCENT_LIGHTNESS = 0.62;

/**
 * Sube la luminosidad de un color hasta un mínimo legible sobre fondo oscuro,
 * conservando su tono y su saturación. Es el equivalente en TypeScript de la
 * derivación `--accent-solid` que hace CSS con sintaxis de color relativa.
 */
function liftLightness(hex: string): [number, number, number] {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return liftLightness(DEFAULT_ACCENT);

  const int = parseInt(match[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (l >= MIN_ACCENT_LIGHTNESS) return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];

  // Interpolación hacia el blanco: mantiene el tono y solo aclara.
  const t = (MIN_ACCENT_LIGHTNESS - l) / (1 - l);
  const lift = (c: number) => Math.round((c + (1 - c) * t) * 255);
  return [lift(r), lift(g), lift(b)];
}

@Component({
  selector: 'app-progress',
  imports: [ChartModule, ExerciseLoader, RoutineSelect, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './progress.html',
  styleUrl: './progress.css',
})
export class Progress {
  private readonly progressService = inject(ProgressService);
  private readonly routineService = inject(RoutineService);
  private readonly adminService = inject(AdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  /**
   * Chart.js pinta sobre canvas y no entiende variables CSS, así que el color de
   * la línea se calcula aquí a partir del tema del usuario aplicando la misma
   * regla que `--accent-solid` en CSS: se conserva el tono y se le impone un
   * suelo de luminosidad. Sin esto los cuatro temas oscuros (rojo, azul, morado,
   * verde) dibujaban una línea casi invisible sobre el fondo.
   */
  private readonly accentRgb = computed(() => liftLightness(this.auth.currentUser()?.themeColor ?? DEFAULT_ACCENT));

  readonly targetUserId = toSignal(this.route.paramMap.pipe(map((p) => p.get('userId'))), {
    initialValue: this.route.snapshot.paramMap.get('userId'),
  });
  readonly targetUserName = toSignal(this.route.queryParamMap.pipe(map((p) => p.get('name'))), {
    initialValue: this.route.snapshot.queryParamMap.get('name'),
  });

  readonly categoryColor = CATEGORY_COLOR;

  readonly routines = signal<Routine[]>([]);
  readonly selectedRoutineId = signal<string | null>(null);
  readonly timeRanges = signal<Record<string, '3M' | '1A'>>({});
  readonly data = signal<RoutineProgressData | null>(null);
  readonly loading = signal(true);

  constructor() {
    effect(() => {
      this.targetUserId();
      untracked(() => this.loadRoutines());
    });
  }

  private loadRoutines(): void {
    this.loading.set(true);
    this.data.set(null);
    const targetUserId = this.targetUserId();
    const routines$ = targetUserId ? this.adminService.getRoutines(targetUserId) : this.routineService.getAll();
    routines$.subscribe({
      next: (routines) => {
        this.routines.set(routines);
        if (routines.length) {
          this.selectedRoutineId.set(routines[0].id);
          this.loadProgress();
        } else {
          this.selectedRoutineId.set(null);
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  onRoutineChanged(id: string | null): void {
    if (id) this.selectRoutine(id);
  }

  selectRoutine(id: string): void {
    if (id === this.selectedRoutineId()) return;
    this.selectedRoutineId.set(id);
    this.loadProgress();
  }

  getTimeRange(exerciseId: string): '3M' | '1A' {
    return this.timeRanges()[exerciseId] ?? '1A';
  }

  selectTimeRange(exerciseId: string, range: '3M' | '1A'): void {
    this.timeRanges.update((m) => ({ ...m, [exerciseId]: range }));
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
    const [r, g, b] = this.accentRgb();
    const color = `rgb(${r}, ${g}, ${b})`;
    const points = this.getFilteredPoints(item);
    return {
      labels: points.map((p) => shortDateLabel(p.date)),
      datasets: [
        {
          data: points.map((p) => p.value),
          borderColor: color,
          backgroundColor: (context: { chart: { ctx: CanvasRenderingContext2D } }) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, CHART_GRADIENT_HEIGHT);
            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.28)`);
            gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
            return gradient;
          },
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHitRadius: 14,
          pointBackgroundColor: color,
          pointBorderColor: SURFACE,
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
          backgroundColor: SURFACE_RAISED,
          borderColor: LINE_STRONG,
          borderWidth: 1,
          titleColor: TEXT_SECONDARY,
          bodyColor: TEXT,
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
          titleFont: { family: CHART_FONT, size: 11 },
          bodyFont: { family: CHART_FONT, weight: '600', size: 14 },
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
          border: { color: LINE },
          ticks: { color: TEXT_MUTED, font: { family: CHART_FONT, size: 10 }, maxRotation: 0, autoSkipPadding: 16 },
        },
        y: {
          grid: { color: LINE },
          border: { display: false },
          ticks: { color: TEXT_MUTED, font: { family: CHART_FONT, size: 10 }, maxTicksLimit: 5 },
        },
      },
    };
  }

  private getFilteredPoints(item: RoutineProgressItem): ProgressPoint[] {
    const range = this.getTimeRange(item.exercise.id);
    const ms = range === '3M' ? 91 * 86400000 : 365 * 86400000;
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
    const targetUserId = this.targetUserId();
    const progress$: Observable<RoutineProgressData> = targetUserId
      ? this.adminService.getRoutineProgress(targetUserId, id)
      : this.progressService.getRoutineProgress(id);
    progress$.subscribe({
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
