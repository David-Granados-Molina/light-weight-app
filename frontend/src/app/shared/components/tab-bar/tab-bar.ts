import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { WorkoutDraftStore } from '../../../core/services/workout-draft.store';

@Component({
  selector: 'app-tab-bar',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tab-bar.html',
  styleUrl: './tab-bar.css',
})
export class TabBar {
  private readonly draft = inject(WorkoutDraftStore);
  readonly hasDraftInProgress = this.draft.hasInProgress;
}
