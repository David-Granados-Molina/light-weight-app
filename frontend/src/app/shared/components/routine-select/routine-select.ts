import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Routine } from '../../../core/models/routine.model';
import { CATEGORY_COLOR } from '../../../core/models/labels';

/**
 * Desplegable de rutinas. No es un `<select>` nativo porque cada opción lleva el
 * color de su categoría, que en esta app es dato. El padre controla el estado
 * seleccionado; este componente solo lo muestra y emite la elección.
 */
@Component({
  selector: 'app-routine-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.open]': 'open()' },
  styles: [
    `
      :host {
        display: block;
        position: relative;
      }

      .trigger {
        width: 100%;
        display: flex;
        align-items: center;
        gap: var(--s-3);
        min-height: 46px;
        padding: 0 var(--s-4);
        background: var(--surface-raised);
        color: var(--text);
        border: 1px solid var(--line-strong);
        border-radius: var(--r-sm);
        font-size: var(--t-body);
        font-weight: 550;
        text-align: left;
        transition:
          background var(--dur) var(--ease-out),
          border-color var(--dur) var(--ease-out);
      }

      .trigger:hover {
        background: var(--surface-hover);
      }

      :host(.open) .trigger {
        border-color: var(--accent-line);
        box-shadow: 0 0 0 3px var(--accent-soft);
      }

      .trigger-name {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .trigger-placeholder {
        flex: 1;
        color: var(--text-muted);
      }

      .dot {
        width: 8px;
        height: 8px;
        border-radius: var(--r-full);
        flex-shrink: 0;
      }

      .chevron {
        flex-shrink: 0;
        color: var(--text-secondary);
        transition: transform var(--dur) var(--ease-out);
      }

      :host(.open) .chevron {
        transform: rotate(180deg);
      }

      /* Capta el clic fuera para cerrar. Fija, no absoluta, para que no la
         recorte ningún ancestro con overflow. */
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 99;
      }

      .panel {
        position: absolute;
        top: calc(100% + 6px);
        left: 0;
        right: 0;
        max-height: 320px;
        overflow-y: auto;
        background: var(--surface);
        border: 1px solid var(--line-strong);
        border-radius: var(--r-md);
        z-index: 100;
        box-shadow: var(--shadow-3);
        padding: var(--s-1) 0;
        animation: panel-in var(--dur) var(--ease-out);
      }

      @keyframes panel-in {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
      }

      .option {
        display: flex;
        align-items: center;
        gap: var(--s-3);
        width: 100%;
        min-height: 44px;
        padding: 0 var(--s-4);
        background: transparent;
        color: var(--text);
        border: none;
        font-size: var(--t-body);
        font-weight: 500;
        text-align: left;
        transition: background var(--dur-fast) var(--ease-out);
      }

      .option:hover {
        background: var(--surface-hover);
      }

      .option.active {
        background: var(--accent-soft);
        color: var(--accent-text);
        font-weight: 650;
      }

      .option.empty {
        color: var(--text-muted);
      }

      .option-name {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `,
  ],
  template: `
    <button
      type="button"
      class="trigger"
      (click)="toggle()"
      [attr.aria-expanded]="open()"
      aria-haspopup="listbox"
      aria-label="Elegir rutina"
    >
      @if (selected()) {
        <span class="dot" [style.background]="categoryColor[selected()!.category]" aria-hidden="true"></span>
        <span class="trigger-name">{{ selected()!.name }}</span>
      } @else {
        <span class="trigger-placeholder">Sin rutina</span>
      }
      <svg
        class="chevron"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
    @if (open()) {
      <div class="backdrop" (click)="close()"></div>
      <div class="panel" role="listbox">
        @if (allowEmpty()) {
          <button
            type="button"
            class="option empty"
            [class.active]="!selected()"
            [attr.aria-selected]="!selected()"
            role="option"
            (click)="select(null)"
          >
            Sin rutina
          </button>
        }
        @for (r of routines(); track r.id) {
          <button
            type="button"
            class="option"
            [class.active]="selectedId() === r.id"
            [attr.aria-selected]="selectedId() === r.id"
            role="option"
            (click)="select(r.id)"
          >
            <span class="dot" [style.background]="categoryColor[r.category]" aria-hidden="true"></span>
            <span class="option-name">{{ r.name }}</span>
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
