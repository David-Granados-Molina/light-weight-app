import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { GoogleIdentityService } from '../../../core/services/google-identity.service';

@Component({
  selector: 'app-register',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements AfterViewInit {
  private readonly authService = inject(AuthService);
  private readonly googleIdentity = inject(GoogleIdentityService);
  private readonly router = inject(Router);

  readonly googleBtn = viewChild<ElementRef<HTMLDivElement>>('googleBtn');
  readonly googleAvailable = this.googleIdentity.configured;

  readonly name = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly confirmPassword = signal('');
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);

  ngAfterViewInit(): void {
    const el = this.googleBtn()?.nativeElement;
    if (el) this.googleIdentity.renderButton(el, (idToken) => this.onGoogleCredential(idToken));
  }

  onNameInput(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
  }

  onEmailInput(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }

  onPasswordInput(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
  }

  onConfirmPasswordInput(event: Event): void {
    this.confirmPassword.set((event.target as HTMLInputElement).value);
  }

  submit(): void {
    if (this.loading()) return;

    if (!this.name() || !this.email() || !this.password()) {
      this.error.set('Rellena todos los campos.');
      return;
    }
    if (this.password().length < 8) {
      this.error.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (this.password() !== this.confirmPassword()) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.authService.register({ name: this.name(), email: this.email(), password: this.password() }).subscribe({
      next: () => this.router.navigateByUrl('/inicio'),
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error ?? 'No se ha podido crear la cuenta.');
      },
    });
  }

  private onGoogleCredential(idToken: string): void {
    this.error.set(null);
    this.authService.loginWithGoogle(idToken).subscribe({
      next: () => this.router.navigateByUrl('/inicio'),
      error: () => this.error.set('No se ha podido continuar con Google.'),
    });
  }
}
