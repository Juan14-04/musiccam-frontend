import { html } from '../../../shared/utils/html.js';
import { fromHtml } from '../../../shared/utils/dom.js';
import { setFieldError } from '../../../shared/ui/form-field.js';
import { openModal } from '../../../shared/ui/modal.js';
import { MOTIVO_MAX, validarMotivo } from '../admin.service.js';

/**
 * Diálogo que pide un motivo obligatorio (suspender un evento, rechazar un retiro). Resuelve el
 * motivo, o `null` si se cancela. La acción la ejecuta quien lo llama (así sus errores salen en
 * el aviso de la página).
 * @param {{titulo: string, mensaje: string, confirmar: string}} o
 * @returns {Promise<string|null>}
 */
export function pedirMotivo({ titulo, mensaje, confirmar }) {
  return new Promise((resolver) => {
    let motivo = null;
    const cuerpo = fromHtml(
      html`<p>${mensaje}</p>
        <div data-field="motivo">
          <label class="form-label" for="campo-motivo">Motivo (obligatorio)</label>
          <textarea
            id="campo-motivo"
            name="motivo"
            class="form-control"
            rows="3"
            maxlength="${MOTIVO_MAX}"
            aria-describedby="campo-motivo-error"
          ></textarea>
          <div class="invalid-feedback" id="campo-motivo-error" aria-live="polite"></div>
        </div>`,
      'form',
    );
    cuerpo.noValidate = true;
    const pie = fromHtml(
      html`<button type="button" class="btn btn-outline-secondary" data-action="cancelar">
          Cancelar
        </button>
        <button type="button" class="btn btn-danger" data-action="confirmar">${confirmar}</button>`,
      'div',
    );
    pie.className = 'd-flex flex-wrap justify-content-end gap-3';
    const { el, cerrar, cerrado } = openModal({ titulo, cuerpo, pie, tamano: 'sm' });

    const confirmarMotivo = () => {
      const texto = cuerpo.elements.motivo.value;
      const error = validarMotivo(texto);
      setFieldError(cuerpo, 'motivo', error ?? '');
      if (error) return cuerpo.elements.motivo.focus();
      motivo = texto.trim();
      cerrar();
    };
    cuerpo.addEventListener('submit', (e) => {
      e.preventDefault();
      confirmarMotivo();
    });
    el.addEventListener('click', (e) => {
      const accion = e.target.closest('[data-action]')?.dataset.action;
      if (accion === 'confirmar') confirmarMotivo();
      if (accion === 'cancelar') cerrar();
    });
    el.addEventListener('shown.bs.modal', () => cuerpo.elements.motivo.focus());
    cerrado.then(() => resolver(motivo));
  });
}

/**
 * Diálogo de detalles de una fila de administración: una lista de datos (uno por renglón) y,
 * opcionalmente, botones de acción. Resuelve la acción elegida, o `null` si se cierra. La acción
 * la ejecuta quien lo llama, una vez cerrado este diálogo (así sus errores salen en la página).
 * @param {{
 *   titulo: string,
 *   filas: Array<[string, unknown]>,
 *   acciones?: Array<{accion: string, texto: string, variante?: 'primary'|'danger'}>,
 * }} o
 * @returns {Promise<string|null>}
 */
export function verDetalles({ titulo, filas, acciones = [] }) {
  return new Promise((resolver) => {
    let elegida = null;
    const cuerpo = fromHtml(
      html`<dl class="admin-detalles">
        ${filas.map(
          ([etiqueta, valor]) => html`<div>
            <dt>${etiqueta}</dt>
            <dd>${valor ?? '—'}</dd>
          </div>`,
        )}
      </dl>`,
      'div',
    );
    const pie = fromHtml(
      html`<button type="button" class="btn btn-outline-secondary" data-action="cerrar">
          Cerrar
        </button>
        ${acciones.map(
          ({ accion, texto, variante = 'primary' }) =>
            html`<button
              type="button"
              class="btn ${variante === 'danger' ? 'btn-danger' : 'btn-primary'}"
              data-action="elegir"
              data-valor="${accion}"
            >
              ${texto}
            </button>`,
        )}`,
      'div',
    );
    pie.className = 'd-flex flex-wrap justify-content-end gap-3';
    const { el, cerrar, cerrado } = openModal({ titulo, cuerpo, pie });
    el.addEventListener('click', (e) => {
      const boton = e.target.closest('[data-action]');
      if (boton?.dataset.action === 'cerrar') cerrar();
      if (boton?.dataset.action === 'elegir') {
        elegida = boton.dataset.valor;
        cerrar();
      }
    });
    cerrado.then(() => resolver(elegida));
  });
}
