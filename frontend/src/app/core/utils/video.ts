/**
 * Utilidades para los enlaces de vídeo que se guardan en rutinas y ejercicios.
 *
 * Se escriben a mano en un campo de texto, así que llegan en cualquiera de las
 * formas que cada sitio reparte: la de la barra de direcciones, la de
 * "Compartir", la de un Short o Reel y la de un vídeo ya incrustado.
 *
 * Se reconocen tres sitios —YouTube, TikTok e Instagram— porque son de los que
 * se copian los vídeos de técnica. Un enlace de cualquier otro sitio no es un
 * error: no se puede incrustar, pero se sigue guardando y abriendo fuera.
 */

export type VideoProvider = 'youtube' | 'tiktok' | 'instagram';

export interface VideoRef {
  provider: VideoProvider;
  /** El identificador dentro del sitio: id de YouTube, id de TikTok, código de Instagram. */
  id: string;
  /** URL para incrustar en un `<iframe>`. */
  embedUrl: string;
}

/** Anfitriones de cada sitio, sin `www.` y en minúsculas. */
const HOSTS: Record<VideoProvider, ReadonlySet<string>> = {
  youtube: new Set(['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be']),
  tiktok: new Set(['tiktok.com', 'm.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com']),
  instagram: new Set(['instagram.com', 'instagr.am', 'ddinstagram.com']),
};

/** Un id de YouTube son 11 caracteres de su alfabeto; nada más se acepta. */
const YOUTUBE_ID = /^[\w-]{11}$/;

/** Los id de TikTok son numéricos y largos (19 dígitos hoy, con margen). */
const TIKTOK_ID = /^\d{6,25}$/;

/** El código corto de Instagram es base64 web, típicamente de 11 caracteres. */
const INSTAGRAM_CODE = /^[\w-]{5,20}$/;

function hostOf(url: URL): string {
  return url.hostname.replace(/^www\./, '').toLowerCase();
}

function providerOf(host: string): VideoProvider | null {
  for (const provider of Object.keys(HOSTS) as VideoProvider[]) {
    if (HOSTS[provider].has(host)) return provider;
  }
  return null;
}

function parseYoutube(url: URL, host: string, segments: string[]): string | null {
  // youtu.be/ID y youtube.com/embed/ID | /shorts/ID | /live/ID | /v/ID llevan el id en la ruta.
  const candidate =
    host === 'youtu.be'
      ? segments[0]
      : segments[0] === 'embed' || segments[0] === 'shorts' || segments[0] === 'live' || segments[0] === 'v'
        ? segments[1]
        : url.searchParams.get('v');

  return candidate && YOUTUBE_ID.test(candidate) ? candidate : null;
}

function parseTiktok(segments: string[]): string | null {
  // La forma larga es /@usuario/video/ID; la de "Compartir" en la app es
  // /embed/v2/ID. Los acortadores (vm.tiktok.com/XXXX) no llevan el id dentro,
  // así que no se pueden incrustar sin resolver la redirección.
  const videoIndex = segments.indexOf('video');
  const candidate =
    videoIndex >= 0
      ? segments[videoIndex + 1]
      : segments[0] === 'embed'
        ? segments[segments.length - 1]
        : null;

  return candidate && TIKTOK_ID.test(candidate) ? candidate : null;
}

function parseInstagram(segments: string[]): string | null {
  // /p/CODIGO, /reel/CODIGO y /tv/CODIGO, con o sin /@usuario delante.
  const kindIndex = segments.findIndex((s) => s === 'p' || s === 'reel' || s === 'reels' || s === 'tv');
  const candidate = kindIndex >= 0 ? segments[kindIndex + 1] : null;

  return candidate && INSTAGRAM_CODE.test(candidate) ? candidate : null;
}

/**
 * Reconoce el enlace y devuelve con qué incrustarlo, o `null` si no es de
 * ninguno de los tres sitios o está mal escrito. No lanza: un campo a medio
 * teclear es un caso normal, no un error.
 */
export function parseVideoUrl(rawUrl: string | null | undefined): VideoRef | null {
  const raw = rawUrl?.trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  const host = hostOf(url);
  const provider = providerOf(host);
  if (!provider) return null;

  const segments = url.pathname.split('/').filter(Boolean);

  switch (provider) {
    case 'youtube': {
      const id = parseYoutube(url, host, segments);
      // `youtube-nocookie` para no dejar cookies de seguimiento a quien solo
      // quería ver cómo se hace un ejercicio.
      return id ? { provider, id, embedUrl: `https://www.youtube-nocookie.com/embed/${id}` } : null;
    }
    case 'tiktok': {
      const id = parseTiktok(segments);
      return id ? { provider, id, embedUrl: `https://www.tiktok.com/embed/v2/${id}` } : null;
    }
    case 'instagram': {
      const id = parseInstagram(segments);
      return id ? { provider, id, embedUrl: `https://www.instagram.com/p/${id}/embed` } : null;
    }
  }
}

/** URL para incrustar el vídeo en un `<iframe>`, o `null` si no se reconoce. */
export function videoEmbedUrl(rawUrl: string | null | undefined): string | null {
  return parseVideoUrl(rawUrl)?.embedUrl ?? null;
}

/** Nombre del sitio, para decir en la interfaz de dónde sale el vídeo. */
export const VIDEO_PROVIDER_LABEL: Record<VideoProvider, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
};
