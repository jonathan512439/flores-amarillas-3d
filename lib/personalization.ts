export type Photo = { src: string; name: string };
export type Personalization = { name: string; dedication: string; photos: Photo[]; audio: string; phrases: string[] };

export const DEFAULT_PHRASES = [
  'Si el universo tiene un centro, para mí eres tú.',
  'Tu sonrisa hace florecer hasta mis días más grises.',
  'Entre millones de estrellas, volvería a encontrarte.',
  'No necesito pedirle nada al cielo cuando estás conmigo.',
  'Te elegiría en esta vida y en todas las constelaciones posibles.',
];
export const DEFAULT_CONFIG: Personalization = {
  name: 'ti',
  dedication: 'Hay personas que llegan y lo iluminan todo. Tú eres la mía.',
  photos: [],
  audio: '',
  phrases: DEFAULT_PHRASES,
};

export function normalizeConfig(value: unknown): Personalization {
  if (!value || typeof value !== 'object') throw new Error('La configuración debe ser un objeto JSON.');
  const input = value as Record<string, unknown>;
  const text = (v: unknown, fallback: string, max: number) => typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : fallback;
  const photos: Photo[] = Array.isArray(input.photos) ? input.photos.slice(0, 5).flatMap((v, i) => {
    if (!v || typeof v !== 'object' || typeof v.src !== 'string' || !v.src.trim()) return [];
    return [{ src: v.src.trim(), name: text(v.name, 'Recuerdo ' + (i + 1), 80) }];
  }) : [];
  const phrases = Array.isArray(input.phrases) ? input.phrases.filter((v): v is string => typeof v === 'string' && !!v.trim()).slice(0, 20).map(v => v.trim().slice(0, 300)) : [];
  return { name: text(input.name, DEFAULT_CONFIG.name, 60), dedication: text(input.dedication, DEFAULT_CONFIG.dedication, 400), photos, audio: typeof input.audio === 'string' ? input.audio.trim() : '', phrases: phrases.length ? phrases : DEFAULT_PHRASES };
}

// Resolve relative to the site, including /repository/ on GitHub Pages.
export function mediaUrl(path: string, siteUrl: string): string {
  if (!path) return '';
  if (/^(blob:|data:image\/)/i.test(path)) return path;
  if (/^https?:\/\//i.test(path)) return path;
  if (/^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith('//')) throw new Error('Ruta de archivo no permitida.');
  const url = new URL(path.replace(/^\/+/, ''), siteUrl);
  if (!url.pathname.startsWith(new URL(siteUrl).pathname)) throw new Error('El archivo debe estar dentro del sitio.');
  return url.href;
}

export function localImageSupported(file: File): boolean {
  return /\.(jpe?g|png|webp|avif|gif)$/i.test(file.name) && file.size > 0 && file.size <= 20 * 1024 * 1024;
}
