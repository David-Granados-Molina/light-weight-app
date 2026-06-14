import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardSummary, WeekBar } from '../../core/models/dashboard.model';
import { CategoryTag } from '../../shared/components/category-tag/category-tag';
import { TYPE_LABEL } from '../../core/models/labels';
import { dayLetter, formatSets, relativeDayLabel, todayLabel } from '../../core/utils/format';

interface WeekBarView extends WeekBar {
  heightPx: number;
  color: string;
  letter: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, CategoryTag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);

  readonly userName = computed(() => this.authService.currentUser()?.name ?? '');
  readonly avatarUrl = computed(() => this.authService.currentUser()?.avatarUrl ?? null);
  readonly todayLabel = todayLabel();
  readonly typeLabel = TYPE_LABEL;
  readonly formatSets = formatSets;
  readonly relativeDayLabel = relativeDayLabel;

  private readonly summary = signal<DashboardSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly expandedId = signal<string | null>(null);

  readonly weekEntrenos = computed(() => this.summary()?.weekEntrenos ?? 0);
  readonly weekSets = computed(() => this.summary()?.weekSets ?? 0);
  readonly recent = computed(() => this.summary()?.recent ?? []);

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
  }
}
