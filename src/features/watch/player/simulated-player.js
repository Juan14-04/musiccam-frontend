import { html } from '../../../shared/utils/html.js';
import { setHtml } from '../../../shared/utils/dom.js';
import { coverMedia } from '../../../shared/ui/cover.js';
import { liveBadge, replayBadge } from '../../../shared/ui/live-badge.js';
import { trailerDe } from '../../../shared/utils/trailer.js';
import { youtubePlayerUrl } from '../../../shared/utils/youtube-url.js';

/** Segundos → `MM:SS` (o `H:MM:SS` desde la hora). */
export function formatDuracion(segundos) {
  const total = Math.max(0, Math.floor(segundos));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Escena con video: el tráiler de YouTube hace de transmisión. Las insignias van arriba para
 * no tapar los controles del reproductor. */
function escenaConVideo({ trailer, tipo, evento }) {
  const vivo = tipo === 'VIVO';
  const reproductor =
    trailer.tipo === 'video'
      ? html`<video
          class="player-sim__frame"
          src="${trailer.src}"
          autoplay
          muted
          ${vivo ? html`loop` : ''}
          controls
          playsinline
          aria-label="Transmisión simulada: ${evento.titulo}"
        ></video>`
      : html`<iframe
          class="player-sim__frame"
          src="${youtubePlayerUrl(trailer.url, { bucle: vivo })}"
          title="Transmisión simulada: ${evento.titulo}"
          referrerpolicy="strict-origin-when-cross-origin"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowfullscreen
        ></iframe>`;
  return html`<div class="player-sim player-sim--video">
    ${reproductor}
    <div class="player-sim__top" aria-hidden="true">
      ${vivo ? liveBadge() : replayBadge()}
      <span class="soft-badge">Reproducción simulada</span>
      <span class="player-sim__time" data-tiempo>00:00</span>
    </div>
  </div>`;
}

/** Escena sin video: póster, ecualizador animado y contador. */
function escenaSinVideo({ tipo, evento }) {
  return html`<div class="player-sim" role="img" aria-label="Reproductor simulado de ${evento.titulo}">
    ${coverMedia(evento)}
    <div class="player-sim__shade" aria-hidden="true"></div>
    <div class="player-sim__top">
      ${tipo === 'VIVO' ? liveBadge() : replayBadge()}
      <span class="soft-badge">Reproducción simulada</span>
    </div>
    <div class="player-sim__bottom" aria-hidden="true">
      <span class="eq"><i></i><i></i><i></i><i></i><i></i></span>
      <span class="player-sim__time" data-tiempo>00:00</span>
    </div>
  </div>`;
}

/**
 * Reproductor simulado (§5.3), usado mientras el backend entregue URLs ficticias. Si el evento
 * tiene tráiler (video subido o YouTube), lo reproduce como si fuera la transmisión (en vivo, en bucle); si no,
 * muestra el póster con un ecualizador. En ambos casos hay insignia EN VIVO/REPLAY y contador.
 * @implements {import('./player-adapter.js').PlayerAdapter}
 */
export class SimulatedPlayer {
  constructor() {
    this.temporizador = null;
  }

  async mount(el, { tipo, evento }) {
    this.destroy();
    // El tráiler (video subido o YouTube) hace de transmisión; sin tráiler, póster y ecualizador.
    const trailer = trailerDe(evento);
    setHtml(
      el,
      trailer ? escenaConVideo({ trailer, tipo, evento }) : escenaSinVideo({ tipo, evento }),
    );
    const tiempo = el.querySelector('[data-tiempo]');
    const inicio = Date.now();
    this.temporizador = setInterval(() => {
      tiempo.textContent = formatDuracion((Date.now() - inicio) / 1000);
    }, 1000);
  }

  destroy() {
    clearInterval(this.temporizador);
    this.temporizador = null;
  }
}
