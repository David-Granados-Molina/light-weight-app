import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Novedad } from '../../../core/novedades';

/**
 * Lo que ha cambiado desde la última vez, una sola vez por versión. Usa el
 * `<dialog>` nativo por lo mismo que el de confirmación: foco atrapado, cierre
 * con Escape y el resto de la página inerte, sin escribir nada de eso.
 */
@Component({
  selector: 'app-release-notes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './release-notes.html',
  styleUrl: './release-notes.css',
})
export class ReleaseNotes {
  readonly novedades = input.required<Novedad[]>();

  readonly cerrado = output<void>();

  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => {
      const dialog = this.dialogRef().nativeElement;
      if (!dialog.open) dialog.showModal();
    });
  }

  onCancelEvent(event: Event): void {
    event.preventDefault();
    this.cerrado.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialogRef().nativeElement) this.cerrado.emit();
  }
}
