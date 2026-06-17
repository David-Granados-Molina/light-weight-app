import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { GoogleIdentityService } from '../../../core/services/google-identity.service';
import { ExerciseLoader } from '../../../shared/components/exercise-loader/exercise-loader';

@Component({
  selector: 'app-login',
  imports: [RouterLink, ExerciseLoader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements AfterViewInit {
  private readonly authService = inject(AuthService);
  private readonly googleIdentity = inject(GoogleIdentityService);
  private readonly router = inject(Router);

  readonly googleBtn = viewChild<ElementRef<HTMLDivElement>>('googleBtn');
  readonly googleAvailable = this.googleIdentity.configured;

  readonly email = signal('');
  readonly password = signal('');
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);

  readonly canSubmit = computed(() => this.email().trim().length > 0 && this.password().length > 0 && !this.loading());

  ngAfterViewInit(): void {
    const el = this.googleBtn()?.nativeElement;
    if (el) this.googleIdentity.renderButton(el, (idToken) => this.onGoogleCredential(idToken));
  }

  onEmailInput(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }

  onPasswordInput(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
  }

  submit(): void {
    if (!this.canSubmit()) return;

    this.loading.set(true);
    this.error.set(null);
    this.authService.login({ email: this.email(), password: this.password() }).subscribe({
      next: () => this.router.navigateByUrl('/inicio'),
      error: (err) => {
        this.loading.set(false);
        const apiError = err.error?.error;
        this.error.set(typeof apiError === 'string' ? apiError : 'Email o contraseña no válidos.');
      },
    });
  }

  loginAsTestUser(): void {
    if (this.loading()) return;

    this.loading.set(true);
    this.error.set(null);
    this.authService.login({ email: 'test@test.com', password: 'test' }).subscribe({
      next: () => this.router.navigateByUrl('/inicio'),
      error: () => {
        this.loading.set(false);
        this.error.set('No se ha podido iniciar sesión con la cuenta de prueba.');
      },
    });
  }

  private onGoogleCredential(idToken: string): void {
    if (this.loading()) return;

    this.loading.set(true);
    this.error.set(null);
    this.authService.loginWithGoogle(idToken).subscribe({
      next: () => this.router.navigateByUrl('/inicio'),
      error: () => {
        this.loading.set(false);
        this.error.set('No se ha podido iniciar sesión con Google.');
      },
    });
  }
}
