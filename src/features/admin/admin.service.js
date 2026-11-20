import { bogotaLocalToIso } from '../../shared/utils/format-date.js';
import { formatCop } from '../../shared/utils/format-money.js';
import { esCategoriaValida } from '../../shared/utils/categorias.js';
import * as adminApi from './admin.api.js';

export const PAGE_SIZE = 20;
export const MOTIVO_MAX = 255;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export const ROLES = [
  ['USUARIO', 'Espectador'],
  ['ARTISTA', 'Artista'],
  ['ADMIN', 'Administrador'],
];
export const ETIQUETA_ROL = Object.fromEntries(ROLES);
export const ESTADOS_USUARIO = [
  ['ACTIVO', 'Activo'],
  ['SUSPENDIDO', 'Suspendido'],
];
export const ESTADOS_EVENTO = [
  ['BORRADOR', 'Borrador'],
  ['PROGRAMADO', 'Programado'],
  ['EN_VIVO', 'En vivo'],
  ['FINALIZADO', 'Finalizado'],
  ['CANCELADO', 'Cancelado'],
];
export const ETIQUETA_ESTADO_EVENTO = Object.fromEntries(ESTADOS_EVENTO);
export const ESTADOS_COMPRA = [
  ['PENDIENTE', 'Pendiente'],
  ['APROBADA', 'Aprobada'],
  ['RECHAZADA', 'Rechazada'],
  ['ANULADA', 'Anulada'],
  ['REEMBOLSADA', 'Reembolsada'],
];
export const ETIQUETA_ESTADO_COMPRA = Object.fromEntries(ESTADOS_COMPRA);
export const ESTADOS_RETIRO = [
  ['PENDIENTE', 'Pendiente'],
  ['PAGADO', 'Pagado'],
  ['RECHAZADO', 'Rechazado'],
];
export const ETIQUETA_ESTADO_RETIRO = Object.fromEntries(ESTADOS_RETIRO);
export const ETIQUETA_TIPO_CUENTA = { AHORROS: 'Ahorros', CORRIENTE: 'Corriente', NEQUI: 'Nequi' };
export const METODOS_PAGO = { CARD: 'Tarjeta', PSE: 'PSE', NEQUI: 'Nequi' };

// --- Lectura de filtros desde la URL (la URL es entrada del usuario: se descarta lo inválido) --

const dentroDe = (valor, pares) => (pares.some(([v]) => v === valor) ? valor : '');
const pagina = (query) => {
  const n = Number.parseInt(query.get('page') ?? '1', 10);
  return Number.isInteger(n) && n > 0 ? n : 1;
};
const texto = (query, clave, max = 100) => (query.get(clave) ?? '').trim().slice(0, max);
const uuid = (query, clave) => (UUID.test(query.get(clave) ?? '') ? query.get(clave) : '');
const fecha = (query, clave) => (FECHA.test(query.get(clave) ?? '') ? query.get(clave) : '');

/** Lee y normaliza filtros de usuarios desde la URL antes de consultar la API. */
export function leerFiltrosUsuarios(query) {
  return {
    q: texto(query, 'q'),
    rol: dentroDe(query.get('rol'), ROLES),
    estado: dentroDe(query.get('estado'), ESTADOS_USUARIO),
    page: pagina(query),
  };
}

/** Lee filtros del panel de eventos y descarta valores no reconocidos. */
export function leerFiltrosEventos(query) {
  const suspendido = query.get('suspendido');
  return {
    q: texto(query, 'q'),
    categoria: esCategoriaValida(query.get('categoria')) ? query.get('categoria') : '',
    estado: dentroDe(query.get('estado'), ESTADOS_EVENTO),
    suspendido: suspendido === 'true' || suspendido === 'false' ? suspendido : '',
    desde: fecha(query, 'desde'),
    hasta: fecha(query, 'hasta'),
    page: pagina(query),
  };
}

/** Lee filtros de compras, validando estados, fechas e identificadores UUID. */
export function leerFiltrosCompras(query) {
  return {
    estado: dentroDe(query.get('estado'), ESTADOS_COMPRA),
    evento_id: uuid(query, 'evento_id'),
    usuario_id: uuid(query, 'usuario_id'),
    desde: fecha(query, 'desde'),
    hasta: fecha(query, 'hasta'),
    page: pagina(query),
  };
}

/** La cola de retiros abre en PENDIENTE; `estado=TODOS` en la URL significa "sin filtro". */
export function leerFiltrosRetiros(query) {
  const crudo = query.get('estado');
  let estado = 'PENDIENTE';
  if (crudo === 'TODOS') estado = '';
  else if (dentroDe(crudo, ESTADOS_RETIRO)) estado = crudo;
  return { estado, page: pagina(query) };
}

/** Texto `?a=b` de la URL; omite vacíos y la página 1. */
export function filtrosAQuery(filtros, { vacioComo } = {}) {
  const query = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (clave === 'page') continue;
    if (valor === '' || valor === null || valor === undefined) {
      if (vacioComo?.[clave]) query.set(clave, vacioComo[clave]);
      continue;
    }
    query.set(clave, String(valor));
  }
  if (filtros.page > 1) query.set('page', String(filtros.page));
  const cadena = query.toString();
  return cadena ? `?${cadena}` : '';
}

/** Rango de fechas (días de Bogotá) → ISO UTC para `desde`/`hasta`. */
function rango(filtros) {
  return {
    desde: filtros.desde ? bogotaLocalToIso(`${filtros.desde}T00:00`) : '',
    hasta: filtros.hasta ? bogotaLocalToIso(`${filtros.hasta}T23:59`) : '',
  };
}

export function validarRango({ desde, hasta }) {
  return desde && hasta && desde > hasta
    ? 'La fecha "desde" no puede ser posterior a "hasta".'
    : null;
}

// --- Operaciones para las páginas -------------------------------------------------------

const base = (filtros) => ({ page: filtros.page, page_size: PAGE_SIZE });

/** Parámetros de cada listado de la API a partir de los filtros de la pantalla. */
export const paramsUsuarios = (f) => ({ ...base(f), q: f.q, rol: f.rol, estado: f.estado });
/** Añade al filtro de eventos sus fechas convertidas desde Bogotá a UTC. */
export const paramsEventos = (f) => ({
  ...base(f),
  q: f.q,
  categoria: f.categoria,
  estado: f.estado,
  suspendido: f.suspendido,
  ...rango(f),
});
/** Construye parámetros para filtrar compras por estado, evento, usuario y fechas. */
export const paramsCompras = (f) => ({
  ...base(f),
  estado: f.estado,
  evento_id: f.evento_id,
  usuario_id: f.usuario_id,
  ...rango(f),
});
/** Construye parámetros de consulta para el listado de retiros. */
export const paramsRetiros = (f) => ({ ...base(f), estado: f.estado });

/** Carga los indicadores agregados del panel administrativo. */
export const cargarDashboard = (signal) => adminApi.obtenerDashboard(signal);
/** Carga la página de usuarios que corresponde a los filtros actuales. */
export const cargarUsuarios = (f, signal) => adminApi.listarUsuarios(paramsUsuarios(f), signal);
/** Carga la página de eventos que corresponde a los filtros actuales. */
export const cargarEventos = (f, signal) => adminApi.listarEventosAdmin(paramsEventos(f), signal);
/** Carga la página de compras que corresponde a los filtros actuales. */
export const cargarCompras = (f, signal) => adminApi.listarComprasAdmin(paramsCompras(f), signal);
/** Carga la página de retiros que corresponde a los filtros actuales. */
export const cargarRetiros = (f, signal) => adminApi.listarRetirosAdmin(paramsRetiros(f), signal);
/** Consulta los parámetros públicos de configuración del sistema. */
export const cargarConfiguracion = (signal) => adminApi.obtenerConfiguracion(signal);

/** Cambia el estado de una cuenta a través de la API administrativa. */
export const cambiarEstadoUsuario = (id, estado, signal) =>
  adminApi.cambiarEstadoUsuario(id, estado, signal);
/** Suspende un evento con el motivo normalizado. */
export const suspenderEvento = (id, motivo, signal) =>
  adminApi.suspenderEvento(id, motivo.trim(), signal);
/** Reactiva un evento suspendido por administración. */
export const reactivarEvento = (id, signal) => adminApi.reactivarEvento(id, signal);
/** Aprueba un retiro pendiente. */
export const aprobarRetiro = (id, signal) => adminApi.aprobarRetiro(id, signal);
/** Rechaza un retiro pendiente con el motivo normalizado. */
export const rechazarRetiro = (id, motivo, signal) =>
  adminApi.rechazarRetiro(id, motivo.trim(), signal);

// --- Validación y errores ---------------------------------------------------------------

/** Motivo obligatorio (suspender evento, rechazar retiro): 1–255 caracteres, no solo espacios. */
export function validarMotivo(valor) {
  const v = (valor ?? '').trim();
  if (!v) return 'El motivo es obligatorio.';
  if (v.length > MOTIVO_MAX) return `El motivo admite máximo ${MOTIVO_MAX} caracteres.`;
  return null;
}

/**
 * Texto del aviso para un error del servidor: el mensaje tal cual y su código, p. ej.
 * "El retiro ya fue resuelto. (RETIRO_YA_RESUELTO)". Se muestran sin reinterpretar (§5.7).
 */
export function textoDeAviso(error) {
  const codigo = error.codigo && !error.codigo.startsWith('HTTP_') ? ` (${error.codigo})` : '';
  return `${error.mensaje}${codigo}`;
}

// --- Dashboard --------------------------------------------------------------------------

/** Pares [etiqueta, valor] en orden fijo, con 0 para lo que el servidor no envíe. */
export function paresDe(objeto, definicion) {
  return definicion.map(([clave, etiqueta]) => [etiqueta, Number(objeto?.[clave] ?? 0)]);
}

// --- Configuración (solo lectura) -------------------------------------------------------

const pct = (v) => `${v} %`;
const min = (v) => `${v} min`;
const dias = (v) => `${v} ${v === 1 ? 'día' : 'días'}`;
const mb = (v) => `${v} MB`;
const si = (v) => (v ? 'Sí' : 'No');
const tal = (v) => String(v);

/**
 * Parámetros que se muestran, por grupo. Es una lista permitida: lo que el servidor envíe y no
 * esté aquí NO se muestra, de modo que un secreto agregado por error nunca llega a la pantalla.
 */
export const GRUPOS_CONFIGURACION = [
  {
    titulo: 'Pagos y comisiones',
    filas: [
      ['comision_plataforma_pct', 'Comisión de la plataforma', pct],
      ['pasarela_pagos', 'Pasarela de pagos', tal],
      ['compra_pendiente_ttl_min', 'Vigencia de una compra pendiente', min],
    ],
  },
  {
    titulo: 'Eventos',
    filas: [
      ['precio_min_cop', 'Precio mínimo de entrada', formatCop],
      ['precio_max_cop', 'Precio máximo de entrada', formatCop],
      ['max_eventos_programados_nuevo', 'Eventos programados para artistas nuevos', tal],
    ],
  },
  {
    titulo: 'Retiros',
    filas: [
      ['retiro_min_cop', 'Retiro mínimo', formatCop],
      ['retiro_auto_aprobar', 'Aprobación automática de retiros', si],
    ],
  },
  {
    titulo: 'Transmisión',
    filas: [
      ['proveedor_streaming', 'Proveedor de streaming', tal],
      ['enforce_start_window', 'Exigir ventana de inicio', si],
      ['start_window_min', 'Ventana de inicio', min],
      ['playback_token_ttl_min', 'Vigencia del token de reproducción', min],
      ['media_base_url', 'URL base de medios', tal],
      ['rtmp_base_url', 'URL base de emisión (RTMP)', tal],
    ],
  },
  {
    titulo: 'Sesión y plataforma',
    filas: [
      ['entorno', 'Entorno', tal],
      ['jwt_access_ttl_min', 'Vigencia del token de acceso', min],
      ['jwt_refresh_ttl_dias', 'Vigencia del token de refresco', dias],
      ['max_upload_mb', 'Tamaño máximo de foto', mb],
      ['politica_datos_version', 'Versión de la política de datos', tal],
      ['enable_dev_endpoints', 'Endpoints de desarrollo', si],
    ],
  },
];

/** Grupos listos para pintar `[{titulo, filas: [[etiqueta, valorTexto]]}]`; omite lo no permitido. */
export function gruposDeConfiguracion(config) {
  return GRUPOS_CONFIGURACION.map((grupo) => ({
    titulo: grupo.titulo,
    filas: grupo.filas
      .filter(([clave]) => config[clave] !== undefined && config[clave] !== null)
      .map(([clave, etiqueta, formato]) => [etiqueta, formato(config[clave])]),
  })).filter((grupo) => grupo.filas.length);
}

/** Query de la cola de retiros: PENDIENTE (lo habitual) no se escribe; "sin filtro" es `TODOS`. */
export function filtrosRetirosAQuery(filtros) {
  const query = new URLSearchParams();
  if (filtros.estado === '') query.set('estado', 'TODOS');
  else if (filtros.estado !== 'PENDIENTE') query.set('estado', filtros.estado);
  if (filtros.page > 1) query.set('page', String(filtros.page));
  const cadena = query.toString();
  return cadena ? `?${cadena}` : '';
}
