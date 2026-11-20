import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nombreCompleto } from '../../src/shared/utils/nombre-completo.js';

test('une nombre y apellido; sin apellido (cuentas anteriores) queda solo el nombre', () => {
  assert.equal(nombreCompleto({ nombre: 'Ana', apellido: 'Gómez' }), 'Ana Gómez');
  assert.equal(nombreCompleto({ nombre: 'Ana', apellido: null }), 'Ana');
  assert.equal(nombreCompleto({ nombre: ' Ana ', apellido: '  ' }), 'Ana');
  assert.equal(nombreCompleto(null), '');
});
