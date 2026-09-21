import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, readdir, lstat, rename } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const exec = promisify(execFile);
const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);
const audioExtensions = new Set(['.mp3', '.m4a', '.aac', '.ogg', '.wav', '.flac', '.webm']);
const megabyte = 1024 * 1024;
const json = (response, status, value) => {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(value));
};

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 205 * megabyte) throw new Error('El conjunto de archivos es demasiado grande.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

// The editor is local. Nothing in this module or admin/ is exported to Pages.
export function createAdminServer({ projectRoot = resolve('.') } = {}) {
  const mediaDir = resolve(projectRoot, 'public/media');
  const adminDir = resolve(projectRoot, 'admin');
  let writing = false;
  const git = args => exec('git', args, { cwd: projectRoot, windowsHide: true, timeout: 120000, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  const readConfig = async () => JSON.parse(await readFile(resolve(mediaDir, 'manifest.json'), 'utf8'));
  async function listFiles() {
    const entries = await readdir(mediaDir, { withFileTypes: true });
    return Promise.all(entries.filter(entry => entry.isFile() && (imageExtensions.has(extname(entry.name).toLowerCase()) || audioExtensions.has(extname(entry.name).toLowerCase())))
      .map(async entry => ({ name: entry.name, size: (await lstat(resolve(mediaDir, entry.name))).size })));
  }
  async function save(input) {
    const previous = await readConfig();
    const config = { ...previous, ...input.config };
    if (!Array.isArray(input.files ?? []) || (input.files?.length ?? 0) > 6) throw new Error('Adjunta hasta cinco fotos y una canción.');
    const uploads = new Map();
    let photoUploads = 0;
    let audioUploads = 0;
    for (const file of input.files ?? []) {
      if (!file || typeof file.name !== 'string' || typeof file.data !== 'string' || uploads.has(file.name)) throw new Error('Archivos adjuntos inválidos o con nombres repetidos.');
      const extension = extname(file.name).toLowerCase();
      const isImage = imageExtensions.has(extension);
      if (!isImage && !audioExtensions.has(extension)) throw new Error('Formato no permitido: ' + file.name);
      if (isImage) photoUploads++; else audioUploads++;
      if (photoUploads > 5 || audioUploads > 1) throw new Error('Adjunta hasta cinco fotos y una canción.');
      const raw = file.data.replace(/^data:[^,]*;base64,/, '');
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(raw) || raw.length % 4 !== 0) throw new Error('El archivo no está codificado correctamente.');
      const bytes = Buffer.from(raw, 'base64');
      if (!bytes.length || bytes.length > (isImage ? 20 : 50) * megabyte) throw new Error('Máximo 20 MB por foto y 50 MB para la canción.');
      const stem = file.name.slice(0, -extension.length).normalize('NFKC').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^[-_]+|[-_]+$/g, '').slice(0, 48) || 'recuerdo';
      const name = `${stem}-${createHash('sha256').update(bytes).digest('hex').slice(0, 16)}${extension}`;
      uploads.set(file.name, { name, bytes });
    }
    const pending = new Map([...uploads.values()].map(file => ['media/' + file.name, file]));
    async function mediaReference(src, extensions) {
      if (typeof src !== 'string' || !/^media\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(src) || !extensions.has(extname(src).toLowerCase())) throw new Error('Ruta de recuerdo inválida. Usa archivos de public/media.');
      if (!pending.has(src)) {
        const info = await lstat(resolve(mediaDir, src.slice(6)));
        if (!info.isFile() || info.isSymbolicLink() || !info.size) throw new Error('Falta el archivo del recuerdo: ' + src);
      }
      return src;
    }
    if (!Array.isArray(config.photos) || config.photos.length > 5) throw new Error('Elige como máximo cinco fotos.');
    const photos = await Promise.all(config.photos.map(async (photo, index) => ({
      src: await mediaReference(photo?.fileName ? 'media/' + uploads.get(photo.fileName)?.name : photo?.src, imageExtensions),
      name: String(photo?.name || `Recuerdo ${index + 1}`).trim().slice(0, 100),
    })));
    const audio = config.audioFileName ? 'media/' + uploads.get(config.audioFileName)?.name : config.audio;
    const phrases = Array.isArray(config.phrases) ? config.phrases.filter(value => typeof value === 'string' && value.trim()).map(value => value.trim().slice(0, 300)) : [];
    if (!phrases.length || phrases.length > 12) throw new Error('Escribe entre una y doce frases.');
    const volume = Number(config.volume ?? 0.6);
    if (!Number.isFinite(volume)) throw new Error('Volumen inválido.');
    const manifest = {
      name: String(config.name || 'Cindel').trim().slice(0, 80) || 'Cindel',
      dedication: String(config.dedication || '').trim().slice(0, 500), photos,
      audio: audio ? await mediaReference(audio, audioExtensions) : '', phrases,
      volume: Math.max(0, Math.min(1, volume)),
    };
    // Validate the whole request before writing. Content hashes preserve previous files.
    await mkdir(mediaDir, { recursive: true });
    for (const file of uploads.values()) {
      try { await writeFile(resolve(mediaDir, file.name), file.bytes, { flag: 'wx' }); }
      catch (error) { if (error.code !== 'EEXIST') throw error; }
    }
    const temporary = resolve(mediaDir, `.manifest-${randomUUID()}.tmp`);
    await writeFile(temporary, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    await rename(temporary, resolve(mediaDir, 'manifest.json'));
    return { ok: true, config: manifest, files: await listFiles() };
  }
  async function publish() {
    const branch = (await git(['branch', '--show-current'])).stdout.trim();
    if (branch !== 'main') throw new Error('Para publicar, abre este proyecto en la rama main.');
    const staged = (await git(['diff', '--cached', '--name-only', '-z'])).stdout.split('\0').filter(Boolean);
    if (staged.some(file => !file.startsWith('public/media/'))) throw new Error('Hay otros cambios preparados en Git. Confírmalos o retíralos del área de preparación antes de publicar los recuerdos.');
    // Only the current manifest and referenced files belong to this publication.
    const manifest = await readConfig();
    const paths = ['public/media/manifest.json', ...manifest.photos.map(photo => 'public/' + photo.src), ...(manifest.audio ? ['public/' + manifest.audio] : [])];
    await git(['add', '--', ...paths]);
    const changes = (await git(['diff', '--cached', '--name-only', '--', 'public/media'])).stdout.trim();
    if (changes) await git(['commit', '-m', 'Update Cindel galaxy memories']);
    // Retry a previously failed push even if the files have already been committed.
    await git(['push', 'origin', 'main']);
    return { ok: true, message: 'Cambios enviados a GitHub. Espera a que Actions termine de publicar antes de compartir el enlace.' };
  }
  const server = createServer(async (request, response) => {
    try {
      const port = server.address()?.port;
      const allowedHosts = [`localhost:${port}`, `127.0.0.1:${port}`];
      if (!allowedHosts.includes(request.headers.host)) return json(response, 403, { error: 'Este panel solo admite acceso local.' });
      const url = new URL(request.url, 'http://' + request.headers.host);
      if (request.method === 'POST') {
        if (request.headers.origin !== url.origin || request.headers['x-galaxy-admin'] !== '1' || !request.headers['content-type']?.startsWith('application/json')) return json(response, 403, { error: 'Solicitud externa rechazada. Abre el panel local para guardar.' });
        if (writing) return json(response, 409, { error: 'Espera a que termine el guardado anterior.' });
        if (!['/api/save', '/api/publish'].includes(url.pathname)) return json(response, 404, { error: 'Ruta no encontrada.' });
        writing = true;
        try { return json(response, 200, url.pathname === '/api/save' ? await save(await readBody(request)) : await publish()); }
        finally { writing = false; }
      }
      if (request.method === 'GET' && url.pathname === '/api/state') return json(response, 200, { config: await readConfig(), files: await listFiles() });
      const staticFiles = { '/': ['index.html', 'text/html; charset=utf-8'], '/admin.js': ['admin.js', 'text/javascript; charset=utf-8'], '/admin.css': ['admin.css', 'text/css; charset=utf-8'] };
      const asset = staticFiles[url.pathname];
      if (request.method === 'GET' && asset) {
        const content = await readFile(resolve(adminDir, asset[0]));
        response.writeHead(200, { 'Content-Type': asset[1], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" });
        return response.end(content);
      }
      json(response, 404, { error: 'Ruta no encontrada.' });
    } catch (error) { json(response, 400, { ok: false, error: error instanceof Error ? error.message : 'Error inesperado.' }); }
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.ADMIN_PORT || 4174);
  createAdminServer().listen(port, '127.0.0.1', () => console.log(`Panel local: http://localhost:${port}`));
}
