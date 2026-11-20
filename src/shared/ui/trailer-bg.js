import { html } from '../utils/html.js';
import { fromHtml } from '../utils/dom.js';
import { prefiereMenosMovimiento } from '../utils/motion.js';
import { trailerDe } from '../utils/trailer.js';
import { ORIGEN_YOUTUBE, youtubeBackgroundUrl } from '../utils/youtube-url.js';

/** Espera antes de cargar la vista previa al pasar el puntero (evita cargas al cruzar la fila). */
const ESPERA_VISTA_PREVIA_MS = 450;

/**
 * Capa de video de fondo según el tipo de tráiler: `<video>` nativo para el subido por el
 * artista o el reproductor de YouTube (silenciado, en bucle y sin controles) para el enlace.
 * @param {{tipo: 'video', src: string} | {tipo: 'youtube', url: string}} trailer
 * @param {string} titulo
 */
function capa(trailer, titulo) {
  if (trailer.tipo === 'video') {
    return html`<span class="trailer-bg" aria-hidden="true">
      <video
        class="trailer-bg__video"
        src="${trailer.src}"
        autoplay
        muted
        loop
        playsinline
        preload="auto"
        tabindex="-1"
      ></video>
    </span>`;
  }
  return html`<span class="trailer-bg" aria-hidden="true">
    <iframe
      class="trailer-bg__frame"
      src="${youtubeBackgroundUrl(trailer.url)}"
      title="Tráiler de ${titulo}"
      tabindex="-1"
      referrerpolicy="strict-origin-when-cross-origin"
      allow="autoplay; encrypted-media"
    ></iframe>
  </span>`;
}

/**
 * Tráiler del evento como video de fondo decorativo. Devuelve vacío si no hay tráiler o la
 * persona pidió menos movimiento.
 * @param {{titulo: string, youtube_url?: string|null, trailer_video_url?: string|null}} evento
 */
export function trailerFondo(evento) {
  const trailer = trailerDe(evento);
  if (!trailer || prefiereMenosMovimiento()) return html``;
  return capa(trailer, evento.titulo);
}

/** Pausa o reanuda el fondo, sea un `<video>` o el reproductor de YouTube. */
function pausar(contenedor, pausado) {
  const video = contenedor.querySelector('.trailer-bg__video');
  if (video) {
    if (pausado) video.pause();
    else video.play().catch(() => {});
    return;
  }
  // API IFrame de YouTube sin cargar su script: comandos por postMessage (`enablejsapi=1`).
  contenedor
    .querySelector('.trailer-bg__frame')
    ?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: pausado ? 'pauseVideo' : 'playVideo', args: [] }),
      ORIGEN_YOUTUBE,
    );
}

/**
 * Botón de pausa del hero: pausa el tráiler (o la animación simulada) y cambia su etiqueta.
 * Toda animación que dure más de 5 s debe poder detenerse (WCAG 2.2.2).
 * @param {HTMLElement} raiz
 */
function activarPausa(raiz) {
  const alHacerClic = (e) => {
    const boton = e.target.closest('[data-action="hero-pausa"]');
    if (!boton || !raiz.contains(boton)) return;
    const hero = boton.closest('.hero');
    const pausado = !hero.classList.contains('is-paused');
    hero.classList.toggle('is-paused', pausado);
    pausar(hero, pausado);
    boton.setAttribute('aria-pressed', String(pausado));
    boton.setAttribute(
      'aria-label',
      pausado ? 'Reproducir video de fondo' : 'Pausar video de fondo',
    );
    boton.querySelector('i').className = pausado ? 'bi bi-play-fill' : 'bi bi-pause-fill';
  };
  raiz.addEventListener('click', alHacerClic);
  return () => raiz.removeEventListener('click', alHacerClic);
}

/** Construye la capa de la vista previa a partir de los `data-*` de la tarjeta. */
function capaDesdeTarjeta(tarjeta) {
  const { trailerTipo: tipo, trailer: valor } = tarjeta.dataset;
  const trailer = tipo === 'video' ? { tipo, src: valor } : { tipo: 'youtube', url: valor };
  if (trailer.tipo === 'youtube' && !youtubeBackgroundUrl(valor)) return null;
  return fromHtml(capa(trailer, 'Vista previa del tráiler'), 'div').firstElementChild;
}

/**
 * Vista previa en las tarjetas: al dejar el puntero sobre una tarjeta con tráiler se reproduce
 * silenciado sobre el póster; al salir se retira. Solo con puntero real y sin `reduced-motion`.
 * @param {HTMLElement} raiz
 */
function activarVistaPrevia(raiz) {
  const conPuntero = typeof matchMedia === 'function' && matchMedia('(hover: hover)').matches;
  if (!conPuntero || prefiereMenosMovimiento()) return () => {};
  let temporizador = null;
  let activa = null;

  const quitar = () => {
    clearTimeout(temporizador);
    activa?.querySelector('.trailer-bg')?.remove();
    activa = null;
  };

  const alEntrar = (e) => {
    const tarjeta = e.target.closest?.('.event-card[data-trailer]');
    if (!tarjeta || tarjeta === activa || !raiz.contains(tarjeta)) return;
    quitar();
    activa = tarjeta;
    temporizador = setTimeout(() => {
      const poster = tarjeta.querySelector('.event-card__poster');
      const nodo = capaDesdeTarjeta(tarjeta);
      if (poster && nodo) poster.querySelector('.event-card__badges')?.before(nodo);
    }, ESPERA_VISTA_PREVIA_MS);
  };

  const alSalir = (e) => {
    if (activa && !activa.contains(e.relatedTarget)) quitar();
  };

  raiz.addEventListener('pointerover', alEntrar);
  raiz.addEventListener('pointerout', alSalir);
  return () => {
    quitar();
    raiz.removeEventListener('pointerover', alEntrar);
    raiz.removeEventListener('pointerout', alSalir);
  };
}

/**
 * Activa la pausa del hero y la vista previa de tráileres en las tarjetas dentro de `raiz`.
 * @param {HTMLElement} raiz
 * @returns {() => void} limpieza
 */
export function activarTrailers(raiz) {
  const quitarPausa = activarPausa(raiz);
  const quitarVistaPrevia = activarVistaPrevia(raiz);
  return () => {
    quitarPausa();
    quitarVistaPrevia();
  };
}
