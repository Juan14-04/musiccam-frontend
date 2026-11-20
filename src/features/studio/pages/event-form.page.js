import '../studio.css';
import { backLink } from '../../../shared/ui/back-link.js';
import { sessionState } from '../../../core/session/session.js';
import { html } from '../../../shared/utils/html.js';
import { delegate, fromHtml, setHtml } from '../../../shared/utils/dom.js';
import { confirmDialog } from '../../../shared/ui/confirm-dialog.js';
import { emptyState, errorState } from '../../../shared/ui/empty-state.js';
import { clearFieldErrors, setFieldError } from '../../../shared/ui/form-field.js';
import { skeletonBlock } from '../../../shared/ui/skeleton.js';
import { showToast } from '../../../shared/ui/toast.js';
import { vistaFormulario } from '../components/event-form-view.js';
import {
  CAMPOS,
  camposEditables,
  cancelar,
  cargarEvento,
  construirCambios,
  crear,
  crearYPublicar,
  eliminar,
  erroresDeServidor,
  guardarCambios,
  hayVentas,
  publicar,
  quitarTrailer,
  subirTrailer,
  validarEvento,
  valoresIniciales,
} from '../studio.service.js';
import { validarArchivoTrailer } from '../../../shared/utils/trailer.js';

const TEXTO_CANCELAR =
  'Si cancelas este evento dejará de estar a la venta y las entradas ya vendidas se reembolsarán. Esta acción no se puede deshacer.';

const volver = (hash) => {
  location.hash = hash;
};

/** Valores actuales del formulario (los controles deshabilitados también se leen). */
function leerValores(form) {
  const valores = {};
  for (const campo of CAMPOS) {
    const control = form.elements[campo];
    valores[campo] = campo === 'replay_habilitado' ? control.checked : control.value;
  }
  // Fecha y hora van en campos separados: se unen en el formato que espera el servicio.
  const dia = form.elements.fecha_inicio_dia.value;
  const hora = form.elements.fecha_inicio_hora.value;
  valores.fecha_inicio = dia && hora ? `${dia}T${hora}` : '';
  return valores;
}

/**
 * Formulario de evento (§5.5): crear (`#/estudio/eventos/nuevo`) y editar (`/:id/editar`).
 * @param {{params: {id?: string}, signal: AbortSignal}} ctx
 */
export async function eventFormPage(ctx) {
  const id = ctx.params.id ?? null;
  const esNuevo = id === null;
  const el = fromHtml(html``, 'section');
  let evento = null;
  let conVentas = false;
  let ocupado = false;
  let titulo = esNuevo ? 'Nuevo evento' : 'Editar evento';

  const editables = () => (esNuevo ? new Set(CAMPOS) : camposEditables(evento.estado, conVentas));

  function cabecera() {
    return html`<nav aria-label="Migas de pan" class="mb-3">
        ${backLink('#/estudio/eventos', 'Mis eventos')}
      </nav>
      <h1 class="mb-4">${esNuevo ? 'Nuevo evento' : `Editar evento`}</h1>`;
  }

  function pintar(valores = valoresIniciales(evento)) {
    setHtml(
      el,
      html`${cabecera()}
        <div class="surface-card p-4" style="max-width:760px">
          ${vistaFormulario({
            valores,
            editables: editables(),
            esNuevo,
            estado: evento?.estado,
            evento,
          })}
        </div>`,
    );
  }

  function pintarCarga() {
    setHtml(
      el,
      html`${cabecera()}
        <div class="d-grid gap-3" role="status" aria-label="Cargando evento" style="max-width:760px">
          ${skeletonBlock({ alto: '40px' })} ${skeletonBlock({ alto: '120px' })}
          ${skeletonBlock({ alto: '40px' })} ${skeletonBlock({ alto: '40px' })}
        </div>`,
    );
  }

  function mensajeCentrado(icono, tituloMsg, mensaje) {
    setHtml(
      el,
      html`${cabecera()}${emptyState({
        icono,
        titulo: tituloMsg,
        mensaje,
        accion: { href: '#/estudio/eventos', texto: 'Volver a mis eventos' },
      })}`,
    );
  }

  async function cargar() {
    if (esNuevo) return pintar();
    pintarCarga();
    try {
      const cargado = await cargarEvento(id, ctx.signal);
      const yo = sessionState.get().usuario;
      if (cargado.artista?.id !== yo?.id) {
        return mensajeCentrado(
          'bi-shield-lock',
          'Este evento no es tuyo',
          'Solo su artista puede editarlo.',
        );
      }
      evento = cargado;
      conVentas = await hayVentas(cargado, ctx.signal);
      titulo = cargado.titulo;
      pintar();
    } catch (error) {
      if (error.cancelada) return;
      if (error.status === 404) {
        return mensajeCentrado(
          'bi-calendar-x',
          'No encontramos este evento',
          'Puede que haya sido eliminado.',
        );
      }
      setHtml(el, html`${cabecera()}${errorState({ mensaje: error.mensaje })}`);
    }
  }

  // --- Envío ------------------------------------------------------------------------------

  const formulario = () => el.querySelector('[data-form]');
  /** Video elegido en el campo de archivo (si hay). */
  const archivoTrailer = () => formulario()?.elements.trailer?.files?.[0] ?? null;

  /** Sube el video elegido (si hay) y devuelve el evento actualizado, o `null` si no había. */
  async function subirVideoSiHay(eventoId) {
    const archivo = archivoTrailer();
    if (!archivo) return null;
    return subirTrailer(eventoId, archivo, ctx.signal);
  }
  const alerta = () => el.querySelector('[data-alerta]');

  function bloquear(bloqueado) {
    ocupado = bloqueado;
    formulario()
      ?.querySelectorAll('button, a.btn')
      .forEach((b) => {
        if (b.tagName === 'BUTTON') b.disabled = bloqueado;
        else b.setAttribute('aria-disabled', String(bloqueado));
      });
  }

  function mostrarAlerta(texto) {
    const caja = alerta();
    if (!caja) return;
    caja.textContent = texto || '';
    caja.hidden = !texto;
    if (texto) caja.scrollIntoView({ block: 'nearest' });
  }

  function aplicarErrores(errores) {
    const form = formulario();
    let primero = null;
    for (const [campo, mensaje] of Object.entries(errores)) {
      if (form.elements[campo]) {
        setFieldError(form, campo, mensaje);
        // Un campo oculto (fecha y hora) no recibe foco: se enfoca el primer control visible.
        const control = form.elements[campo];
        primero ??=
          control.type === 'hidden'
            ? control.closest('[data-field]').querySelector('input:not([type="hidden"])')
            : control;
      }
    }
    primero?.focus();
  }

  /** Valida en el cliente; si hay errores los pinta y devuelve `null`. */
  function validar() {
    const form = formulario();
    clearFieldErrors(form);
    mostrarAlerta('');
    const valores = leerValores(form);
    const archivo = archivoTrailer();
    const errores = validarEvento(valores, editables(), {
      requerirTrailer: esNuevo,
      tieneVideo: Boolean(archivo || evento?.trailer_video_url),
    });
    const errorVideo = validarArchivoTrailer(archivo);
    if (errorVideo) errores.trailer = errorVideo;
    if (Object.keys(errores).length) {
      aplicarErrores(errores);
      return null;
    }
    return valores;
  }

  /** Muestra un error del servidor junto a su campo o en la alerta; devuelve el estado. */
  function errorDelServidor(error, valores) {
    if (error.cancelada) return;
    const { campos, general } = erroresDeServidor(error);
    if (error.codigo === 'EVENTO_NO_EDITABLE') {
      // Hay ventas que no conocíamos: se bloquean los campos restringidos conservando lo escrito.
      conVentas = true;
      pintar(valores);
      mostrarAlerta(error.mensaje);
      return;
    }
    aplicarErrores(campos);
    mostrarAlerta(general);
  }

  async function ejecutar(trabajo) {
    if (ocupado) return;
    const valores = validar();
    if (!valores) return;
    bloquear(true);
    try {
      await trabajo(valores);
    } catch (error) {
      errorDelServidor(error, valores);
    } finally {
      if (el.isConnected && formulario()) bloquear(false);
    }
  }

  /** Aplica los cambios al evento existente (si los hay) y devuelve el evento actualizado. */
  async function guardarSiHayCambios(valores) {
    const cambios = construirCambios(evento, valores, editables());
    if (!Object.keys(cambios).length) return { evento, huboCambios: false };
    return { evento: await guardarCambios(id, cambios, ctx.signal), huboCambios: true };
  }

  const acciones = {
    guardar: () =>
      ejecutar(async (valores) => {
        if (esNuevo) {
          const creado = await crear(valores, ctx.signal);
          try {
            await subirVideoSiHay(creado.id);
            showToast('Borrador guardado.', 'success');
          } catch (error) {
            if (error.cancelada) throw error;
            showToast(`Se guardó el borrador, pero no el video: ${error.mensaje}`, 'warning');
          }
          return volver(`#/estudio/eventos/${encodeURIComponent(creado.id)}/editar`);
        }
        const r = await guardarSiHayCambios(valores);
        const conVideo = await subirVideoSiHay(id);
        if (!r.huboCambios && !conVideo) return showToast('No hay cambios por guardar.', 'info');
        evento = conVideo ?? r.evento;
        pintar();
        showToast('Cambios guardados.', 'success');
      }),

    'guardar-publicar': () =>
      ejecutar(async (valores) => {
        const r = await crearYPublicar(valores, ctx.signal, undefined, archivoTrailer());
        if (r.errorPublicar) {
          showToast(
            `Se guardó como borrador, pero no se pudo publicar: ${r.errorPublicar.mensaje}`,
            'warning',
          );
          return volver(`#/estudio/eventos/${encodeURIComponent(r.evento.id)}/editar`);
        }
        showToast('Evento publicado. Ya aparece en el catálogo.', 'success');
        volver('#/estudio/eventos');
      }),

    publicar: () =>
      ejecutar(async (valores) => {
        const r = await guardarSiHayCambios(valores);
        evento = (await subirVideoSiHay(id)) ?? r.evento;
        await publicar(id, ctx.signal);
        showToast('Evento publicado. Ya aparece en el catálogo.', 'success');
        volver('#/estudio/eventos');
      }),

    eliminar: async () => {
      if (ocupado) return;
      const ok = await confirmDialog({
        titulo: 'Eliminar borrador',
        mensaje: `¿Eliminar «${evento.titulo}»? Esta acción no se puede deshacer.`,
        confirmar: 'Eliminar',
        peligro: true,
      });
      if (!ok) return;
      bloquear(true);
      try {
        await eliminar(id, ctx.signal);
        showToast('Borrador eliminado.', 'success');
        volver('#/estudio/eventos');
      } catch (error) {
        errorDelServidor(error, leerValores(formulario()));
      } finally {
        if (formulario()) bloquear(false);
      }
    },

    cancelar: async () => {
      if (ocupado) return;
      const ok = await confirmDialog({
        titulo: `Cancelar «${evento.titulo}»`,
        mensaje: TEXTO_CANCELAR,
        confirmar: 'Cancelar evento',
        cancelar: 'Volver',
        peligro: true,
      });
      if (!ok) return;
      bloquear(true);
      try {
        evento = await cancelar(id, ctx.signal);
        pintar();
        showToast('Evento cancelado. Se reembolsarán las entradas vendidas.', 'success');
      } catch (error) {
        errorDelServidor(error, leerValores(formulario()));
      } finally {
        if (formulario()) bloquear(false);
      }
    },
    'quitar-video': async () => {
      if (ocupado) return;
      const ok = await confirmDialog({
        titulo: 'Quitar video del tráiler',
        mensaje: 'Se borrará el video subido. Si tienes un enlace de YouTube, se mostrará ese.',
        confirmar: 'Quitar video',
        peligro: true,
      });
      if (!ok) return;
      bloquear(true);
      try {
        const valores = leerValores(formulario());
        evento = await quitarTrailer(id, ctx.signal);
        pintar(valores);
        showToast('Video quitado.', 'success');
      } catch (error) {
        errorDelServidor(error, leerValores(formulario()));
      } finally {
        if (formulario()) bloquear(false);
      }
    },
    reintentar: cargar,
  };

  const quitarClic = delegate(el, 'click', acciones);
  const alEnviar = (e) => {
    if (!e.target.matches('[data-form]')) return;
    e.preventDefault();
    acciones.guardar();
  };
  el.addEventListener('submit', alEnviar);

  await cargar();
  return {
    get title() {
      return esNuevo ? 'Nuevo evento' : `Editar: ${titulo}`;
    },
    el,
    destroy() {
      quitarClic();
      el.removeEventListener('submit', alEnviar);
    },
  };
}
