import { html } from '../utils/html.js';

/**
 * Enlace para regresar a la pantalla anterior ("← Todos los eventos", "← Mis eventos"…):
 * botón suave en forma de píldora con flecha, igual en toda la aplicación.
 * @param {string} href destino (hash interno)
 * @param {string} texto
 */
export function backLink(href, texto) {
  return html`<a class="back-link" href="${href}">
    <i class="bi bi-arrow-left" aria-hidden="true"></i><span>${texto}</span>
  </a>`;
}
