import { html } from '../../../shared/utils/html.js';
import { mediaUrl } from '../../../shared/utils/media-url.js';
import { MAX_TRAILER_MB, TIPOS_VIDEO } from '../../../shared/utils/trailer.js';
import { CATEGORIAS } from '../../../shared/utils/categorias.js';
import { formField } from '../../../shared/ui/form-field.js';
import { ETIQUETA_ESTADO } from '../studio.service.js';

export const TEXTO_SIN_CUOTA =
  'Sin cuota fija ni suscripción. Solo se cobra una comisión por cada boleto vendido.';

/** Aviso sobre lo que no se puede editar. */
function avisos({ estado, editables, suspendido }) {
  const lista = [];
  if (suspendido) {
    lista.push(
      html`<div class="alert alert-warning" role="status">
        Este evento fue suspendido por moderación.
      </div>`,
    );
  }
  if (estado && editables.size === 0) {
    lista.push(
      html`<div class="alert alert-secondary" role="status">
        Este evento está <strong>${ETIQUETA_ESTADO[estado].toLowerCase()}</strong> y ya no se puede
        editar.
      </div>`,
    );
  } else if (estado === 'PROGRAMADO' && !editables.has('precio_cop')) {
    lista.push(
      html`<div class="alert alert-secondary" role="status">
        Este evento ya tiene entradas vendidas: el precio, la fecha, la duración y la reproducción
        posterior no se pueden cambiar. Puedes editar el título, la descripción, la portada y la
        categoría y el tráiler.
      </div>`,
    );
  }
  return lista;
}

function botones({ esNuevo, estado, evento }) {
  if (esNuevo) {
    return html`<button type="submit" class="btn btn-outline-light" data-intencion="guardar">
        Guardar borrador
      </button>
      <button type="button" class="btn btn-primary" data-action="guardar-publicar">
        <i class="bi bi-send" aria-hidden="true"></i>Guardar y publicar
      </button>`;
  }
  switch (estado) {
    case 'BORRADOR':
      return html`<button type="button" class="btn btn-outline-danger form-actions__peligro" data-action="eliminar">
          <i class="bi bi-trash" aria-hidden="true"></i>Eliminar borrador
        </button>
        <button type="submit" class="btn btn-outline-light">Guardar</button>
        <button type="button" class="btn btn-primary" data-action="publicar">
          <i class="bi bi-send" aria-hidden="true"></i>Publicar
        </button>`;
    case 'PROGRAMADO':
      return html`<button type="button" class="btn btn-outline-danger form-actions__peligro" data-action="cancelar">
          <i class="bi bi-x-circle" aria-hidden="true"></i>Cancelar evento
        </button>
        <a
          class="btn btn-outline-light"
          href="#/estudio/eventos/${encodeURIComponent(evento.id)}/transmision"
          ><i class="bi bi-broadcast" aria-hidden="true"></i>Sala de control</a
        >
        <button type="submit" class="btn btn-primary">Guardar cambios</button>`;
    case 'EN_VIVO':
      return html`<a
        class="btn btn-primary"
        href="#/estudio/eventos/${encodeURIComponent(evento.id)}/transmision"
        >Ir a la transmisión</a
      >`;
    default:
      return html``;
  }
}

/**
 * Tráiler promocional: subir un video propio (MP4/WebM) o pegar un enlace de YouTube. Basta con
 * uno; si hay ambos, se muestra el video. El video actual se puede ver y quitar.
 */
function seccionTrailer({ valores, evento, esNuevo, deshabilitado }) {
  const actual = mediaUrl(evento?.trailer_video_url);
  const off = deshabilitado ? html`disabled` : '';
  return html`<fieldset class="trailer-campo mb-3">
    <legend class="form-label mb-1">Tráiler promocional</legend>
    <p class="form-text mt-0 mb-3">
      ${esNuevo ? 'Obligatorio: ' : ''}sube un video o pega un enlace de YouTube. Si hay ambos, se
      muestra el video. No uses la transmisión completa.
    </p>
    ${
      actual
        ? html`<div class="trailer-campo__actual mb-3">
            <video src="${actual}" controls playsinline preload="metadata" aria-label="Video actual del tráiler"></video>
            <button type="button" class="btn btn-outline-danger btn-sm" data-action="quitar-video" ${off}>
              <i class="bi bi-trash" aria-hidden="true"></i>Quitar video
            </button>
          </div>`
        : ''
    }
    <div class="mb-3" data-field="trailer">
      <label for="campo-trailer" class="form-label">
        ${actual ? 'Reemplazar el video' : 'Subir un video'}
      </label>
      <input
        id="campo-trailer"
        name="trailer"
        type="file"
        class="form-control"
        accept="${TIPOS_VIDEO.join(',')},.mp4,.webm"
        aria-describedby="campo-trailer-ayuda campo-trailer-error"
        ${off}
      />
      <div class="form-text" id="campo-trailer-ayuda">
        MP4 o WebM, máximo ${MAX_TRAILER_MB} MB. Se sube al guardar.
      </div>
      <div class="invalid-feedback" id="campo-trailer-error" aria-live="polite"></div>
    </div>
    <p class="trailer-campo__o" aria-hidden="true"><span>o</span></p>
    ${formField({
      name: 'youtube_url',
      label: 'Enlace de YouTube',
      type: 'url',
      value: valores.youtube_url,
      maxlength: 255,
      placeholder: 'https://youtu.be/…',
      help: 'Enlace a un video promocional público.',
      disabled: deshabilitado,
    })}
  </fieldset>`;
}

/**
 * Fecha y hora de inicio como dos campos separados. La página los une en `fecha_inicio`
 * ("YYYY-MM-DDTHH:mm", hora de Colombia). El `<input type="hidden" name="fecha_inicio">` sostiene
 * el mensaje de error del par y su estado deshabilitado.
 * @param {string} valor "YYYY-MM-DDTHH:mm" o vacío
 * @param {boolean} deshabilitado
 */
function campoFechaHora(valor, deshabilitado) {
  const [dia = '', hora = ''] = (valor || '').split('T');
  const off = deshabilitado ? html`disabled` : '';
  const describe = 'campo-fecha_inicio-ayuda campo-fecha_inicio-error';
  return html`<div class="mb-3 campo-fecha-hora" data-field="fecha_inicio">
    <div class="row g-3">
      <div class="col-sm-6">
        <label for="campo-fecha_inicio_dia" class="form-label">Fecha de inicio</label>
        <input
          id="campo-fecha_inicio_dia"
          name="fecha_inicio_dia"
          type="date"
          class="form-control"
          value="${dia}"
          required
          aria-describedby="${describe}"
          ${off}
        />
      </div>
      <div class="col-sm-6">
        <label for="campo-fecha_inicio_hora" class="form-label">Hora de inicio</label>
        <input
          id="campo-fecha_inicio_hora"
          name="fecha_inicio_hora"
          type="time"
          class="form-control"
          value="${hora}"
          required
          aria-describedby="${describe}"
          ${off}
        />
      </div>
    </div>
    <div class="form-text" id="campo-fecha_inicio-ayuda">
      Hora de Colombia. Al publicar, debe ser al menos 30 minutos después de ahora.
    </div>
    <input type="hidden" name="fecha_inicio" ${off} />
    <div class="invalid-feedback" id="campo-fecha_inicio-error" aria-live="polite"></div>
  </div>`;
}

/**
 * Formulario de evento (§5.5). Los campos no editables salen deshabilitados.
 * @param {{valores: object, editables: Set<string>, esNuevo: boolean, estado?: string,
 *   evento?: object}} o
 */
export function vistaFormulario({ valores, editables, esNuevo, estado, evento }) {
  const off = (campo) => !editables.has(campo);
  return html`<form novalidate data-form>
    ${avisos({ estado, editables, suspendido: evento?.suspendido_admin })}
    <div class="alert alert-danger" role="alert" data-alerta hidden></div>
    ${formField({
      name: 'titulo',
      label: 'Título',
      value: valores.titulo,
      required: true,
      maxlength: 150,
      disabled: off('titulo'),
    })}
    ${formField({
      name: 'descripcion',
      label: 'Descripción',
      type: 'textarea',
      value: valores.descripcion,
      rows: 5,
      disabled: off('descripcion'),
    })}
    <div class="mb-3" data-field="categoria">
      <label for="campo-categoria" class="form-label">Categoría</label>
      <select
        id="campo-categoria"
        name="categoria"
        class="form-select"
        aria-describedby="campo-categoria-error"
        ${off('categoria') ? html`disabled` : ''}
      >
        ${CATEGORIAS.map(
          ([valor, etiqueta]) =>
            html`<option value="${valor}" ${valor === valores.categoria ? html`selected` : ''}>
              ${etiqueta}
            </option>`,
        )}
      </select>
      <div class="invalid-feedback" id="campo-categoria-error" aria-live="polite"></div>
    </div>
    ${formField({
      name: 'portada_url',
      label: 'Portada (URL de la imagen)',
      type: 'url',
      value: valores.portada_url,
      maxlength: 255,
      placeholder: 'https://…',
      help: 'Opcional. Si no pones imagen, se usa un degradado según la categoría.',
      disabled: off('portada_url'),
    })}
    ${seccionTrailer({ valores, evento, esNuevo, deshabilitado: off('youtube_url') })}
    <div class="row g-3">
      <div class="col-md-6">
        ${formField({
          name: 'precio_cop',
          label: 'Precio de la entrada (COP)',
          type: 'number',
          value: valores.precio_cop,
          required: true,
          min: 1,
          step: 1,
          inputmode: 'numeric',
          help: TEXTO_SIN_CUOTA,
          disabled: off('precio_cop'),
        })}
      </div>
      <div class="col-md-6">
        ${formField({
          name: 'duracion_estimada_min',
          label: 'Duración estimada (minutos)',
          type: 'number',
          value: valores.duracion_estimada_min,
          required: true,
          min: 15,
          max: 240,
          step: 1,
          inputmode: 'numeric',
          disabled: off('duracion_estimada_min'),
        })}
      </div>
    </div>
    ${campoFechaHora(valores.fecha_inicio, off('fecha_inicio'))}
    <div class="mb-4" data-field="replay_habilitado">
      <div class="form-check form-opcion">
        <input
          class="form-check-input"
          type="checkbox"
          id="campo-replay_habilitado"
          name="replay_habilitado"
          ${valores.replay_habilitado ? html`checked` : ''}
          ${off('replay_habilitado') ? html`disabled` : ''}
          aria-describedby="campo-replay_habilitado-ayuda campo-replay_habilitado-error"
        />
        <label class="form-check-label" for="campo-replay_habilitado">
          Permitir reproducción posterior (replay)
        </label>
      </div>
      <div class="form-text" id="campo-replay_habilitado-ayuda">
        Quienes compren la entrada podrán ver el replay después del evento.
      </div>
      <div class="invalid-feedback" id="campo-replay_habilitado-error" aria-live="polite"></div>
    </div>
    <div class="form-actions">${botones({ esNuevo, estado, evento })}</div>
  </form>`;
}
