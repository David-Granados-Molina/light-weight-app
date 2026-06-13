import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

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

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
