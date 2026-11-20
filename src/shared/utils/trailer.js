import { mediaUrl } from './media-url.js';
import { youtubeVideoId } from './youtube-url.js';

/** Formatos y tamaño del video que el artista puede subir (el servidor vuelve a validar). */
export const TIPOS_VIDEO = ['video/mp4', 'video/webm'];
export const MAX_TRAILER_MB = 50;

/**
 * Qué tráiler mostrar de un evento. El video subido por el artista tiene prioridad sobre el
 * enlace de YouTube.
 * @param {{trailer_video_url?: string|null, youtube_url?: string|null}} evento
 * @returns {{tipo: 'video', src: string} | {tipo: 'youtube', url: string} | null}
 */
export function trailerDe(evento) {
  const src = mediaUrl(evento?.trailer_video_url);
  if (src) return { tipo: 'video', src };
  if (youtubeVideoId(evento?.youtube_url)) return { tipo: 'youtube', url: evento.youtube_url };
  return null;
}

/**
 * Valida el archivo elegido antes de subirlo. Devuelve el mensaje de error o `null`.
 * @param {{type: string, size: number, name?: string} | null | undefined} archivo
 */
export function validarArchivoTrailer(archivo) {
  if (!archivo) return null;
  const extension = (archivo.name ?? '').toLowerCase().split('.').pop();
  const tipoValido = TIPOS_VIDEO.includes(archivo.type) || ['mp4', 'webm'].includes(extension);
  if (!tipoValido) return 'Sube un video en formato MP4 o WebM.';
  if (archivo.size > MAX_TRAILER_MB * 1024 * 1024) {
    return `El video supera el máximo de ${MAX_TRAILER_MB} MB.`;
  }
  if (archivo.size === 0) return 'El archivo está vacío.';
  return null;
}
