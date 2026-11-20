import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trailerDe, validarArchivoTrailer } from '../../src/shared/utils/trailer.js';

const ORIGEN = 'http://localhost:5000';

test('el video subido tiene prioridad sobre YouTube; sin ninguno no hay tráiler', () => {
  const ambos = trailerDe({
    trailer_video_url: '/uploads/trailers/e1/v.mp4',
    youtube_url: 'https://youtu.be/AbC123_deFg',
  });
  assert.deepEqual(ambos, { tipo: 'video', src: `${ORIGEN}/uploads/trailers/e1/v.mp4` });
  assert.deepEqual(trailerDe({ youtube_url: 'https://youtu.be/AbC123_deFg' }), {
    tipo: 'youtube',
    url: 'https://youtu.be/AbC123_deFg',
  });
  assert.equal(trailerDe({ youtube_url: 'https://example.com/v' }), null);
  assert.equal(trailerDe({}), null);
});

test('valida tipo y tamaño del video antes de subirlo', () => {
  assert.equal(validarArchivoTrailer(null), null);
  assert.equal(validarArchivoTrailer({ type: 'video/mp4', size: 1000, name: 'a.mp4' }), null);
  assert.equal(validarArchivoTrailer({ type: '', size: 1000, name: 'a.webm' }), null);
  assert.match(
    validarArchivoTrailer({ type: 'video/quicktime', size: 10, name: 'a.mov' }),
    /MP4 o WebM/,
  );
  assert.match(
    validarArchivoTrailer({ type: 'video/mp4', size: 51 * 1024 * 1024, name: 'a.mp4' }),
    /50 MB/,
  );
  assert.match(validarArchivoTrailer({ type: 'video/mp4', size: 0, name: 'a.mp4' }), /vacío/);
});
