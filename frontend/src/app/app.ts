import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { SideRail } from './shared/components/side-rail/side-rail';
import { TabBar } from './shared/components/tab-bar/tab-bar';

const AUTH_ROUTE_PREFIXES = ['/login'];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TabBar, SideRail],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  /** Se inyecta para que exista desde el arranque: su effect estampa el tema. */
  private readonly theme = inject(ThemeService);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  readonly isAuthRoute = computed(() => AUTH_ROUTE_PREFIXES.some((prefix) => this.url().startsWith(prefix)));

  constructor() {
    effect(() => {
      const color = this.auth.currentUser()?.themeColor ?? '#ffbf00';
      this.document.documentElement.style.setProperty('--color-accent', color);
    });
  }
}
