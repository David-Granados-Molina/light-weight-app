import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'app-image-lightbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './image-lightbox.html',
  styleUrl: './image-lightbox.css',
})
export class ImageLightbox {
  readonly src = input.required<string>();
  readonly alt = input('');
  /** Autoría de la imagen, cuando la licencia obliga a citarla. */
  readonly credit = input<string | null>(null);

  readonly closed = output<void>();

  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => {
      const dialog = this.dialogRef().nativeElement;
      if (!dialog.open) dialog.showModal();
    });
  }

  onCancelEvent(event: Event): void {
    event.preventDefault();
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialogRef().nativeElement) this.closed.emit();
  }
}
