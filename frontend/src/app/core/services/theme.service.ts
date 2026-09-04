import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'lw_theme';

/**
 * Modo claro / oscuro de la aplicación.
 *
 * Resuelve `system` a un valor concreto aquí, en TypeScript, y estampa siempre
 * `data-theme="light"` o `data-theme="dark"` en `<html>`. Así la hoja de estilos
 * solo necesita un bloque de tokens claros, en vez de repetirlo bajo el atributo
 * y bajo `prefers-color-scheme`.
 *
 * La clase `.app-dark` se mantiene sincronizada porque es el selector de modo
 * oscuro que tiene configurado PrimeNG en `app.config.ts`.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  readonly mode = signal<ThemeMode>(this.readStoredMode());

  /** El tema que se está pintando de verdad: `system` ya resuelto. */
  readonly resolved = signal<'light' | 'dark'>('dark');

  private media: MediaQueryList | null = null;

  constructor() {
    const win = this.document.defaultView;
    if (win?.matchMedia) {
      this.media = win.matchMedia('(prefers-color-scheme: light)');
      // Si el usuario deja el tema en "system", seguir al sistema en caliente.
      this.media.addEventListener('change', () => {
        if (this.mode() === 'system') this.apply();
      });
    }

    effect(() => {
      this.mode();
      this.apply();
    });
  }

  set(mode: ThemeMode): void {
    this.mode.set(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Sin almacenamiento el tema dura lo que la sesión; no es crítico.
    }
  }

  private apply(): void {
    const mode = this.mode();
    const resolved = mode === 'system' ? this.systemTheme() : mode;
    this.resolved.set(resolved);

    const root = this.document.documentElement;
    root.setAttribute('data-theme', resolved);
    root.classList.toggle('app-dark', resolved === 'dark');
  }

  private systemTheme(): 'light' | 'dark' {
    return this.media?.matches ? 'light' : 'dark';
  }

  private readStoredMode(): ThemeMode {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
    } catch {
      // localStorage no disponible: se parte del tema del sistema.
    }
    return 'system';
  }
}
