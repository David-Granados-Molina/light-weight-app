import { Injectable } from '@angular/core';
import { GOOGLE_CLIENT_ID } from '../config/auth.config';

declare const google: any;

@Injectable({ providedIn: 'root' })
export class GoogleIdentityService {
  readonly configured = !!GOOGLE_CLIENT_ID;

  private scriptPromise: Promise<void> | null = null;

  /** Carga el script de Google Identity Services y dibuja el botón "Continuar con Google". */
  async renderButton(element: HTMLElement, onCredential: (idToken: string) => void): Promise<void> {
    if (!this.configured) return;

    await this.loadScript();

    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response: { credential: string }) => onCredential(response.credential),
      // Sin esto, el selector de cuenta de Google no se abre en navegadores móviles que
      // bloquean cookies de terceros (Safari ITP, y crecientemente Chrome en Android).
      itp_support: true,
      use_fedcm_for_button: true,
    });

    google.accounts.id.renderButton(element, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      locale: 'es',
      width: element.clientWidth || 320,
    });
  }

  private loadScript(): Promise<void> {
    if (this.scriptPromise) return this.scriptPromise;

    this.scriptPromise = new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.accounts?.id) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('No se ha podido cargar Google Identity Services'));
      document.head.appendChild(script);
    });

    return this.scriptPromise;
  }
}
