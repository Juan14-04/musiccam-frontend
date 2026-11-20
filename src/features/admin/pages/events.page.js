import { html } from '../../../shared/utils/html.js';
import { formatCop } from '../../../shared/utils/format-money.js';
import { formatDateMedium, formatTime } from '../../../shared/utils/format-date.js';
import { CATEGORIAS, etiquetaCategoria } from '../../../shared/utils/categorias.js';
import { confirmDialog } from '../../../shared/ui/confirm-dialog.js';
import {
  ESTADOS_EVENTO,
  cargarEventos,
  filtrosAQuery,
  leerFiltrosEventos,
  reactivarEvento,
  suspenderEvento,
  validarRango,
} from '../admin.service.js';
import { crearPaginaLista } from '../components/admin-list.js';
import { badge, badgeEstadoEvento, sinDato } from '../components/admin-ui.js';
import { pedirMotivo, verDetalles } from '../components/dialogs.js';
import { filtroFecha, filtroSelect, filtroTexto } from '../components/filtros-ui.js';

/** Suspender (con motivo) y reactivar: se eligen desde el diálogo de detalles. */
const accionesEvento = {
  suspender: async ({ item, ejecutar }) => {
    const motivo = await pedirMotivo({
      titulo: 'Suspender evento',
      mensaje: `«${item.titulo}» saldrá del catálogo y no se podrá comprar ni ver. Indica el motivo.`,
      confirmar: 'Suspender evento',
    });
    if (motivo) ejecutar(() => suspenderEvento(item.id, motivo), 'Evento suspendido.');
  },
  reactivar: async ({ item, ejecutar }) => {
    const ok = await confirmDialog({
      titulo: 'Reactivar evento',
      mensaje: `¿Reactivar «${item.titulo}»? Volverá al catálogo y se podrá comprar y ver de nuevo.`,
      confirmar: 'Reactivar',
    });
    if (ok) ejecutar(() => reactivarEvento(item.id), 'Evento reactivado.');
  },
};

/** Eventos: todos los estados, con filtros; los detalles permiten suspender o reactivar. */
export const adminEventsPage = crearPaginaLista({
  titulo: 'Eventos',
  descripcion:
    'Todos los eventos, también borradores, cancelados y suspendidos. Suspender corta la venta y la reproducción, pero no cancela el evento.',
  ruta: '#/admin/eventos',
  leerFiltros: leerFiltrosEventos,
  aQuery: (f) => filtrosAQuery(f),
  formularioFiltros: (f) => html`
    ${filtroTexto({
      name: 'q',
      label: 'Buscar',
      valor: f.q,
      placeholder: 'Título o artista',
      retraso: true,
      maxlength: 100,
    })}
    ${filtroSelect({ name: 'categoria', label: 'Categoría', valor: f.categoria, opciones: CATEGORIAS })}
    ${filtroSelect({ name: 'estado', label: 'Estado', valor: f.estado, opciones: ESTADOS_EVENTO })}
    ${filtroSelect({
      name: 'suspendido',
      label: 'Moderación',
      valor: f.suspendido,
      opciones: [
        ['true', 'Suspendidos'],
        ['false', 'No suspendidos'],
      ],
    })}
    ${filtroFecha({ name: 'desde', label: 'Desde', valor: f.desde })}
    ${filtroFecha({ name: 'hasta', label: 'Hasta', valor: f.hasta })}
  `,
  leerFormulario: (form) => ({
    q: form.elements.q.value.trim(),
    categoria: form.elements.categoria.value,
    estado: form.elements.estado.value,
    suspendido: form.elements.suspendido.value,
    desde: form.elements.desde.value,
    hasta: form.elements.hasta.value,
  }),
  validar: validarRango,
  cargar: cargarEventos,
  columnas: [
    'Evento',
    'Artista',
    'Categoría',
    'Estado',
    'Moderación',
    'Fecha',
    'Hora',
    'Precio',
    'Detalles',
  ],
  fila: (e) => html`<tr data-id="${e.id}">
    <td class="admin-celda-texto">
      <a href="#/eventos/${encodeURIComponent(e.id)}" title="${e.titulo}">${e.titulo}</a>
    </td>
    <td class="admin-celda-texto" title="${e.artista?.nombre_artistico ?? ''}">
      ${e.artista?.nombre_artistico || sinDato()}
    </td>
    <td>${etiquetaCategoria(e.categoria)}</td>
    <td>${badgeEstadoEvento(e.estado)}</td>
    <td>${e.suspendido_admin ? badge('Suspendido', 'danger') : badge('Activo', 'ok')}</td>
    <td>${formatDateMedium(e.fecha_inicio)}</td>
    <td>${formatTime(e.fecha_inicio)}</td>
    <td>${formatCop(e.precio_cop)}</td>
    <td>
      <button
        type="button"
        class="btn btn-outline-light btn-sm"
        data-action="detalles"
        data-id="${e.id}"
        aria-label="Ver detalles de ${e.titulo}"
      >
        Ver detalles
      </button>
    </td>
  </tr>`,
  vacio: (f) =>
    Object.entries(f).some(([k, v]) => k !== 'page' && v !== '')
      ? {
          icono: 'bi-funnel',
          titulo: 'No hay eventos con esos filtros',
          mensaje: 'Prueba con otra búsqueda o quita algún filtro.',
        }
      : {
          icono: 'bi-calendar-x',
          titulo: 'Aún no hay eventos',
          mensaje: 'Los artistas aún no han creado eventos.',
        },
  acciones: {
    detalles: async (contexto) => {
      const e = contexto.item;
      const accion = await verDetalles({
        titulo: e.titulo,
        filas: [
          ['Moderación', e.suspendido_admin ? 'Suspendido' : 'Activo'],
          [
            'Motivo de suspensión',
            (e.suspendido_admin && e.motivo_suspension) ||
              'Sin motivo: el evento no está suspendido.',
          ],
        ],
        acciones: [
          e.suspendido_admin
            ? { accion: 'reactivar', texto: 'Reactivar evento' }
            : { accion: 'suspender', texto: 'Suspender evento', variante: 'danger' },
        ],
      });
      if (accion) accionesEvento[accion](contexto);
    },
  },
});
