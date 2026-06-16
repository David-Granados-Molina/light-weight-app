import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Routine } from '../../../core/models/routine.model';
import { CATEGORY_COLOR } from '../../../core/models/labels';

@Component({
  selector: 'app-routine-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.open]': 'open()' },
  styles: [`
    :host { display: block; position: relative; }

    .trigger {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 14px;
      background: var(--color-surface);
      color: var(--color-text);
      border: 1px solid var(--color-border-strong);
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      text-align: left;
    }

    .trigger-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .trigger-placeholder { flex: 1; color: var(--color-text-muted); }

    .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

    .chevron {
      flex-shrink: 0;
      color: var(--color-text-muted);
      transition: transform 0.15s;
    }
    :host.open .chevron { transform: rotate(180deg); }

    .backdrop { position: fixed; inset: 0; z-index: 99; }

    .panel {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      background: var(--color-surface);
      border: 1px solid var(--color-border-strong);
      border-radius: 12px;
      overflow: hidden;
      z-index: 100;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    }

    .option {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 13px 14px;
      background: transparent;
      color: var(--color-text);
      border: none;
      border-bottom: 1px solid var(--color-border);
      font-size: 14px;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      text-align: left;
    }
    .option:last-child { border-bottom: none; }
    .option:active { background: var(--color-border); }
    .option.active { font-weight: 700; }
    .option.empty { color: var(--color-text-muted); }
  `],
  template: `
    <button type="button" class="trigger" (click)="toggle()" [attr.aria-expanded]="open()" aria-haspopup="listbox">
      @if (selected()) {
        <span class="dot" [style.background]="categoryColor[selected()!.category]"></span>
        <span class="trigger-name">{{ selected()!.name }}</span>
      } @else {
        <span class="trigger-placeholder">— Sin rutina —</span>
      }
      <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </button>
    @if (open()) {
      <div class="backdrop" (click)="close()"></div>
      <div class="panel" role="listbox">
        @if (allowEmpty()) {
          <button type="button" class="option empty" [class.active]="!selected()" role="option" (click)="select(null)">— Sin rutina —</button>
        }
        @for (r of routines(); track r.id) {
          <button type="button" class="option" [class.active]="selectedId() === r.id" role="option" (click)="select(r.id)">
            <span class="dot" [style.background]="categoryColor[r.category]"></span>
            {{ r.name }}
          </button>
        }
      </div>
    }
  `,
})
export class RoutineSelect {
  readonly routines = input.required<Routine[]>();
  readonly selectedId = input<string | null>(null);
  readonly allowEmpty = input<boolean>(false);
  readonly changed = output<string | null>();

  readonly open = signal(false);
  readonly categoryColor = CATEGORY_COLOR;

  readonly selected = computed(() => this.routines().find((r) => r.id === this.selectedId()) ?? null);

  select(id: string | null): void {
    this.changed.emit(id);
    this.open.set(false);
  }

  toggle(): void {
    this.open.update((v) => !v);
  }

  close(): void {
    this.open.set(false);
  }
}
