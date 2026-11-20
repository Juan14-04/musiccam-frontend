import { html } from '../../../shared/utils/html.js';
import { formatCop } from '../../../shared/utils/format-money.js';
import { formatDateMedium, formatTime } from '../../../shared/utils/format-date.js';
import {
  ESTADOS_COMPRA,
  METODOS_PAGO,
  cargarCompras,
  filtrosAQuery,
  leerFiltrosCompras,
  validarRango,
} from '../admin.service.js';
import { crearPaginaLista } from '../components/admin-list.js';
import { badgeEstadoCompra, badgeEstadoEvento } from '../components/admin-ui.js';
import { verDetalles } from '../components/dialogs.js';
import { filtroFecha, filtroSelect, filtroTexto } from '../components/filtros-ui.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Valida los identificadores que se escriben a mano en los filtros. */
function validar(filtros) {
  for (const [campo, nombre] of [
    ['evento_id', 'evento'],
    ['usuario_id', 'usuario'],
  ]) {
    if (filtros[campo] && !UUID.test(filtros[campo])) {
      return `El ID del ${nombre} no es válido: debe ser un identificador con formato UUID.`;
    }
  }
  return validarRango(filtros);
}

/** Compras: solo lectura, con filtros por estado, evento, usuario y fechas de creación. */
export const purchasesPage = crearPaginaLista({
  titulo: 'Compras',
  descripcion:
    'Consulta de solo lectura. Pulsa el nombre de un comprador o de un evento para filtrar por él. Las fechas se filtran por la fecha de creación de la compra.',
  ruta: '#/admin/compras',
  leerFiltros: leerFiltrosCompras,
  aQuery: (f) => filtrosAQuery(f),
  formularioFiltros: (f) => html`
    ${filtroSelect({ name: 'estado', label: 'Estado', valor: f.estado, opciones: ESTADOS_COMPRA })}
    ${filtroTexto({
      name: 'evento_id',
      label: 'ID del evento',
      valor: f.evento_id,
      placeholder: 'UUID',
      maxlength: 36,
    })}
    ${filtroTexto({
      name: 'usuario_id',
      label: 'ID del usuario',
      valor: f.usuario_id,
      placeholder: 'UUID',
      maxlength: 36,
    })}
    ${filtroFecha({ name: 'desde', label: 'Desde', valor: f.desde })}
    ${filtroFecha({ name: 'hasta', label: 'Hasta', valor: f.hasta })}
  `,
  leerFormulario: (form) => ({
    estado: form.elements.estado.value,
    evento_id: form.elements.evento_id.value.trim(),
    usuario_id: form.elements.usuario_id.value.trim(),
    desde: form.elements.desde.value,
    hasta: form.elements.hasta.value,
  }),
  validar,
  cargar: cargarCompras,
  columnas: [
    'Comprador',
    'Evento',
    'Estado del evento',
    'Fecha',
    'Hora',
    'Comisión',
    'Neto artista',
    'Estado',
    'Detalles',
  ],
  fila: (c) => html`<tr data-id="${c.id}">
    <td class="admin-celda-texto">
      <button
        type="button"
        class="admin-link admin-purchases__link"
        title="${c.usuario?.nombre}"
        data-action="filtrar-usuario"
        data-valor="${c.usuario?.id}"
      >
        ${c.usuario?.nombre}
      </button>
    </td>
    <td class="admin-celda-texto">
      <button
        type="button"
        class="admin-link admin-purchases__link"
        title="${c.evento?.titulo}"
        data-action="filtrar-evento"
        data-valor="${c.evento?.id}"
      >
        ${c.evento?.titulo}
      </button>
    </td>
    <td>${badgeEstadoEvento(c.evento?.estado)}</td>
    <td>${formatDateMedium(c.creado_en)}</td>
    <td>${formatTime(c.creado_en)}</td>
    <td>${formatCop(c.comision_cop)}</td>
    <td>${formatCop(c.neto_artista_cop)}</td>
    <td>${badgeEstadoCompra(c.estado)}</td>
    <td>
      <button
        type="button"
        class="btn btn-outline-light btn-sm"
        data-action="detalles"
        data-id="${c.id}"
        aria-label="Ver detalles de la compra de ${c.usuario?.nombre ?? ''}"
      >
        Ver detalles
      </button>
    </td>
  </tr>`,
  vacio: (f) =>
    Object.entries(f).some(([k, v]) => k !== 'page' && v !== '')
      ? {
          icono: 'bi-funnel',
          titulo: 'No hay compras con esos filtros',
          mensaje: 'Prueba con otros filtros.',
        }
      : {
          icono: 'bi-receipt',
          titulo: 'Aún no hay compras',
          mensaje: 'Cuando se compre una entrada, aparecerá aquí.',
        },
  acciones: {
    detalles: ({ item }) =>
      verDetalles({
        titulo: 'Detalles de la compra',
        filas: [
          ['Método de pago', METODOS_PAGO[item.metodo_pago] ?? item.metodo_pago],
          ['Referencia', html`<span class="admin-ref">${item.referencia}</span>`],
        ],
      }),
    'filtrar-usuario': ({ boton, fijarFiltros }) =>
      fijarFiltros({ usuario_id: boton.dataset.valor }),
    'filtrar-evento': ({ boton, fijarFiltros }) => fijarFiltros({ evento_id: boton.dataset.valor }),
  },
});
