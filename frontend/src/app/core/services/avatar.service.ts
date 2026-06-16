import { HttpClient } from '@angular/common/http';
import { inject, Injectable, Injector, Signal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { map } from 'rxjs';
import { avatarSrc } from '../utils/avatar';

/**
 * Los SVG de los avatares reutilizan ids internos (ej. "m" para una mascara). Al insertarlos
 * en linea varios a la vez en el DOM, esos ids colisionan y todos acaban referenciando la
 * mascara del primero. Se sufijan con un identificador unico por avatar para evitarlo.
 */
function makeIdsUnique(svg: string, src: string): string {
  const suffix = src.replace(/[^a-zA-Z0-9]/g, '');
  return svg.replace(/(id="|url\(#)([\w-]+)/g, (_match, prefix, id) => `${prefix}${id}-${suffix}`);
}

/** Carga y cachea el SVG (en línea) de cada avatar, para que `currentColor` siga el tema activo. */
@Injectable({ providedIn: 'root' })
export class AvatarService {
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly injector = inject(Injector);
  private readonly cache = new Map<string, Signal<SafeHtml | null>>();
  private readonly rawCache = new Map<string, Signal<string | null>>();

  get(avatarId: string | null | undefined): Signal<SafeHtml | null> {
    const src = avatarSrc(avatarId);
    if (!src) return signal(null);

    let entry = this.cache.get(src);
    if (!entry) {
      entry = toSignal(
        this.http.get(src, { responseType: 'text' }).pipe(map((svg) => this.sanitizer.bypassSecurityTrustHtml(makeIdsUnique(svg, src)))),
        { initialValue: null, injector: this.injector },
      );
      this.cache.set(src, entry);
    }
    return entry;
  }

  /** Devuelve el texto SVG crudo (sin procesar) para usos como lightbox o blob URL. */
  getRaw(avatarId: string | null | undefined): Signal<string | null> {
    const src = avatarSrc(avatarId);
    if (!src) return signal(null);

    let entry = this.rawCache.get(src);
    if (!entry) {
      entry = toSignal(
        this.http.get(src, { responseType: 'text' }),
        { initialValue: null, injector: this.injector },
      );
      this.rawCache.set(src, entry);
    }
    return entry;
  }
}
