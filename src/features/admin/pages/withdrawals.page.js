import { html } from '../../../shared/utils/html.js';
import { formatCop } from '../../../shared/utils/format-money.js';
import { formatDateMedium, formatTime } from '../../../shared/utils/format-date.js';
import { confirmDialog } from '../../../shared/ui/confirm-dialog.js';
import {
  ESTADOS_RETIRO,
  ETIQUETA_TIPO_CUENTA,
  aprobarRetiro,
  cargarRetiros,
  filtrosRetirosAQuery,
  leerFiltrosRetiros,
  rechazarRetiro,
} from '../admin.service.js';
import { crearPaginaLista } from '../components/admin-list.js';
import { badgeEstadoRetiro } from '../components/admin-ui.js';
import { pedirMotivo, verDetalles } from '../components/dialogs.js';
import { filtroSelect } from '../components/filtros-ui.js';

/** Aprobar (con confirmación) y rechazar (con motivo): se eligen desde los detalles. */
const accionesRetiro = {
  aprobar: async ({ item, ejecutar }) => {
    const ok = await confirmDialog({
      titulo: 'Aprobar retiro',
      mensaje: `¿Aprobar el retiro de ${formatCop(item.monto_cop)} para ${item.artista?.nombre_artistico} (${item.banco} ••••${item.cuenta_ultimos4})? Se marcará como pagado (simulado).`,
      confirmar: 'Aprobar retiro',
    });
    if (ok) ejecutar(() => aprobarRetiro(item.id), 'Retiro aprobado y pagado.');
  },
  rechazar: async ({ item, ejecutar }) => {
    const motivo = await pedirMotivo({
      titulo: 'Rechazar retiro',
      mensaje: `Vas a rechazar el retiro de ${formatCop(item.monto_cop)} de ${item.artista?.nombre_artistico}. El dinero volverá a su saldo disponible.`,
      confirmar: 'Rechazar retiro',
    });
    if (motivo) ejecutar(() => rechazarRetiro(item.id, motivo), 'Retiro rechazado.');
  },
};

/** Cola de retiros: aprobar (con confirmación) o rechazar (con motivo obligatorio). */
export const withdrawalsPage = crearPaginaLista({
  titulo: 'Retiros',
  descripcion:
    'Cola de retiros de los artistas. Aprobar marca el retiro como pagado (simulado); rechazar exige un motivo y devuelve el dinero al saldo disponible.',
  ruta: '#/admin/retiros',
  leerFiltros: leerFiltrosRetiros,
  aQuery: filtrosRetirosAQuery,
  formularioFiltros: (f) =>
    filtroSelect({ name: 'estado', label: 'Estado', valor: f.estado, opciones: ESTADOS_RETIRO }),
  leerFormulario: (form) => ({ estado: form.elements.estado.value }),
  cargar: cargarRetiros,
  columnas: ['Artista', 'Monto', 'Estado', 'Fecha', 'Hora', 'Detalles'],
  fila: (r) => html`<tr data-id="${r.id}">
    <td class="admin-celda-texto" title="${r.artista?.nombre_artistico}">
      ${r.artista?.nombre_artistico}
    </td>
    <td class="fw-semibold">${formatCop(r.monto_cop)}</td>
    <td>${badgeEstadoRetiro(r.estado)}</td>
    <td>${formatDateMedium(r.solicitado_en)}</td>
    <td>${formatTime(r.solicitado_en)}</td>
    <td>
      <button
        type="button"
        class="btn btn-outline-light btn-sm"
        data-action="detalles"
        data-id="${r.id}"
        aria-label="Ver detalles del retiro de ${r.artista?.nombre_artistico ?? ''}"
      >
        Ver detalles
      </button>
    </td>
  </tr>`,
  vacio: (f) =>
    f.estado === 'PENDIENTE'
      ? {
          icono: 'bi-check2-all',
          titulo: 'No hay retiros pendientes',
          mensaje: 'La cola está al día. Cambia el filtro para ver los ya resueltos.',
        }
      : f.estado
        ? {
            icono: 'bi-funnel',
            titulo: 'No hay retiros con ese estado',
            mensaje: 'Prueba con otro filtro.',
          }
        : {
            icono: 'bi-cash-coin',
            titulo: 'Aún no hay retiros',
            mensaje: 'Los retiros que soliciten los artistas aparecerán aquí.',
          },
  acciones: {
    detalles: async (contexto) => {
      const r = contexto.item;
      const accion = await verDetalles({
        titulo: `Retiro de ${r.artista?.nombre_artistico ?? ''}`,
        filas: [
          ['Banco', r.banco],
          ['Tipo de cuenta', ETIQUETA_TIPO_CUENTA[r.tipo_cuenta] ?? r.tipo_cuenta],
          ['Cuenta', `••••${r.cuenta_ultimos4}`],
          ['Resuelto', r.resuelto_en ? formatDateMedium(r.resuelto_en) : '—'],
          [
            'Referencia de pago',
            r.estado === 'PAGADO' && r.referencia_pago
              ? html`<span class="admin-ref">${r.referencia_pago}</span>`
              : '—',
          ],
          [
            'Motivo de rechazo',
            r.estado === 'RECHAZADO' ? r.motivo_rechazo || 'Sin motivo indicado.' : '—',
          ],
        ],
        acciones:
          r.estado === 'PENDIENTE'
            ? [
                { accion: 'rechazar', texto: 'Rechazar', variante: 'danger' },
                { accion: 'aprobar', texto: 'Aprobar retiro' },
              ]
            : [],
      });
      if (accion) accionesRetiro[accion](contexto);
    },
  },
});
