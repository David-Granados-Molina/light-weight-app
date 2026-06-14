import { booleanAttribute, ChangeDetectionStrategy, Component, effect, input, model, signal } from '@angular/core';

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

  readonly displayValue = signal('');
  private focused = false;

  constructor() {
    effect(() => {
      const value = this.value();
      if (!this.focused) {
        this.displayValue.set(this.formatValue(value));
      }
    });
  }

  formatValue(v: number): string {
    return v.toLocaleString('es-ES', { minimumFractionDigits: this.decimals(), maximumFractionDigits: this.decimals() });
  }

  onFocus(): void {
    this.focused = true;
  }

  onInput(event: Event): void {
    this.displayValue.set((event.target as HTMLInputElement).value);
  }

  onBlur(): void {
    this.focused = false;
    this.commit();
  }

  onEnter(event: Event): void {
    (event.target as HTMLInputElement).blur();
  }

  increment(): void {
    this.focused = false;
    this.value.set(this.clamp(this.roundToStep(this.value() + this.step())));
  }

  decrement(): void {
    this.focused = false;
    this.value.set(this.clamp(this.roundToStep(this.value() - this.step())));
  }

  private commit(): void {
    const raw = this.displayValue().replace(',', '.').trim();
    const parsed = parseFloat(raw);
    const num = Number.isNaN(parsed) ? this.value() : this.clamp(this.roundToStep(parsed));
    if (num === this.value()) {
      this.displayValue.set(this.formatValue(num));
    } else {
      this.value.set(num);
    }
  }

  private roundToStep(v: number): number {
    const factor = 10 ** this.decimals();
    return Math.round(v * factor) / factor;
  }

  private clamp(v: number): number {
    return Math.min(Math.max(v, this.min()), this.max());
  }
}
