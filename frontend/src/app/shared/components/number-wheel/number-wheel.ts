import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  model,
  viewChild,
} from '@angular/core';

const ITEM_HEIGHT = 36;

@Component({
  selector: 'app-number-wheel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './number-wheel.html',
  styleUrl: './number-wheel.css',
})
export class NumberWheel {
  readonly min = input(0);
  readonly max = input(300);
  readonly step = input(1);
  readonly decimals = input(0);
  readonly unit = input('');
  readonly compact = input(false, { transform: booleanAttribute });
  readonly value = model(0);

  readonly scroller = viewChild<ElementRef<HTMLDivElement>>('scroller');

  readonly itemHeight = ITEM_HEIGHT;

  private snapTimeout: ReturnType<typeof setTimeout> | null = null;
  private didInitialScroll = false;

  readonly values = computed(() => {
    const min = this.min();
    const max = this.max();
    const step = this.step();
    const factor = 10 ** this.decimals();
    const list: number[] = [];
    for (let v = min; v <= max + step / 2; v += step) {
      list.push(Math.round(v * factor) / factor);
    }
    return list;
  });

  constructor() {
    effect(() => {
      const value = this.value();
      const scroller = this.scroller();
      if (!scroller) return;
      const behavior: ScrollBehavior = this.didInitialScroll ? 'smooth' : 'instant';
      this.scrollToValue(scroller.nativeElement, value, behavior);
      this.didInitialScroll = true;
    });
  }

  formatValue(v: number): string {
    return v.toLocaleString('es-ES', { minimumFractionDigits: this.decimals(), maximumFractionDigits: this.decimals() });
  }

  onScroll(): void {
    if (this.snapTimeout) clearTimeout(this.snapTimeout);
    this.snapTimeout = setTimeout(() => this.commitScroll(), 100);
  }

  private commitScroll(): void {
    const scroller = this.scroller();
    if (!scroller) return;

    const values = this.values();
    const index = Math.round(scroller.nativeElement.scrollTop / this.itemHeight);
    const clamped = Math.min(Math.max(index, 0), values.length - 1);
    const newValue = values[clamped];

    if (newValue !== this.value()) {
      this.value.set(newValue);
    } else {
      this.scrollToValue(scroller.nativeElement, newValue, 'smooth');
    }
  }

  private scrollToValue(el: HTMLDivElement, value: number, behavior: ScrollBehavior): void {
    const values = this.values();
    let index = values.findIndex((v) => v === value);
    if (index === -1) {
      index = values.reduce((best, v, i) => (Math.abs(v - value) < Math.abs(values[best] - value) ? i : best), 0);
    }
    el.scrollTo({ top: index * this.itemHeight, behavior });
  }
}
