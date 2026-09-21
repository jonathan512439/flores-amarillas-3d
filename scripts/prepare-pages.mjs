import { readFile, cp, stat, writeFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute, sep } from 'node:path';

const root = resolve('dist/client');
const prefix = (process.env.PAGES_BASE_PATH || '').replace(/\/$/, '');
if (prefix && !/^\/[a-zA-Z0-9._/-]+$/.test(prefix)) throw new Error('Prefijo de Pages inválido.');
const safePath = path => {
  const target = resolve(root, path);
  const local = relative(root, target);
  if (isAbsolute(local) || local === '..' || local.startsWith('..' + sep)) throw new Error('Ruta fuera del artefacto.');
  return target;
};

// Vinext emits path-prefixed assets physically inside that prefix.
// GitHub already mounts the artifact at /repository/, so copy _next to
// the artifact root. Keep the originals; no files are deleted.
if (prefix) {
  const nested = safePath(prefix.slice(1) + '/_next');
  await cp(nested, safePath('_next'), { recursive: true });
}
const html = await readFile(safePath('index.html'), 'utf8');
let checked = 0;
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const url = match[1];
  if (!url.includes('/_next/') && !url.endsWith('/favicon.svg')) continue;
  if (prefix && !url.startsWith(prefix + '/')) throw new Error('Recurso sin prefijo de Pages: ' + url);
  const path = url.slice(prefix.length).split('?')[0].replace(/^\/+/, '');
  if (!(await stat(safePath(decodeURIComponent(path)))).isFile()) throw new Error('Recurso ausente: ' + url);
  checked++;
}
if (!checked) throw new Error('No se encontraron recursos del cliente en index.html.');
await writeFile(safePath('.nojekyll'), '');
console.log(`GitHub Pages: index.html y ${checked} referencias verificadas bajo ${prefix || '/'}.`);
