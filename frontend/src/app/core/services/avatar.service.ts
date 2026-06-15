import { HttpClient } from '@angular/common/http';
import { inject, Injectable, Signal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { map } from 'rxjs';
import { avatarSrc } from '../utils/avatar';

/** Carga y cachea el SVG (en línea) de cada avatar, para que `currentColor` siga el tema activo. */
@Injectable({ providedIn: 'root' })
export class AvatarService {
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cache = new Map<string, Signal<SafeHtml | null>>();

  get(avatarId: string | null | undefined): Signal<SafeHtml | null> {
    const src = avatarSrc(avatarId);
    if (!src) return signal(null);

    let entry = this.cache.get(src);
    if (!entry) {
      entry = toSignal(
        this.http.get(src, { responseType: 'text' }).pipe(map((svg) => this.sanitizer.bypassSecurityTrustHtml(svg))),
        { initialValue: null },
      );
      this.cache.set(src, entry);
    }
    return entry;
  }
}
