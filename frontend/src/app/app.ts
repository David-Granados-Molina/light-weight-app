import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { Novedad, novedadesPendientes, versionActual } from './core/novedades';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { WorkoutDraftStore } from './core/services/workout-draft.store';
import { ReleaseNotes } from './shared/components/release-notes/release-notes';
import { SessionConsole } from './shared/components/session-console/session-console';
import { SideRail } from './shared/components/side-rail/side-rail';
import { TabBar } from './shared/components/tab-bar/tab-bar';

const AUTH_ROUTE_PREFIXES = ['/login'];

const NOVEDADES_KEY = 'lw_novedades_vistas';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TabBar, SideRail, SessionConsole, ReleaseNotes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly draft = inject(WorkoutDraftStore);
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

  /**
   * La consola de sesión se muestra cuando hay un entreno a medias y no estamos
   * ya dentro de Registrar, donde el entreno es la pantalla entera. Vive aquí
   * porque el shell es lo único que conoce a la vez la ruta y el hueco que hay
   * que reservar al pie del contenido en móvil.
   */
  readonly showConsole = computed(
    () => this.draft.hasInProgress() && !this.isAuthRoute() && !this.url().startsWith('/registrar'),
  );

  private readonly pendientes = signal<Novedad[]>(novedadesPendientes(this.leerVersionVista()));

  /**
   * Lo nuevo se cuenta una vez y dentro de la aplicación, no en la pantalla de
   * entrada: quien todavía no ha entrado no tiene por qué leerlo.
   */
  readonly novedades = computed<Novedad[]>(() =>
    this.auth.isAuthenticated() && !this.isAuthRoute() ? this.pendientes() : [],
  );

  constructor() {
    effect(() => {
      const color = this.auth.currentUser()?.themeColor ?? '#ffbf00';
      this.document.documentElement.style.setProperty('--color-accent', color);
    });
  }

  cerrarNovedades(): void {
    this.pendientes.set([]);

    try {
      localStorage.setItem(NOVEDADES_KEY, versionActual());
    } catch {
      /* sin almacenamiento volverá a salir; es lo de menos */
    }
  }

  private leerVersionVista(): string | null {
    try {
      return localStorage.getItem(NOVEDADES_KEY);
    } catch {
      return null;
    }
  }
}
