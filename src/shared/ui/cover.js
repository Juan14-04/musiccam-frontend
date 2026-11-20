import { html } from '../utils/html.js';
import { categoryGradient } from '../utils/category-gradient.js';
import { trailerDe } from '../utils/trailer.js';
import { esUrlExternaSegura } from '../utils/validators.js';
import { youtubeThumbnailUrl } from '../utils/youtube-url.js';

/**
 * Portada de un evento: degradado por categoría siempre de fondo y, encima, lo primero que haya:
 * la foto (si la URL es segura), el primer cuadro del video del tráiler subido o la miniatura del
 * tráiler de YouTube. Si la imagen o el video fallan, `activarFallbackPortadas` los quita y queda
 * el degradado.
 * @param {{id: string, categoria: string, portada_url?: string|null, youtube_url?: string|null,
 *   trailer_video_url?: string|null}} evento
 * @param {string} [alt]
 */
export function coverMedia(evento, alt = '') {
  const fondo = categoryGradient(evento.categoria, evento.id);
  const trailer = trailerDe(evento);
  let capa = html``;
  if (esUrlExternaSegura(evento.portada_url)) {
    capa = imagen(evento.portada_url, alt);
  } else if (trailer?.tipo === 'video') {
    // `#t=0.5` muestra un cuadro del video (no el negro inicial); solo se descargan metadatos.
    capa = html`<video
      class="cover__img"
      src="${trailer.src}#t=0.5"
      muted
      playsinline
      preload="metadata"
      tabindex="-1"
      aria-hidden="true"
    ></video>`;
  } else if (trailer?.tipo === 'youtube') {
    capa = imagen(youtubeThumbnailUrl(trailer.url), alt);
  }
  return html`<span class="cover" style="background:${fondo}">${capa}</span>`;
}

function imagen(url, alt) {
  return html`<img class="cover__img" src="${url}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer" />`;
}

/** Imágenes o videos rotos se retiran para dejar ver el degradado (`error` no burbujea). */
export function activarFallbackPortadas(raiz) {
  raiz.addEventListener(
    'error',
    (e) => {
      const objetivo = e.target;
      const esMedio = objetivo instanceof HTMLImageElement || objetivo instanceof HTMLVideoElement;
      if (esMedio && objetivo.classList.contains('cover__img')) objetivo.remove();
    },
    true,
  );
}
