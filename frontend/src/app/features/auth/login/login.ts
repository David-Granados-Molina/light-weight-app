import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ExerciseLoader } from '../../../shared/components/exercise-loader/exercise-loader';

/** `email` pide el código; `code` lo verifica. No hay contraseña en ningún punto. */
type Step = 'email' | 'code';

const CODE_LENGTH = 8;

@Component({
  selector: 'app-login',
  imports: [ExerciseLoader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly codeInput = viewChild<ElementRef<HTMLInputElement>>('codeInput');

  readonly step = signal<Step>('email');
  readonly email = signal('');
  readonly code = signal('');
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly loading = signal(false);

  /**
   * Si el servidor ha enviado el código de verdad o solo lo ha dejado en su log.
   *
   * Mientras no haya un dominio propio verificado en Resend, el correo no sale y
   * el código se lo pasa el administrador a mano. La pantalla lo dice en vez de
   * mandar a nadie a mirar un buzón donde no hay nada.
   */
  readonly delivered = signal(true);

  readonly canRequest = computed(() => this.email().trim().length > 0 && !this.loading());
  readonly canVerify = computed(() => this.code().length === CODE_LENGTH && !this.loading());

  constructor() {
    // Al llegar el código, el foco va al campo: es lo único que queda por hacer.
    effect(() => {
      if (this.step() === 'code') this.codeInput()?.nativeElement.focus();
    });
  }

  onEmailInput(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }

  /** El campo del código solo admite dígitos: pegar "3176 2825" no debe romperlo. */
  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, CODE_LENGTH);
    input.value = digits;
    this.code.set(digits);
  }

  requestCode(): void {
    if (!this.canRequest()) return;

    this.loading.set(true);
    this.error.set(null);
    this.authService.requestCode(this.email().trim()).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.step.set('code');
        this.code.set('');
        this.delivered.set(res.delivered);
        this.notice.set(res.message);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(this.messageFrom(err, 'No se ha podido enviar el código. Inténtalo de nuevo.'));
      },
    });
  }

  verifyCode(): void {
    if (!this.canVerify()) return;

    this.loading.set(true);
    this.error.set(null);
    this.authService.verifyCode(this.email().trim(), this.code()).subscribe({
      next: () => this.router.navigateByUrl('/inicio'),
      error: (err) => {
        this.loading.set(false);
        this.code.set('');
        this.error.set(this.messageFrom(err, 'El código no es correcto.'));
      },
    });
  }

  /** Volver a escribir el email: el código pedido deja de servir en cuanto se pide otro. */
  backToEmail(): void {
    if (this.loading()) return;
    this.step.set('email');
    this.code.set('');
    this.error.set(null);
    this.notice.set(null);
    this.delivered.set(true);
  }

  loginAsTestUser(): void {
    if (this.loading()) return;

    this.loading.set(true);
    this.error.set(null);
    this.authService.loginAsTestUser().subscribe({
      next: () => this.router.navigateByUrl('/inicio'),
      error: () => {
        this.loading.set(false);
        this.error.set('No se ha podido entrar con la cuenta de prueba.');
      },
    });
  }

  /** El backend ya redacta los mensajes útiles ("Ese email no tiene acceso…"); se respetan. */
  private messageFrom(err: unknown, fallback: string): string {
    const apiError = (err as { error?: { error?: unknown } })?.error?.error;
    return typeof apiError === 'string' ? apiError : fallback;
  }
}
