import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Category } from '../../../core/models/exercise.model';
import { CATEGORY_COLOR, CATEGORY_LABEL } from '../../../core/models/labels';

@Component({
  selector: 'app-category-tag',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category-tag.html',
  styleUrl: './category-tag.css',
})
export class CategoryTag {
  category = input.required<Category>();

  color = computed(() => CATEGORY_COLOR[this.category()]);
  label = computed(() => CATEGORY_LABEL[this.category()]);
}
