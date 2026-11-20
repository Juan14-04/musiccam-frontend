import { html } from '../utils/html.js';
import { formatDateMedium } from '../utils/format-date.js';
import { prefiereMenosMovimiento } from '../utils/motion.js';
import { trailerDe } from '../utils/trailer.js';
import { coverMedia } from './cover.js';
import { estadoBadge } from './live-badge.js';
import { trailerFondo } from './trailer-bg.js';

/** Botón para detener el movimiento del fondo (WCAG 2.2.2). */
function botonPausa() {
  return html`<button
    type="button"
    class="hero__pause btn btn-sm btn-dark rounded-circle"
    data-action="hero-pausa"
    aria-pressed="false"
    aria-label="Pausar video de fondo"
  >
    <i class="bi bi-pause-fill" aria-hidden="true"></i>
  </button>`;
}

/**
 * Hero a todo el ancho. De fondo, el tráiler del evento (video subido o YouTube, silenciado y en bucle);
 * si el artista no subió tráiler, una presentación simulada: la portada en movimiento lento con
 * un ecualizador. Con `prefers-reduced-motion` queda la portada fija y sin botón de pausa.
 * La interacción (pausa) la activa `activarTrailers` de `trailer-bg.js`.
 * @param {{evento: object, cta: {href: string, texto: string}}} o
 */
export function hero({ evento, cta }) {
  const conMovimiento = !prefiereMenosMovimiento();
  const conVideo = conMovimiento && Boolean(trailerDe(evento));
  const simulado = conMovimiento && !conVideo;
  const clases = ['hero', conVideo ? 'hero--video' : '', simulado ? 'hero--sim' : '']
    .filter(Boolean)
    .join(' ');

  return html`<section class="${clases}" aria-labelledby="hero-titulo">
    <div class="hero__media" aria-hidden="true">
      ${coverMedia(evento)} ${conVideo ? trailerFondo(evento) : ''}
    </div>
    <div class="hero__shade" aria-hidden="true"></div>
    ${
      simulado
        ? html`<span class="hero__eq eq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>`
        : ''
    }
    ${conMovimiento ? botonPausa() : ''}
    <div class="container hero__content">
      <div class="mb-2">${estadoBadge(evento)}</div>
      <h1 id="hero-titulo" class="hero__title">${evento.titulo}</h1>
      <p class="hero__meta">
        ${evento.artista?.nombre_artistico ?? ''} · ${formatDateMedium(evento.fecha_inicio)}
      </p>
      <a class="btn btn-primary btn-lg rounded-pill px-4" href="${cta.href}">${cta.texto}</a>
    </div>
  </section>`;
}
