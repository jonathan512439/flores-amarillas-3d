'use client';

/* Uploaded and folder images are local files; no remote image optimizer is required. */
/* oxlint-disable next/no-img-element */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Flower2, Heart, Home as HomeIcon, ImagePlus, Minus, Music2, Pause, Play, Plus, Settings2, Sparkles, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DEFAULT_CONFIG, localImageSupported, mediaUrl, normalizeConfig, type Personalization, type Photo } from '@/lib/personalization';
import type { GalaxyApi } from '@/lib/galaxy';

export default function Home() {
  const [config, setConfig] = useState<Personalization>(DEFAULT_CONFIG);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [audioSrc, setAudioSrc] = useState('');
  const [audioName, setAudioName] = useState('Tu canción favorita');
  const [playing, setPlaying] = useState(false);
  const [motion, setMotion] = useState(true);
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [settings, setSettings] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [note, setNote] = useState(0);
  const [message, setMessage] = useState('');
  const [volume, setVolume] = useState(0.6);
  const [localPreview, setLocalPreview] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const galaxy = useRef<GalaxyApi | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const objectUrls = useRef<string[]>([]);
  const photoFiles = useRef<File[]>([]);
  const audioFile = useRef<File | null>(null);
  const uploadSequence = useRef(0);
  const openPhoto = useCallback((index: number) => { setSelected(index); galaxy.current?.focus(index); }, []);

  useEffect(() => {
    let cancelled = false;
    let api: GalaxyApi | null = null;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    import('@/lib/galaxy').then(({ createGalaxy }) => {
      if (cancelled || !canvas.current) return;
      setMotion(!reduced);
      api = createGalaxy(canvas.current, openPhoto, setMessage, () => {
        setFallback(true);
        setMessage('Se interrumpió la vista 3D. Tus recuerdos siguen disponibles abajo. Recarga para volver al cielo.');
      });
      galaxy.current = api;
      setReady(true);
    }).catch(() => {
      setFallback(true);
      setMessage('Este navegador no pudo iniciar el cielo 3D. Puedes ver todas las fotos y escuchar la canción.');
    });
    return () => { cancelled = true; api?.dispose(); galaxy.current = null; };
  }, [openPhoto]);

  useEffect(() => {
    const controller = new AbortController();
    const base = new URL('./', window.location.href).href;
    fetch(new URL('media/manifest.json', base), { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error('No se encontró media/manifest.json.'); return normalizeConfig(await response.json()); })
      .then(value => {
        const resolvedPhotos = value.photos.map(photo => ({ ...photo, src: mediaUrl(photo.src, base) }));
        const resolvedAudio = mediaUrl(value.audio, base);
        setConfig(value); setPhotos(resolvedPhotos); setAudioSrc(resolvedAudio);
        if (value.audio) setAudioName(value.audio.split('/').pop() || 'Nuestra canción');
      }).catch(error => { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'No se pudo leer la configuración.'); });
    return () => controller.abort();
  }, []);

  useEffect(() => { if (ready) galaxy.current?.setPhotos(photos); }, [photos, ready]);
  useEffect(() => { galaxy.current?.setMotion(motion); }, [motion, ready]);
  useEffect(() => { if (audio.current) audio.current.volume = volume; }, [volume, audioSrc]);
  useEffect(() => () => { objectUrls.current.forEach(url => URL.revokeObjectURL(url)); }, []);

  useEffect(() => {
    type Tool = { name: string; description: string; inputSchema: object; execute: (input: unknown) => Promise<unknown> };
    const context = (document as Document & { modelContext?: { registerTool: (tool: Tool, options: { signal: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context) return;
    const lifecycle = new AbortController();
    Promise.resolve(context.registerTool({
      name: 'navigate_to_memory', description: 'Focus the galaxy camera and open an existing photo, using its one-based number.',
      inputSchema: { type: 'object', properties: { number: { type: 'integer', minimum: 1, maximum: 5 } }, required: ['number'], additionalProperties: false },
      async execute(input) {
        const number = (input as { number?: unknown } | null)?.number;
        if (typeof number !== 'number' || !Number.isInteger(number) || number < 1 || number > photos.length) throw new Error('Ese recuerdo no existe.');
        openPhoto(number - 1);
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        return { opened: number, name: photos[number - 1].name };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [photos, openPhoto]);

  function makeUrl(file: File) { const url = URL.createObjectURL(file); objectUrls.current.push(url); return url; }
  async function choosePhotos(files: FileList | null) {
    if (!files?.length) return;
    if (files.length > 5) { setMessage('Elige entre una y cinco fotografías.'); return; }
    const chosen = Array.from(files);
    if (chosen.some(file => !localImageSupported(file))) { setMessage('Usa fotografías JPG, PNG, WebP, GIF o AVIF de hasta 20 MB cada una.'); return; }
    const sequence = ++uploadSequence.current;
    const urls = chosen.map(makeUrl);
    try {
      await Promise.all(urls.map(src => new Promise<void>((resolve, reject) => {
        const image = new Image(); image.onload = () => resolve(); image.onerror = reject; image.src = src;
      })));
      if (sequence !== uploadSequence.current) return;
      const next = chosen.map((file, index) => ({ src: urls[index], name: 'Nuestro recuerdo ' + (index + 1) }));
      photoFiles.current = chosen;
      setPhotos(next); setSelected(null); setLocalPreview(true); setMessage('Fotografías listas para previsualizar.');
      setConfig(current => ({ ...current, photos: chosen.map((file, index) => ({ src: 'media/' + file.name, name: next[index].name })) }));
    } catch { setMessage('Una de las imágenes está dañada o no se puede abrir en este navegador.'); }
  }
  function chooseAudio(files: FileList | null) {
    const file = files?.[0]; if (!file) return;
    if (!/\.(mp3|m4a|aac|ogg|wav|flac|webm)$/i.test(file.name) || !file.size || file.size > 50 * 1024 * 1024) { setMessage('Elige un archivo MP3, M4A, AAC, OGG, WAV, FLAC o WebM de hasta 50 MB.'); return; }
    audio.current?.pause(); audioFile.current = file; setPlaying(false); setAudioSrc(makeUrl(file));
    setAudioName(file.name); setLocalPreview(true); setConfig(current => ({ ...current, audio: 'media/' + file.name }));
  }
  async function toggleAudio() {
    if (!audioSrc) { setSettings(true); return; }
    if (!audio.current) return;
    if (!audio.current.paused) { audio.current.pause(); return; }
    try { await audio.current.play(); }
    catch { setMessage('No se pudo reproducir la canción. Prueba con MP3 o M4A con AAC y vuelve a pulsar Música.'); }
  }
  function downloadConfig() {
    const value = { ...config, phrases: config.phrases.filter(Boolean) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'manifest.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('Configuración descargada. Colócala con tus archivos en public/media y vuelve a publicar.');
  }
  const currentPhoto = selected === null ? null : photos[selected];

  return <main className="universe">
    <canvas ref={canvas} className="universe-canvas" aria-label="Galaxia 3D de flores amarillas. Arrastra para girar y usa la rueda o dos dedos para acercarte." tabIndex={0} onKeyDown={event => {
      if (event.key === '+' || event.key === '=') { event.preventDefault(); galaxy.current?.zoom(1); }
      if (event.key === '-') { event.preventDefault(); galaxy.current?.zoom(-1); }
      if (event.key === 'Home') { event.preventDefault(); galaxy.current?.reset(); }
    }} />
    <div className="sky-shade" />
    <header className="sky-header">
      <div className="sky-brand"><Flower2 size={24} /><div>UN UNIVERSO PARA TI<span>21 DE SEPTIEMBRE</span></div></div>
      <div className="sky-tools"><button onClick={toggleAudio} className={playing ? 'active' : ''} aria-label={playing ? 'Pausar música' : 'Reproducir música'}>{playing ? <Pause size={18} /> : <Music2 size={18} />}<span>Música</span></button><button onClick={() => setSettings(true)} aria-label="Personalizar constelación"><Settings2 size={19} /></button></div>
    </header>
    <section className="sky-heading"><p className="sky-eyebrow">FLORES QUE NUNCA DEJAN DE BRILLAR</p><h1>Un cielo entero,<br /><em>para {config.name}.</em></h1><p className="sky-dedication">{config.dedication}</p></section>
    {!ready && !fallback && <output className="sky-loading">Encendiendo las estrellas…</output>}
    {fallback && <p className="sky-loading">Tus recuerdos, también sin 3D.</p>}
    <nav className="camera-tools" aria-label="Controles de la galaxia">
      <button onClick={() => galaxy.current?.zoom(1)} aria-label="Acercar"><Plus size={18} /></button>
      <button onClick={() => galaxy.current?.zoom(-1)} aria-label="Alejar"><Minus size={18} /></button>
      <button onClick={() => galaxy.current?.reset()} aria-label="Ver galaxia completa"><HomeIcon size={18} /></button>
      <button onClick={() => setMotion(value => !value)} aria-label={motion ? 'Pausar movimiento ambiental' : 'Activar movimiento ambiental'} aria-pressed={!motion}>{motion ? <Pause size={18} /> : <Play size={18} />}</button>
    </nav>
    <section className="sky-bottom">
      <p className="navigation-hint">Arrastra para explorar <span>·</span> Pellizca o usa la rueda para acercarte</p>
      <div className="memory-and-letter">
        <nav className="memory-list" aria-label="Nuestros recuerdos">{photos.length ? photos.map((photo, index) => <button key={photo.src} onClick={() => openPhoto(index)} title={photo.name} aria-label={'Ver recuerdo ' + (index + 1) + ': ' + photo.name}><img src={photo.src} alt="" loading="lazy" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} /><span>{String(index + 1).padStart(2, '0')}</span></button>) : <div className="flowers-note"><Flower2 size={23} /><p>No son solo flores.<br /><em>Es mi manera de elegirte.</em></p></div>}</nav>
        <article className="love-letter"><Heart size={18} /><div><p>SIEMPRE TÚ · {String(note % config.phrases.length + 1).padStart(2, '0')}</p><blockquote>“{config.phrases[note % config.phrases.length]}”</blockquote></div><button aria-label="Leer otra frase" onClick={() => setNote(value => (value + 1) % config.phrases.length)}><ChevronRight size={20} /></button></article>
      </div>
      <footer className="sky-footer"><span>Un pequeño infinito, hecho con amor.</span><span>✦ &nbsp; {localPreview ? 'Vista previa local' : '21 / 09'}</span></footer>
    </section>
    {message && <output className="sky-notice"><span>{message}</span><button aria-label="Cerrar aviso" onClick={() => setMessage('')}><X size={17} /></button></output>}
    {/* Music is user supplied; there is no speech or video requiring captions. */}
    {/* oxlint-disable-next-line jsx-a11y/media-has-caption */}
    <audio ref={audio} src={audioSrc || undefined} preload="none" loop onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => { setPlaying(false); setMessage('No se pudo abrir el audio. Comprueba el archivo o utiliza MP3.'); }} />

    <Sheet open={settings} onOpenChange={setSettings}>
      <SheetContent className="customization" showCloseButton={false}>
        <div className="customization-title"><div><p className="sky-eyebrow">DALE TU HISTORIA</p><SheetTitle>Tu constelación</SheetTitle></div><button aria-label="Cerrar personalización" onClick={() => setSettings(false)}><X size={20} /></button></div>
        <SheetDescription>Los cambios se previsualizan aquí. Para compartirlos con ella, descarga la configuración y publica tus archivos.</SheetDescription>
        <label>Su nombre<input maxLength={60} value={config.name} onChange={event => { setConfig(value => ({ ...value, name: event.target.value })); setLocalPreview(true); }} /></label>
        <label>Tu dedicatoria<textarea maxLength={400} value={config.dedication} onChange={event => { setConfig(value => ({ ...value, dedication: event.target.value })); setLocalPreview(true); }} /></label>
        <label className="file-picker"><ImagePlus size={21} /><span>Elegir fotografías<small>Entre 1 y 5 · hasta 20 MB por imagen</small></span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" multiple onChange={event => { void choosePhotos(event.target.files); event.target.value = ''; }} /></label>
        <label className="file-picker"><Music2 size={21} /><span>Elegir canción<small>{audioName}</small></span><input type="file" accept="audio/*,.m4a,.aac,.flac" onChange={event => { chooseAudio(event.target.files); event.target.value = ''; }} /></label>
        <label>Volumen · {Math.round(volume * 100)}%<input type="range" min={0} max={1} step={0.05} value={volume} onChange={event => setVolume(Number(event.target.value))} /></label>
        <fieldset><legend>Frases de amor</legend>{config.phrases.map((phrase, index) => <label key={index} className="phrase-label">Frase {index + 1}<textarea value={phrase} maxLength={300} onChange={event => { setConfig(current => ({ ...current, phrases: current.phrases.map((p, i) => i === index ? event.target.value : p) })); setLocalPreview(true); }} /></label>)}</fieldset>
        <p className="local-explanation">Las fotos y el audio que eliges no se suben a Internet y se pierden al recargar. Guarda los originales en <code>public/media</code> y reemplaza allí <code>manifest.json</code> con la descarga.</p>
        <button className="gold-button" onClick={downloadConfig}><Download size={18} /> Descargar configuración</button>
        <button className="quiet-button" onClick={() => setSettings(false)}>Volver a las estrellas <Sparkles size={16} /></button>
      </SheetContent>
    </Sheet>
    <Dialog open={selected !== null && !!currentPhoto} onOpenChange={open => { if (!open) setSelected(null); }}>
      <DialogContent className="memory-dialog" showCloseButton={false}>
        <div className="memory-dialog-heading"><DialogTitle>{currentPhoto?.name}</DialogTitle><button aria-label="Cerrar fotografía" onClick={() => setSelected(null)}><X size={22} /></button></div>
        <DialogDescription>{config.phrases[(selected ?? 0) % config.phrases.length]}</DialogDescription>
        {currentPhoto && <img src={currentPhoto.src} alt={currentPhoto.name} onError={event => { event.currentTarget.alt = 'No se pudo cargar esta fotografía. Revisa su ruta.'; }} />}
        <div className="memory-pagination"><button disabled={photos.length < 2} aria-label="Recuerdo anterior" onClick={() => openPhoto(((selected ?? 0) - 1 + photos.length) % photos.length)}><ChevronLeft size={20} /></button><span>{(selected ?? 0) + 1} / {photos.length}</span><button disabled={photos.length < 2} aria-label="Recuerdo siguiente" onClick={() => openPhoto(((selected ?? 0) + 1) % photos.length)}><ChevronRight size={20} /></button></div>
      </DialogContent>
    </Dialog>
  </main>;
}
