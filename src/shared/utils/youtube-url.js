const DOMINIOS_YOUTUBE = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);
const ID_VIDEO = /^[A-Za-z0-9_-]{11}$/;

/** Devuelve el ID de un video de YouTube válido, o null si la URL no es compatible. */
export function youtubeVideoId(valor) {
  if (typeof valor !== 'string' || valor.length > 255) return null;
  let url;
  try {
    url = new URL(valor);
  } catch {
    return null;
  }
  const dominio = url.hostname.toLowerCase();
  if (
    url.protocol !== 'https:' ||
    !DOMINIOS_YOUTUBE.has(dominio) ||
    url.username ||
    url.password ||
    url.port
  ) {
    return null;
  }

  const partes = url.pathname.split('/').filter(Boolean);
  let id = null;
  if (dominio === 'youtu.be' || dominio === 'www.youtu.be') {
    id = partes[0];
  } else if (url.pathname === '/watch') {
    id = url.searchParams.get('v');
  } else if (['embed', 'live', 'shorts'].includes(partes[0])) {
    id = partes[1];
  }
  return id && ID_VIDEO.test(id) ? id : null;
}

/** Crea una URL de inserción en el dominio de privacidad mejorada de YouTube. */
export function youtubeEmbedUrl(valor) {
  const id = youtubeVideoId(valor);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;
}

/** Origen al que se envían los comandos `postMessage` del reproductor insertado. */
export const ORIGEN_YOUTUBE = 'https://www.youtube-nocookie.com';

/**
 * Miniatura pública del video. `hqdefault` siempre existe; es 4:3 con franjas, pero dentro de un
 * contenedor 16:9 con `object-fit: cover` el recorte deja justo el área del video.
 */
export function youtubeThumbnailUrl(valor) {
  const id = youtubeVideoId(valor);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

/**
 * URL para usar el tráiler como video de fondo: silenciado, en bucle, sin controles ni teclado.
 * `enablejsapi=1` permite pausarlo con `postMessage` (botón de pausa, WCAG 2.2.2).
 */
export function youtubeBackgroundUrl(valor) {
  const id = youtubeVideoId(valor);
  if (!id) return null;
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    loop: '1',
    playlist: id,
    controls: '0',
    disablekb: '1',
    playsinline: '1',
    rel: '0',
    iv_load_policy: '3',
    enablejsapi: '1',
  });
  return `${ORIGEN_YOUTUBE}/embed/${id}?${params}`;
}

/**
 * URL para usar el tráiler como transmisión simulada: arranca solo y silenciado (los navegadores
 * bloquean el autoplay con sonido) y con controles para activar el audio. En vivo se repite en
 * bucle; el replay se reproduce una vez.
 * @param {string} valor
 * @param {{bucle?: boolean}} [opciones]
 */
export function youtubePlayerUrl(valor, { bucle = false } = {}) {
  const id = youtubeVideoId(valor);
  if (!id) return null;
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    controls: '1',
    playsinline: '1',
    rel: '0',
    iv_load_policy: '3',
  });
  if (bucle) {
    params.set('loop', '1');
    params.set('playlist', id);
  }
  return `${ORIGEN_YOUTUBE}/embed/${id}?${params}`;
}
