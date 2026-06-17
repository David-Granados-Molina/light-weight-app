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
  readonly value = model<number | null>(0);

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

  formatValue(v: number | null): string {
    if (v === null) return '';
    return v.toLocaleString('es-ES', { minimumFractionDigits: this.decimals(), maximumFractionDigits: this.decimals() });
  }

  onFocus(): void {
    this.focused = true;
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const allowNegative = this.min() < 0;
    let sanitized = target.value.replace(allowNegative ? /[^0-9.,-]/g : /[^0-9.,]/g, '');

    if (allowNegative) {
      const negative = sanitized.startsWith('-');
      sanitized = sanitized.replace(/-/g, '');
      if (negative) sanitized = '-' + sanitized;
    }

    const sepIndex = sanitized.search(/[.,]/);
    if (sepIndex !== -1) {
      sanitized = sanitized.slice(0, sepIndex + 1) + sanitized.slice(sepIndex + 1).replace(/[.,]/g, '');
    }

    // Forzar el valor del input directamente: si el saneado coincide con el signal
    // anterior (p.ej. dos letras seguidas que ambas se eliminan), Angular detecta el
    // valor como "sin cambios" y no refresca el binding, dejando las letras visibles.
    target.value = sanitized;
    this.displayValue.set(sanitized);
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
    const base = this.value() ?? this.min() - this.step();
    this.value.set(this.clamp(this.roundToStep(base + this.step())));
  }

  decrement(): void {
    this.focused = false;
    const base = this.value() ?? this.min() + this.step();
    this.value.set(this.clamp(this.roundToStep(base - this.step())));
  }

  private commit(): void {
    const raw = this.displayValue().replace(',', '.').trim();
    if (raw === '') {
      this.value.set(null);
      return;
    }
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
