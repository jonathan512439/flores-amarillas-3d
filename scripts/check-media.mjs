import { readFile, stat } from 'node:fs/promises';
import { resolve, relative, isAbsolute, sep } from 'node:path';

const root = resolve('public');
const config = JSON.parse(await readFile(resolve(root, 'media/manifest.json'), 'utf8'));
const issues = [];
if (typeof config.name !== 'string' || !config.name.trim()) issues.push('Falta el nombre.');
if (!Array.isArray(config.photos) || config.photos.length > 5) issues.push('photos debe ser un array de entre 0 y 5 fotografías.');
if (!Array.isArray(config.phrases) || !config.phrases.length || config.phrases.some(p => typeof p !== 'string' || !p.trim())) issues.push('Añade al menos una frase no vacía.');
const entries = [ ...(Array.isArray(config.photos) ? config.photos.map(photo => photo?.src) : []), ...(config.audio ? [config.audio] : []) ];
for (const entry of entries) {
  if (typeof entry !== 'string' || !entry) { issues.push('Ruta de archivo vacía o inválida.'); continue; }
  if (/^https?:\/\//i.test(entry)) { issues.push('Para publicación autónoma, usa un archivo local: ' + entry); continue; }
  if (/^[a-z][a-z\d+.-]*:/i.test(entry) || entry.startsWith('//')) { issues.push('Ruta no permitida: ' + entry); continue; }
  const target = resolve(root, entry.replace(/^\/+/, ''));
  const local = relative(root, target);
  if (isAbsolute(local) || local === '..' || local.startsWith('..' + sep)) { issues.push('El archivo sale de public: ' + entry); continue; }
  try { const file = await stat(target); if (!file.isFile() || file.size === 0) issues.push('Archivo vacío o inválido: ' + entry); }
  catch { issues.push('Archivo no encontrado (comprueba mayúsculas y extensión): ' + entry); }
}
if (issues.length) { console.error(issues.join('\n')); process.exitCode = 1; }
else { console.log(`Configuración válida: ${config.photos.length} fotografías; audio ${config.audio ? 'presente' : 'pendiente'}.`); }
