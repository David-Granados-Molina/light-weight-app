import { HttpClient } from '@angular/common/http';
import { Injectable, Signal, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Observable, asapScheduler, map, observeOn, shareReplay } from 'rxjs';
import { avatarSrc } from '../utils/avatar';

/**
 * Los SVG de los avatares reutilizan ids internos (p. ej. "m" para una máscara). Al insertarlos
 * en línea varios a la vez en el DOM, esos ids colisionan: todos los `url(#m)` resuelven contra
 * el primero y el resultado es un bloque de color macizo en lugar de la figura.
 *
 * El sufijo tiene que ser único por INSTANCIA, no por avatar: dos avatares iguales en la misma
 * página (la cabecera y el rail, el perfil y su selector) chocan igual entre sí.
 */
let instanceCounter = 0;

function makeIdsUnique(svg: string, src: string): string {
  const suffix = `${src.replace(/[^a-zA-Z0-9]/g, '')}-${++instanceCounter}`;
  return svg.replace(/(id="|url\(#)([\w-]+)/g, (_match, prefix, id) => `${prefix}${id}-${suffix}`);
}

/** Carga y cachea el SVG (en línea) de cada avatar, para que `currentColor` siga el tema activo. */
@Injectable({ providedIn: 'root' })
export class AvatarService {
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cache = new Map<string, Signal<SafeHtml | null>>();
  private readonly rawCache = new Map<string, Signal<string | null>>();
  private readonly textCache = new Map<string, Observable<string>>();

  /**
   * Devuelve el SVG listo para inyectar, con los ids ya desambiguados.
   *
   * `key` identifica al consumidor: cada componente que pinta un avatar pasa una clave propia,
   * de modo que dos instancias del mismo avatar reciben markup con ids distintos. Sin ella, la
   * caché por `src` devolvería a todos exactamente el mismo HTML y volverían a colisionar.
   */
  get(avatarId: string | null | undefined, key = ''): Signal<SafeHtml | null> {
    const src = avatarSrc(avatarId);
    if (!src) return signal(null);

    const cacheKey = `${src}|${key}`;
    let entry = this.cache.get(cacheKey);
    if (!entry) {
      // Un signal de escritura actualizado vía subscribe, en vez de toSignal(): este método se
      // llama a menudo desde dentro de un computed() (AppAvatar), y toSignal() lanza NG0602 si
      // se invoca por primera vez (cache vacía) en ese contexto reactivo.
      const sig = signal<SafeHtml | null>(null);
      // `observeOn(asapScheduler)`: la caché de texto reemite de forma síncrona a los
      // suscriptores tardíos, y este método se llama desde dentro de un computed() (AppAvatar).
      // Escribir el signal ahí mismo lanza NG0600, así que la emisión se aplaza un microtask.
      this.rawText(src)
        .pipe(
          map((svg) => this.sanitizer.bypassSecurityTrustHtml(makeIdsUnique(svg, src))),
          observeOn(asapScheduler),
        )
        .subscribe((html) => sig.set(html));
      entry = sig;
      this.cache.set(cacheKey, entry);
    }
    return entry;
  }

  /** Devuelve el texto SVG crudo (sin procesar) para usos como lightbox o blob URL. */
  getRaw(avatarId: string | null | undefined): Signal<string | null> {
    const src = avatarSrc(avatarId);
    if (!src) return signal(null);

    let entry = this.rawCache.get(src);
    if (!entry) {
      const sig = signal<string | null>(null);
      this.rawText(src)
        .pipe(observeOn(asapScheduler))
        .subscribe((text) => sig.set(text));
      entry = sig;
      this.rawCache.set(src, entry);
    }
    return entry;
  }

  /**
   * Una sola descarga por fichero, compartida por todos los consumidores: la desambiguación de
   * ids se hace después, sobre el texto ya en memoria, para no pedir el mismo SVG una vez por
   * instancia pintada.
   */
  private rawText(src: string): Observable<string> {
    let entry = this.textCache.get(src);
    if (!entry) {
      entry = this.http.get(src, { responseType: 'text' }).pipe(shareReplay({ bufferSize: 1, refCount: false }));
      this.textCache.set(src, entry);
    }
    return entry;
  }
}
