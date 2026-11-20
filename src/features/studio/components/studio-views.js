import { html } from '../../../shared/utils/html.js';
import { formatCop } from '../../../shared/utils/format-money.js';
import { formatDateTime } from '../../../shared/utils/format-date.js';
import { coverMedia } from '../../../shared/ui/cover.js';
import { liveBadge } from '../../../shared/ui/live-badge.js';
import { ETIQUETA_ESTADO, accionesDeEvento } from '../studio.service.js';

/** Insignia de estado con texto (el color no es la única señal). */
export function badgeEstado(estado) {
  if (estado === 'EN_VIVO') return liveBadge();
  return html`<span class="studio-state studio-state--${estado.toLowerCase()}"
    >${ETIQUETA_ESTADO[estado] ?? estado}</span
  >`;
}

const idCodificado = (evento) => encodeURIComponent(evento.id);

/** Texto, destino (enlace) o acción (botón) de cada acción del listado. */
function datosAccion(accion, evento) {
  const base = `#/estudio/eventos/${idCodificado(evento)}`;
  switch (accion) {
    case 'editar':
      return {
        texto: evento.estado === 'BORRADOR' ? 'Editar' : 'Editar o ver',
        icono: 'bi-pencil',
        href: `${base}/editar`,
      };
    case 'transmision':
      return {
        texto: evento.estado === 'EN_VIVO' ? 'Ir a la transmisión' : 'Sala de control',
        icono: 'bi-broadcast',
        href: `${base}/transmision`,
      };
    case 'estadisticas':
      return { texto: 'Estadísticas', icono: 'bi-bar-chart', href: `${base}/estadisticas` };
    case 'ver':
      return {
        texto: 'Ver página pública',
        icono: 'bi-box-arrow-up-right',
        href: `#/eventos/${idCodificado(evento)}`,
      };
    case 'publicar':
      return { texto: 'Publicar', icono: 'bi-send', accion: 'publicar' };
    case 'eliminar':
      return { texto: 'Eliminar', icono: 'bi-trash', accion: 'eliminar', peligro: true };
    case 'cancelar':
      return { texto: 'Cancelar evento', icono: 'bi-x-circle', accion: 'cancelar', peligro: true };
    default:
      return null;
  }
}

/** Botón principal de la fila (siempre visible). */
function botonPrincipal(accion, evento) {
  const d = datosAccion(accion, evento);
  if (!d) return html``;
  const contenido = html`<i class="bi ${d.icono}" aria-hidden="true"></i>${d.texto}`;
  return d.href
    ? html`<a class="btn btn-primary btn-sm" href="${d.href}">${contenido}</a>`
    : html`<button
        type="button"
        class="btn btn-primary btn-sm"
        data-action="${d.accion}"
        data-id="${evento.id}"
      >
        ${contenido}
      </button>`;
}

/** Entrada del menú "Opciones". */
function itemOpcion(accion, evento) {
  const d = datosAccion(accion, evento);
  if (!d) return html``;
  const clase = `dropdown-item d-flex align-items-center gap-2${d.peligro ? ' text-danger' : ''}`;
  const contenido = html`<i class="bi ${d.icono}" aria-hidden="true"></i>${d.texto}`;
  return html`<li>
    ${
      d.href
        ? html`<a class="${clase}" href="${d.href}">${contenido}</a>`
        : html`<button
            type="button"
            class="${clase}"
            data-action="${d.accion}"
            data-id="${evento.id}"
          >
            ${contenido}
          </button>`
    }
  </li>`;
}

const ENLACES = ['editar', 'transmision', 'estadisticas', 'ver'];

/** Qué acción va como botón principal: la sala de control si existe; si no, la más útil. */
const PRIORIDAD_PRINCIPAL = ['transmision', 'publicar', 'estadisticas', 'editar', 'ver'];

/**
 * Separa las acciones en la principal (botón visible) y el resto (menú "Opciones").
 * @param {string[]} acciones
 * @returns {{principal: string|null, opciones: string[]}}
 */
export function repartirAcciones(acciones) {
  const principal = PRIORIDAD_PRINCIPAL.find((a) => acciones.includes(a)) ?? null;
  return { principal, opciones: acciones.filter((a) => a !== principal) };
}

/**
 * Fila del listado con las acciones que permite su estado (§5.5): un botón principal (la sala de
 * control cuando existe) y el resto agrupado en el menú "Opciones". Con `soloEnlaces` se omiten
 * las acciones que necesitan manejador en la página (publicar, eliminar, cancelar).
 */
export function filaEvento(evento, { soloEnlaces = false } = {}) {
  const { principal, opciones } = repartirAcciones(
    accionesDeEvento(evento.estado).filter((a) => !soloEnlaces || ENLACES.includes(a)),
  );
  return html`<li class="studio-row" data-evento="${evento.id}">
    <span class="studio-row__thumb" aria-hidden="true">${coverMedia(evento)}</span>
    <div class="studio-row__info">
      <div class="d-flex flex-wrap align-items-center gap-2 mb-1">
        ${badgeEstado(evento.estado)}
        ${
          evento.estado === 'FINALIZADO' && evento.replay_disponible
            ? html`<span class="soft-badge">REPLAY</span>`
            : ''
        }
      </div>
      <p class="studio-row__title">${evento.titulo}</p>
      <p class="studio-row__meta">${formatDateTime(evento.fecha_inicio)} · ${formatCop(evento.precio_cop)}</p>
    </div>
    <div class="studio-row__actions">
      ${principal ? botonPrincipal(principal, evento) : ''}
      ${
        opciones.length
          ? html`<div class="dropdown">
              <button
                type="button"
                class="btn btn-outline-light btn-sm w-100"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                aria-label="Opciones de ${evento.titulo}"
              >
                <i class="bi bi-three-dots" aria-hidden="true"></i>Opciones
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                ${opciones.map((a) => itemOpcion(a, evento))}
              </ul>
            </div>`
          : ''
      }
    </div>
  </li>`;
}

export function esqueletoLista() {
  return html`<ul class="studio-list" aria-hidden="true">
    ${Array.from(
      { length: 4 },
      () => html`<li class="studio-row">
        <span class="skeleton" style="width:120px;aspect-ratio:16/9"></span>
        <div class="studio-row__info d-grid gap-2">
          <span class="skeleton" style="width:30%;height:14px"></span>
          <span class="skeleton" style="width:60%;height:18px"></span>
          <span class="skeleton" style="width:40%;height:14px"></span>
        </div>
      </li>`,
    )}
  </ul>`;
}
