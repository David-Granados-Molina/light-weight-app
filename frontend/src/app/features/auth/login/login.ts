import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { GoogleIdentityService } from '../../../core/services/google-identity.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
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
    if (!this.email() || !this.password() || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);
    this.authService.login({ email: this.email(), password: this.password() }).subscribe({
      next: () => this.router.navigateByUrl('/inicio'),
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error ?? 'No se ha podido iniciar sesión.');
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
