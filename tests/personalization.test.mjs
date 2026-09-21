import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig, mediaUrl } from '../lib/personalization.ts';

test('limita fotos a cinco y descarta entradas mal formadas', () => {
  assert.equal(normalizeConfig({ photos: Array.from({ length: 8 }, (_, i) => ({ src: `media/${i}.jpg` })) }).photos.length, 5);
  assert.deepEqual(normalizeConfig({ photos: [null, {}, { src: '' }] }).photos, []);
});
test('recupera las frases predeterminadas ante una configuración vacía', () => {
  const result = normalizeConfig({ phrases: ['', 2, null] });
  assert.ok(result.phrases.length > 0);
  assert.equal(result.name, 'ti');
  assert.throws(() => normalizeConfig(null));
});
test('conserva la subruta de GitHub Pages y codifica nombres con espacios', () => {
  assert.equal(mediaUrl('/media/nuestro día.jpg', 'https://example.com/flores/'), 'https://example.com/flores/media/nuestro%20d%C3%ADa.jpg');
  assert.equal(mediaUrl('media/cancion.m4a', 'https://example.com/'), 'https://example.com/media/cancion.m4a');
});
test('rechaza protocolos peligrosos y rutas fuera del sitio', () => {
  assert.throws(() => mediaUrl('javascript:alert(1)', 'https://example.com/flores/'));
  assert.throws(() => mediaUrl('//otro.example/photo.jpg', 'https://example.com/flores/'));
  assert.throws(() => mediaUrl('../privado.jpg', 'https://example.com/flores/'));
  assert.equal(mediaUrl('blob:https://example.com/id', 'https://example.com/'), 'blob:https://example.com/id');
});
