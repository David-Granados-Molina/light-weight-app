import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { WorkoutDraftStore } from '../../core/services/workout-draft.store';
import { DashboardSummary, WeekBar } from '../../core/models/dashboard.model';
import { CategoryTag } from '../../shared/components/category-tag/category-tag';
import { ExerciseLoader } from '../../shared/components/exercise-loader/exercise-loader';
import { AppAvatar } from '../../shared/components/avatar/avatar';
import { sessionTypeLabel } from '../../core/models/labels';
import { dayLetter, formatSets, relativeDayLabel, todayLabel } from '../../core/utils/format';

interface WeekCheckView extends WeekBar {
  letter: string;
}

const TIPS = [
  'Bebe agua antes, durante y después de entrenar.',
  'Calienta siempre antes de empezar, tus músculos te lo agradecerán.',
  'El descanso es donde se construye el músculo. Duerme bien.',
  'La sobrecarga progresiva es la clave del progreso. No te estanques.',
  'La alimentación y el descanso son los pilares de tu rendimiento. Cuídalos.',
  'Estira después de entrenar para mejorar la movilidad.',
  'La constancia es más importante que la intensidad. Entrena regularmente.',
  'Cada entreno cuenta, aunque sea un día flojo.',
  'El dia de descanso también es parte del entrenamiento. No lo subestimes.',
  'El dia que entrenas sin ganas estás ganando contra ti mismo. Eso es fuerza de voluntad.',
  'La técnica correcta antes que el peso. Siempre.',
  'Primero, mejora la técnica, luego aumenta el número de repeticiones y por último, aumenta el peso hasta que te cueste la técnica, en este orden. Así en bucle.',
  'La única persona con la que te tienes que comparar es contigo mismo. No te compares con otros. Cada cuerpo es diferente y cada uno tiene su propio ritmo de progreso.',
  'No siempre estamos al 100%, lo importante es que incluso cuando estés al 80%, 50% o 20% sigas dando lo mejor de ti.',
  '"Cuando tu mente lidera, tu cuerpo te sigue. Si tu mente es fuerte, puedes hacer cualquier cosa. Entrena tu mente primero." - Ronnie Coleman',
  '"No pierdas el tiempo preocupándote por lo que otros piensen de ti. Concéntrate en tu propio camino y sigue adelante." - Ronnie Coleman',
  '"La disciplina es la clave para alcanzar cualquier objetivo." - Ronnie Coleman',
  '"Trabajo duro y dedicación. No hay secretos. Solo entrena duro, come limpio, descansa bien y cree en ti mismo." - Ronnie Coleman',
  'YIEEEEEEEEEEEEEEE BUDDYYYYYYYYYYYYYYYY',
  'LIGHT WEIGHT BABYYYYYYYYYYYYYYYYYY',
];

function shuffledIndices(length: number): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const TIP_DURATION_MS = 10_000;
const TIP_TICK_MS = 100;

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, CategoryTag, ExerciseLoader, AppAvatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly draft = inject(WorkoutDraftStore);

  readonly userName = computed(() => this.authService.currentUser()?.name ?? '');
  readonly avatarId = computed(() => this.authService.currentUser()?.avatarUrl ?? null);
  readonly todayLabel = todayLabel();
  readonly formatSets = formatSets;
  readonly relativeDayLabel = relativeDayLabel;

  private readonly summary = signal<DashboardSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly expandedId = signal<string | null>(null);

  private tipOrder = shuffledIndices(TIPS.length);
  private tipPos = 0;
  readonly tipIndex = signal(this.tipOrder[0]);
  readonly tipProgress = signal(0);
  readonly currentTip = computed(() => TIPS[this.tipIndex()]);

  readonly hasDraftInProgress = this.draft.hasInProgress;

  readonly weekEntrenos = computed(() => this.summary()?.weekEntrenos ?? 0);
  readonly recent = computed(() =>
    (this.summary()?.recent ?? []).map((s) => ({
      ...s,
      typeLabel: sessionTypeLabel(s.exercises.map((e) => e.exercise.type)),
    })),
  );

  readonly weekChecks = computed<WeekCheckView[]>(() =>
    (this.summary()?.weekBars ?? []).map((bar, i) => ({
      ...bar,
      letter: dayLetter(i),
    })),
  );

  toggleExpand(id: string): void {
    this.expandedId.update((current) => (current === id ? null : id));
  }

  editSession(date: string, event: Event): void {
    event.stopPropagation();
    this.draft.reset();
    this.draft.selectedDate.set(date.slice(0, 10));
    this.router.navigate(['/registrar']);
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

    let elapsedMs = 0;
    const tipId = setInterval(() => {
      elapsedMs += TIP_TICK_MS;
      if (elapsedMs >= TIP_DURATION_MS) {
        elapsedMs = 0;
        this.tipPos = (this.tipPos + 1) % TIPS.length;
        if (this.tipPos === 0) this.tipOrder = shuffledIndices(TIPS.length);
        this.tipIndex.set(this.tipOrder[this.tipPos]);
      }
      this.tipProgress.set(elapsedMs / TIP_DURATION_MS);
    }, TIP_TICK_MS);
    this.destroyRef.onDestroy(() => clearInterval(tipId));
  }
}
