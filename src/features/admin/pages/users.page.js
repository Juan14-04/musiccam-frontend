import { sessionState } from '../../../core/session/session.js';
import { html } from '../../../shared/utils/html.js';
import { formatDateMedium } from '../../../shared/utils/format-date.js';
import { nombreCompleto } from '../../../shared/utils/nombre-completo.js';
import { confirmDialog } from '../../../shared/ui/confirm-dialog.js';
import {
  ESTADOS_USUARIO,
  ETIQUETA_ROL,
  ROLES,
  cambiarEstadoUsuario,
  cargarUsuarios,
  filtrosAQuery,
  leerFiltrosUsuarios,
} from '../admin.service.js';
import { crearPaginaLista } from '../components/admin-list.js';
import { badgeEstadoUsuario, badgeRol } from '../components/admin-ui.js';
import { verDetalles } from '../components/dialogs.js';
import { filtroSelect, filtroTexto } from '../components/filtros-ui.js';

/** Cambia el estado de un usuario tras confirmarlo. */
async function cambiarEstado({ item, ejecutar }, estado) {
  const suspender = estado === 'SUSPENDIDO';
  const ok = await confirmDialog({
    titulo: suspender ? 'Suspender usuario' : 'Reactivar usuario',
    mensaje: suspender
      ? `¿Suspender a ${nombreCompleto(item)}? Perderá el acceso de inmediato y sus eventos saldrán del catálogo.`
      : `¿Reactivar a ${nombreCompleto(item)}? Recuperará el acceso con su misma sesión.`,
    confirmar: suspender ? 'Suspender' : 'Reactivar',
    peligro: suspender,
  });
  if (!ok) return;
  ejecutar(
    () => cambiarEstadoUsuario(item.id, estado),
    suspender ? 'Usuario suspendido.' : 'Usuario reactivado.',
  );
}

/** Usuarios: filtros por rol, estado y búsqueda; los detalles permiten suspender o reactivar. */
export const usersPage = crearPaginaLista({
  titulo: 'Usuarios',
  descripcion:
    'Busca, suspende o reactiva cuentas. Los administradores se crean directamente en la base de datos.',
  ruta: '#/admin/usuarios',
  leerFiltros: leerFiltrosUsuarios,
  aQuery: (f) => filtrosAQuery(f),
  formularioFiltros: (f) => html`
    ${filtroTexto({
      name: 'q',
      label: 'Buscar',
      valor: f.q,
      placeholder: 'Nombre, correo o nombre artístico',
      retraso: true,
      maxlength: 100,
    })}
    ${filtroSelect({ name: 'rol', label: 'Rol', valor: f.rol, opciones: ROLES })}
    ${filtroSelect({ name: 'estado', label: 'Estado', valor: f.estado, opciones: ESTADOS_USUARIO })}
  `,
  leerFormulario: (form) => ({
    q: form.elements.q.value.trim(),
    rol: form.elements.rol.value,
    estado: form.elements.estado.value,
  }),
  cargar: cargarUsuarios,
  columnas: ['Nombre', 'Correo', 'Rol', 'Estado', 'Registro', 'Detalles'],
  fila: (u) => {
    const yo = sessionState.get().usuario?.id === u.id;
    return html`<tr data-id="${u.id}">
      <td class="admin-celda-texto" title="${nombreCompleto(u)}">
        ${nombreCompleto(u)} ${yo ? html`<span class="admin-sub d-inline">(tú)</span>` : ''}
      </td>
      <td class="admin-celda-texto" title="${u.email}">${u.email}</td>
      <td>${badgeRol(u.rol)}</td>
      <td>${badgeEstadoUsuario(u.estado)}</td>
      <td>${formatDateMedium(u.creado_en)}</td>
      <td>
      <button
        type="button"
        class="btn btn-outline-light btn-sm"
        data-action="detalles"
        data-id="${u.id}"
        aria-label="Ver detalles de ${nombreCompleto(u)}"
      >
        Ver detalles
      </button>
      </td>
    </tr>`;
  },
  vacio: (f) =>
    f.q || f.rol || f.estado
      ? {
          icono: 'bi-funnel',
          titulo: 'No hay usuarios con esos filtros',
          mensaje: 'Prueba con otra búsqueda o quita algún filtro.',
        }
      : {
          icono: 'bi-people',
          titulo: 'Aún no hay usuarios',
          mensaje: 'Cuando alguien se registre, aparecerá aquí.',
        },
  acciones: {
    detalles: async (contexto) => {
      const u = contexto.item;
      const yo = sessionState.get().usuario?.id === u.id;
      const accion = await verDetalles({
        titulo: nombreCompleto(u),
        filas: [
          ['Nombre', u.nombre],
          ['Apellido', u.apellido || '—'],
          ['Nombre artístico', u.nombre_artistico || '—'],
          ['Correo', u.email],
          ['Rol', ETIQUETA_ROL[u.rol] ?? u.rol],
          ['Estado', u.estado === 'ACTIVO' ? 'Activo' : 'Suspendido'],
          ['Registro', formatDateMedium(u.creado_en)],
        ],
        // No se ofrece suspender la propia cuenta.
        acciones: yo
          ? []
          : [
              u.estado === 'ACTIVO'
                ? { accion: 'SUSPENDIDO', texto: 'Suspender usuario', variante: 'danger' }
                : { accion: 'ACTIVO', texto: 'Reactivar usuario' },
            ],
      });
      if (accion) cambiarEstado(contexto, accion);
    },
  },
});
