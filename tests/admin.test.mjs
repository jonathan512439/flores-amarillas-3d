import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname, basename, join } from 'node:path';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createAdminServer } from '../scripts/admin-server.mjs';

const exec = promisify(execFile);
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'galaxy-admin-'));
  const media = resolve(root, 'public/media');
  await mkdir(media, { recursive: true });
  await writeFile(resolve(media, 'manifest.json'), JSON.stringify({ name: 'Cindel', dedication: 'TE AMO', phrases: ['Siempre tú.'], photos: [], audio: '', volume: 0.6 }));
  const server = createAdminServer({ projectRoot: root });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    // Only remove the fixture that this test created directly in the OS temp folder.
    if (dirname(root) !== resolve(tmpdir()) || !basename(root).startsWith('galaxy-admin-')) throw new Error('Unexpected fixture path');
    await rm(root, { recursive: true, force: true });
  });
  const post = async (path, payload, headers = {}) => {
    const response = await fetch(origin + path, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-Galaxy-Admin': '1', ...headers }, body: JSON.stringify(payload) });
    return { status: response.status, value: await response.json() };
  };
  return { root, media, origin, post, config: async () => JSON.parse(await readFile(resolve(media, 'manifest.json'), 'utf8')) };
}
const image = { name: 'foto.png', data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=' };
const song = { name: 'cancion.wav', data: Buffer.from('RIFF0000WAVEfmt ').toString('base64') };

test('uploads persist and editing phrases preserves photos and audio after reload', async t => {
  const f = await fixture(t);
  const saved = await f.post('/api/save', { config: { photos: [{ fileName: image.name, name: 'Nuestro recuerdo' }], audioFileName: song.name }, files: [image, song] });
  assert.equal(saved.status, 200, JSON.stringify(saved.value));
  const uploaded = await f.config();
  assert.match(uploaded.audio, /^media\/cancion-[a-f0-9]{16}\.wav$/);
  assert.equal((await readFile(resolve(f.root, 'public', uploaded.photos[0].src))).toString('base64'), image.data.split(',')[1]);
  const updated = await f.post('/api/save', { config: { phrases: ['Te elegiría siempre.'], volume: 0.35 }, files: [] });
  assert.equal(updated.status, 200);
  const reloaded = (await (await fetch(f.origin + '/api/state')).json()).config;
  assert.equal(reloaded.audio, uploaded.audio);
  assert.deepEqual(reloaded.photos, uploaded.photos);
  assert.deepEqual(reloaded.phrases, ['Te elegiría siempre.']);
  assert.equal(reloaded.volume, 0.35);
  const clear = await f.post('/api/save', { config: { audio: '', photos: [] }, files: [] });
  assert.equal(clear.status, 200);
  assert.equal((await f.config()).audio, '');
});

test('invalid uploads and paths cannot change the existing manifest or write partial batches', async t => {
  const f = await fixture(t);
  const initial = await f.config();
  for (const payload of [
    { files: [image, { name: 'manifest.json', data: 'e30=' }] },
    { config: { photos: [{ src: 'media/../../outside.png' }] }, files: [image] },
    { config: { audioFileName: 'missing.mp3' } },
    { config: { phrases: [] } },
  ]) {
    assert.equal((await f.post('/api/save', payload)).status, 400);
    assert.deepEqual(await f.config(), initial);
    assert.deepEqual(await readdir(f.media), ['manifest.json']);
  }
});

test('local editor rejects cross-origin writes, missing headers and rebinding hosts', async t => {
  const f = await fixture(t);
  assert.equal((await f.post('/api/save', {}, { Origin: 'https://example.com' })).status, 403);
  assert.equal((await f.post('/api/publish', {}, { 'X-Galaxy-Admin': '' })).status, 403);
  const status = await new Promise((resolve, reject) => {
    const request = httpRequest(f.origin + '/api/state', { headers: { Host: 'example.com' } }, response => { response.resume(); resolve(response.statusCode); });
    request.on('error', reject); request.end();
  });
  assert.equal(status, 403);
});

test('publishing protects unrelated staged changes and retries a previously failed push', async t => {
  const f = await fixture(t);
  const git = args => exec('git', args, { cwd: f.root, windowsHide: true });
  await git(['init', '-b', 'main']);
  await git(['config', 'user.email', 'fixture@example.test']);
  await git(['config', 'user.name', 'Galaxy test']);
  await writeFile(resolve(f.root, 'notes.txt'), 'Do not publish this staged file');
  await git(['add', 'notes.txt']);
  const blocked = await f.post('/api/publish', {});
  assert.equal(blocked.status, 400);
  assert.match(blocked.value.error, /otros cambios/);
  await git(['rm', '--cached', 'notes.txt']);
  const failed = await f.post('/api/publish', {});
  assert.equal(failed.status, 400); // A commit was created, but no remote is configured yet.
  const head = (await git(['rev-parse', 'HEAD'])).stdout.trim();
  assert.equal((await git(['show', '--pretty=', '--name-only', 'HEAD'])).stdout.trim(), 'public/media/manifest.json');
  const remote = resolve(f.root, 'remote.git');
  await git(['init', '--bare', remote]);
  await git(['remote', 'add', 'origin', remote]);
  assert.equal((await f.post('/api/publish', {})).status, 200);
  assert.equal((await git(['rev-parse', 'HEAD'])).stdout.trim(), head);
  assert.equal((await git(['--git-dir', remote, 'rev-parse', 'refs/heads/main'])).stdout.trim(), head);
});
