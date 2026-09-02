import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';

/**
 * Diálogo de confirmación reutilizable. El padre pasa los textos y escucha si
 * el usuario confirmó o canceló.
 *
 * Usa el `<dialog>` nativo en modo modal en lugar de un div con overlay: así el
 * navegador aporta gratis la trampa de foco, el cierre con Escape, el `inert`
 * del resto de la página y la capa superior, que es justo lo que la versión
 * anterior no tenía.
 */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
})
export class ConfirmDialog {
  readonly title = input('¿Estás seguro?');
  readonly message = input('');
  readonly confirmText = input('Eliminar');
  readonly cancelText = input('Cancelar');

  /**
   * Acción destructiva. Por defecto sí, porque el texto de confirmación por
   * defecto es "Eliminar": tiñe el botón de rojo y deja el foco inicial en
   * Cancelar, para que confirmar exija un gesto deliberado.
   */
  readonly danger = input(true, { transform: booleanAttribute });

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => {
      const dialog = this.dialogRef().nativeElement;
      if (!dialog.open) dialog.showModal();
    });
  }

  /** Escape y el gesto de cierre nativo cuentan como cancelar. */
  onCancelEvent(event: Event): void {
    event.preventDefault();
    this.cancelled.emit();
  }

  /** Un clic sobre el propio <dialog> (y no sobre su contenido) es el backdrop. */
  onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialogRef().nativeElement) this.cancelled.emit();
  }
}
