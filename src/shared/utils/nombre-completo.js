/**
 * Nombre y apellido de una persona en un solo texto. Las cuentas anteriores al apellido (o los
 * administradores creados por SQL) pueden no tenerlo: entonces queda solo el nombre.
 * @param {{nombre?: string|null, apellido?: string|null}|null|undefined} persona
 */
export function nombreCompleto(persona) {
  return [persona?.nombre, persona?.apellido]
    .map((parte) => (parte ?? '').trim())
    .filter(Boolean)
    .join(' ');
}
