import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  private readonly authService = inject(AuthService);

  readonly email = signal('');
  readonly error = signal<string | null>(null);
  readonly sent = signal(false);
  readonly loading = signal(false);

  onEmailInput(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }

  submit(): void {
    if (!this.email() || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);
    this.authService.forgotPassword(this.email()).subscribe({
      next: () => {
        this.loading.set(false);
        this.sent.set(true);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se ha podido procesar la solicitud. Inténtalo de nuevo.');
      },
    });
  }
}
