import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  youtubeBackgroundUrl,
  youtubeEmbedUrl,
  youtubePlayerUrl,
  youtubeThumbnailUrl,
  youtubeVideoId,
} from '../../src/shared/utils/youtube-url.js';

test('acepta los formatos comunes de enlaces HTTPS de YouTube', () => {
  for (const url of [
    'https://youtu.be/AbC123_deFg',
    'https://www.youtube.com/watch?v=AbC123_deFg',
    'https://youtube.com/live/AbC123_deFg',
    'https://m.youtube.com/shorts/AbC123_deFg',
    'https://www.youtube.com/embed/AbC123_deFg',
  ]) {
    assert.equal(youtubeVideoId(url), 'AbC123_deFg');
  }
  assert.equal(
    youtubeEmbedUrl('https://youtu.be/AbC123_deFg'),
    'https://www.youtube-nocookie.com/embed/AbC123_deFg?rel=0',
  );
});

test('rechaza dominios ajenos, HTTP y URLs que no identifican un video', () => {
  for (const url of [
    'https://youtube.com.example.org/watch?v=AbC123_deFg',
    'https://example.com/watch?v=AbC123_deFg',
    'http://youtube.com/watch?v=AbC123_deFg',
    'https://youtube.com/watch?v=short',
    'javascript:alert(1)',
    '',
  ]) {
    assert.equal(youtubeVideoId(url), null, url);
    assert.equal(youtubeEmbedUrl(url), null, url);
  }
});

test('video de fondo: silenciado, en bucle, sin controles y con API para pausarlo', () => {
  const url = new URL(youtubeBackgroundUrl('https://www.youtube.com/watch?v=AbC123_deFg'));
  assert.equal(url.origin, 'https://www.youtube-nocookie.com');
  assert.equal(url.pathname, '/embed/AbC123_deFg');
  for (const [clave, valor] of Object.entries({
    autoplay: '1',
    mute: '1',
    loop: '1',
    playlist: 'AbC123_deFg',
    controls: '0',
    enablejsapi: '1',
  })) {
    assert.equal(url.searchParams.get(clave), valor);
  }
  assert.equal(youtubeBackgroundUrl('https://example.com/watch?v=AbC123_deFg'), null);
});

test('miniatura del tráiler solo para enlaces válidos', () => {
  assert.equal(
    youtubeThumbnailUrl('https://youtu.be/AbC123_deFg'),
    'https://i.ytimg.com/vi/AbC123_deFg/hqdefault.jpg',
  );
  assert.equal(youtubeThumbnailUrl(null), null);
});

test('transmisión simulada: autoplay silenciado con controles; bucle solo en vivo', () => {
  const vivo = new URL(youtubePlayerUrl('https://youtu.be/AbC123_deFg', { bucle: true }));
  assert.equal(vivo.searchParams.get('autoplay'), '1');
  assert.equal(vivo.searchParams.get('mute'), '1');
  assert.equal(vivo.searchParams.get('controls'), '1');
  assert.equal(vivo.searchParams.get('loop'), '1');
  assert.equal(vivo.searchParams.get('playlist'), 'AbC123_deFg');
  const replay = new URL(youtubePlayerUrl('https://youtu.be/AbC123_deFg'));
  assert.equal(replay.searchParams.get('loop'), null);
  assert.equal(youtubePlayerUrl('https://example.com/x'), null);
});
