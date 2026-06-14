import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardSummary, WeekBar } from '../../core/models/dashboard.model';
import { CategoryTag } from '../../shared/components/category-tag/category-tag';
import { ExerciseLoader } from '../../shared/components/exercise-loader/exercise-loader';
import { sessionTypeLabel } from '../../core/models/labels';
import { dayLetter, formatSets, relativeDayLabel, todayLabel } from '../../core/utils/format';

interface WeekBarView extends WeekBar {
  heightPx: number;
  color: string;
  letter: string;
}

const TIPS = [
  'Bebe agua antes, durante y después de entrenar.',
  'Calienta siempre antes de empezar, tus músculos te lo agradecerán.',
  'El descanso es donde se construye el músculo. Duerme bien.',
  'Pequeños incrementos de peso o reps marcan grandes diferencias a largo plazo.',
  'La alimentación es la mitad del progreso. Cuida lo que comes.',
  'Estira después de entrenar para mejorar la movilidad.',
  'La constancia gana siempre a la intensidad puntual.',
  'Cada entreno cuenta, aunque sea un día flojo.',
  'La técnica correcta antes que el peso. Siempre.',
  'Compárate solo con tu yo de ayer.',
];

const TIP_DURATION_MS = 10_000;

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, CategoryTag, ExerciseLoader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly userName = computed(() => this.authService.currentUser()?.name ?? '');
  readonly avatarUrl = computed(() => this.authService.currentUser()?.avatarUrl ?? null);
  readonly todayLabel = todayLabel();
  readonly formatSets = formatSets;
  readonly relativeDayLabel = relativeDayLabel;

  private readonly summary = signal<DashboardSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly expandedId = signal<string | null>(null);

  readonly tipIndex = signal(0);
  readonly currentTip = computed(() => TIPS[this.tipIndex()]);
  readonly tipDurationMs = TIP_DURATION_MS;

  readonly weekEntrenos = computed(() => this.summary()?.weekEntrenos ?? 0);
  readonly recent = computed(() =>
    (this.summary()?.recent ?? []).map((s) => ({
      ...s,
      typeLabel: sessionTypeLabel(s.exercises.map((e) => e.exercise.type)),
    })),
  );

  readonly weekBars = computed<WeekBarView[]>(() => {
    const bars = this.summary()?.weekBars ?? [];
    const maxVol = Math.max(1, ...bars.map((b) => b.volumeKg));
    return bars.map((bar, i) => ({
      ...bar,
      heightPx: Math.max(14, Math.round((bar.volumeKg / maxVol) * 70)),
      color: bar.category === 'gym' ? 'var(--color-gym)' : bar.category === 'calistenia' ? 'var(--color-cali)' : '#262626',
      letter: dayLetter(i),
    }));
  });

  toggleExpand(id: string): void {
    this.expandedId.update((current) => (current === id ? null : id));
  }

  constructor() {
    this.dashboardService.getSummary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });

    const tipId = setInterval(() => {
      this.tipIndex.update((i) => (i + 1) % TIPS.length);
    }, TIP_DURATION_MS);
    this.destroyRef.onDestroy(() => clearInterval(tipId));
  }
}
