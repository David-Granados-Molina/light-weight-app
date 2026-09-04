/**
 * Utilidades para los enlaces de vídeo que se guardan en rutinas y ejercicios.
 *
 * Se escriben a mano en un campo de texto, así que llegan en cualquiera de las
 * formas que YouTube reparte: la de la barra de direcciones, la de "Compartir",
 * la de un Short y la de un vídeo ya incrustado.
 */

/** Anfitriones de YouTube, sin `www.` y en minúsculas. */
const YOUTUBE_HOSTS = new Set(['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be']);

/** Un id de YouTube son 11 caracteres de su alfabeto; nada más se acepta. */
const VIDEO_ID = /^[\w-]{11}$/;

/**
 * Devuelve el id del vídeo de YouTube, o `null` si el enlace no lo es o está
 * mal escrito. No lanza: un campo a medio teclear es un caso normal, no un error.
 */
export function youtubeVideoId(rawUrl: string | null | undefined): string | null {
  const raw = rawUrl?.trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return null;

  // youtu.be/ID y youtube.com/embed/ID | /shorts/ID | /v/ID llevan el id en la ruta.
  const segments = url.pathname.split('/').filter(Boolean);
  const candidate =
    host === 'youtu.be'
      ? segments[0]
      : segments[0] === 'embed' || segments[0] === 'shorts' || segments[0] === 'v'
        ? segments[1]
        : url.searchParams.get('v');

  return candidate && VIDEO_ID.test(candidate) ? candidate : null;
}

/**
 * URL para incrustar el vídeo en un `<iframe>`, o `null` si no es de YouTube.
 *
 * Se usa `youtube-nocookie.com` para no dejar cookies de seguimiento a quien
 * solo quería ver cómo se calienta.
 */
export function youtubeEmbedUrl(rawUrl: string | null | undefined): string | null {
  const id = youtubeVideoId(rawUrl);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}
