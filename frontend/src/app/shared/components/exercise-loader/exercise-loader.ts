import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

const VARIANTS = ['bench', 'curl', 'squat', 'pullup', 'pushup', 'dips'] as const;
export type ExerciseLoaderVariant = (typeof VARIANTS)[number];

@Component({
  selector: 'app-exercise-loader',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './exercise-loader.html',
  styleUrl: './exercise-loader.css',
})
export class ExerciseLoader {
  readonly text = input('Cargando…');
  readonly compact = input(false, { transform: booleanAttribute });

  readonly variant: ExerciseLoaderVariant = VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
}
