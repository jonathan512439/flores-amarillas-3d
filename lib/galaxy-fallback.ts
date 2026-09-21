import type { Personalization } from './personalization';

// Quiet, pannable visual fallback for devices without WebGL. No controls or overlays.
export function createFallback(canvas: HTMLCanvasElement, config: Personalization) {
  const context = canvas.getContext('2d');
  if (!context) return () => undefined;
  const ctx = context;
  let width = 1, height = 1, frame = 0, offset = 0, previousX = 0;
  let dragging = false, disposed = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const images = config.photos.map(photo => { const image = new Image(); image.src = photo.src; return image; });
  const resize = () => {
    width = canvas.clientWidth; height = canvas.clientHeight;
    const dpr = Math.min(devicePixelRatio, 1.5); canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
  function draw(time: number) {
    if (disposed) return;
    frame = requestAnimationFrame(draw);
    if (document.hidden) return;
    ctx.clearRect(0, 0, width, height);
    const scale = Math.min(width, height) / 70;
    const phase = offset + (reduced ? 0 : time * 0.000008);
    for (let i = 0; i < 850; i++) {
      const radius = Math.sqrt((i * 37 % 851) / 851) * 35;
      const angle = i % 3 * Math.PI * 2 / 3 + radius * 0.24 + phase + Math.sin(i * 67) * 0.16;
      const x = width / 2 + Math.cos(angle) * radius * scale, y = height / 2 + Math.sin(angle) * radius * scale * 0.52;
      ctx.fillStyle = i % 9 ? '#f1c67599' : '#e2ecff'; ctx.beginPath(); ctx.arc(x, y, i % 23 ? 1 : 2, 0, Math.PI * 2); ctx.fill();
      if (i % 23 === 0) {
        ctx.fillStyle = '#f2c432';
        for (let p = 0; p < 10; p++) { const a = p * Math.PI / 5; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 5, y + Math.sin(a) * 5, 4, 1.6, a, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#5e350b'; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffe1a0'; ctx.font = 'italic ' + Math.min(40, width / 11) + 'px Georgia';
    ctx.fillText('Para ' + config.name, width / 2, height * 0.15, width * 0.85);
    ctx.font = '20px Georgia'; ctx.fillText('TE AMO', width / 2, height * 0.21);
    images.forEach((image, index) => {
      if (!image.complete || !image.naturalWidth) return;
      const a = index / images.length * Math.PI * 2 + phase;
      const w = Math.min(150, width / 3), h = w * image.naturalHeight / image.naturalWidth;
      const x = width / 2 + Math.cos(a) * width * 0.29, y = height / 2 + Math.sin(a) * height * 0.25;
      ctx.drawImage(image, x - w / 2, y - h / 2, w, h);
    });
  }
  const down = (event: PointerEvent) => { dragging = true; previousX = event.clientX; canvas.setPointerCapture(event.pointerId); };
  const move = (event: PointerEvent) => { if (dragging) { offset += (event.clientX - previousX) * 0.005; previousX = event.clientX; } };
  const up = () => { dragging = false; };
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  frame = requestAnimationFrame(draw);
  return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); };
}
