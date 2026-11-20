/**
 * Enlaces principales según el rol (§4.4). Solo muestran u ocultan navegación: la seguridad real
 * la aplican los guards del router y, sobre todo, el backend.
 * @param {'USUARIO'|'ARTISTA'|'ADMIN'|undefined} rol
 * @returns {{href: string, texto: string, icono: string}[]}
 */
export function enlacesPorRol(rol) {
  const base = [
    { href: '#/eventos', texto: 'Descubrir', icono: 'bi-compass' },
    { href: '#/artistas', texto: 'Artistas', icono: 'bi-mic' },
  ];
  if (rol === 'USUARIO' || rol === 'ARTISTA') {
    base.push({ href: '#/mis-eventos', texto: 'Mis eventos', icono: 'bi-ticket-perforated' });
  }
  if (rol === 'ARTISTA') base.push({ href: '#/estudio', texto: 'Estudio', icono: 'bi-broadcast' });
  if (rol === 'ADMIN') {
    base.push({ href: '#/admin', texto: 'Administración', icono: 'bi-speedometer2' });
  }
  return base;
}
