'use client';

import { useEffect, useRef } from 'react';
import { DEFAULT_CONFIG, mediaUrl, normalizeConfig } from '@/lib/personalization';
import type { GalaxyApi } from '@/lib/galaxy';

export default function Home() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const soundtrack = useRef<HTMLAudioElement>(null);
  const engine = useRef<GalaxyApi | null>(null);

  useEffect(() => {
    const lifecycle = new AbortController();
    const player = soundtrack.current;
    let disposed = false;
    let api: GalaxyApi | null = null;
    let photoCount = 0;
    let photoIndex = -1;
    let motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    const base = new URL('./', window.location.href).href;
    const play = () => {
      if (player?.getAttribute('src') && player.paused) void player.play().catch(() => { /* Retry on the next real gesture. */ });
    };
    const keyDown = (event: KeyboardEvent) => {
      play();
      if (!api) return;
      if (event.key === 'Escape' || event.key === 'Home') { event.preventDefault(); photoIndex = -1; api.reset(); }
      if (event.key === '+' || event.key === '=') { event.preventDefault(); api.zoom(1); }
      if (event.key === '-') { event.preventDefault(); api.zoom(-1); }
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        if (!photoCount) return;
        event.preventDefault(); photoIndex = photoIndex < 0 ? (event.key === 'ArrowRight' ? 0 : photoCount - 1) : (photoIndex + (event.key === 'ArrowRight' ? 1 : -1) + photoCount) % photoCount; api.focus(photoIndex);
      }
      if (event.code === 'Space') { event.preventDefault(); motion = !motion; api.setMotion(motion); }
      if (event.key.toLowerCase() === 'm' && player) player.muted = !player.muted;
    };
    window.addEventListener('pointerdown', play, { passive: true });
    window.addEventListener('touchend', play, { passive: true });
    window.addEventListener('keydown', keyDown);
    let fallbackStarted = false;
    const fallback = async () => {
      if (disposed || fallbackStarted || !canvas.current) return;
      fallbackStarted = true;
      // A separate 2D canvas is required after a WebGL context has been created.
      api?.dispose(); api = null; engine.current = null;
      const oldCanvas = canvas.current;
      const replacement = document.createElement('canvas');
      replacement.className = oldCanvas.className;
      replacement.setAttribute('aria-label', 'Flores amarillas para Cindel');
      replacement.tabIndex = 0;
      oldCanvas.parentElement?.appendChild(replacement); oldCanvas.hidden = true;
      const { createFallback } = await import('@/lib/galaxy-fallback');
      if (disposed) { replacement.remove(); return; }
      const clean = createFallback(replacement, resolvedConfig);
      fallbackCleanup = () => { clean(); replacement.remove(); oldCanvas.hidden = false; };
    };
    let fallbackCleanup: (() => void) | undefined;
    let resolvedConfig = DEFAULT_CONFIG;
    const configPromise = fetch(new URL('media/manifest.json', base), { signal: lifecycle.signal, cache: 'no-cache' })
      .then(async response => { if (!response.ok) throw new Error('Configuration unavailable'); return normalizeConfig(await response.json()); })
      .catch(() => DEFAULT_CONFIG)
      .then(config => {
        const value = { ...config, photos: config.photos.map(photo => ({ ...photo, src: mediaUrl(photo.src, base) })), audio: mediaUrl(config.audio, base) };
        if (!disposed && player && value.audio) { player.src = value.audio; player.volume = value.volume; player.load(); play(); }
        resolvedConfig = value;
        return value;
      });
    void Promise.all([import('@/lib/galaxy'), configPromise]).then(([{ createGalaxy }, config]) => {
      if (disposed || !canvas.current) return;
      api = createGalaxy(canvas.current, index => { photoIndex = index; api?.focus(index); }, error => console.warn(error), () => { void fallback(); });
      engine.current = api; photoCount = config.photos.length;
      api.setPhotos(config.photos); api.setMessages(config); api.setMotion(motion);
    }).catch(() => { void configPromise.finally(() => { void fallback(); }); });
    return () => {
      disposed = true; lifecycle.abort(); api?.dispose(); fallbackCleanup?.(); engine.current = null;
      window.removeEventListener('pointerdown', play); window.removeEventListener('touchend', play); window.removeEventListener('keydown', keyDown);
      player?.pause(); player?.removeAttribute('src');
    };
  }, []);

  return <main className="immersive-universe">
    <h1 className="sr-only">Un universo para Cindel. TE AMO.</h1>
    <canvas ref={canvas} className="immersive-canvas" tabIndex={0} aria-label="Galaxia de flores amarillas y recuerdos. Arrastra para explorar, toca una foto para acercarte y toca el cielo vacío para volver. Flechas para recorrer fotos; Escape para vista completa; M para silenciar." />
    {/* User-provided background music, without spoken content or visible controls. */}
    {/* oxlint-disable-next-line jsx-a11y/media-has-caption */}
    <audio ref={soundtrack} autoPlay loop preload="auto" />
  </main>;
}
