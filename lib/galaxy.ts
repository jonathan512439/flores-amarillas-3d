import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { Personalization, Photo } from './personalization';

export type GalaxyApi = {
  focus: (index: number) => void;
  reset: () => void;
  zoom: (direction: number) => void;
  setMotion: (enabled: boolean) => void;
  setPhotos: (photos: Photo[]) => void;
  setMessages: (config: Personalization) => void;
  dispose: () => void;
};

const PHOTO_POSITIONS = [[-13, 6, 5], [12, 4, -5], [4, 8, 14], [-9, 1, -15], [16, -2, 9]];

export function createGalaxy(
  canvas: HTMLCanvasElement,
  onPhoto: (index: number) => void,
  onMediaError: (message: string) => void,
  onContextLost: () => void,
): GalaxyApi {
  const small = window.innerWidth < 700;
  const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let motion = !reducedQuery.matches;
  let destroyed = false;
  let animationFrame = 0;
  let seed = 2109;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.25 : 1.75));
  renderer.setClearColor(0x060911, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x060911, 0.0055);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 300);
  const overview = new THREE.Vector3(0, small ? 37 : 29, small ? 69 : 51);
  camera.position.copy(overview);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.enablePan = true;
  controls.minDistance = 5;
  controls.maxDistance = 115;
  controls.maxPolarAngle = Math.PI * 0.89;
  controls.rotateSpeed = 0.5;
  controls.zoomSpeed = 0.7;
  controls.autoRotateSpeed = 0.25;
  controls.autoRotate = motion;
  controls.target.set(0, 0, 0);
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const geometry = <T extends THREE.BufferGeometry>(g: T) => { geometries.add(g); return g; };
  const material = <T extends THREE.Material>(m: T) => { materials.add(m); return m; };
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 64;
  const ctx = glowCanvas.getContext('2d')!;
  const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, '#fff'); glow.addColorStop(0.12, '#fff'); glow.addColorStop(0.35, '#ffffff65'); glow.addColorStop(1, '#ffffff00');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 64, 64);
  const glowTexture = new THREE.CanvasTexture(glowCanvas); textures.add(glowTexture);
  scene.add(new THREE.HemisphereLight(0xffefd2, 0x303965, 3));
  const light = new THREE.DirectionalLight(0xffe9b2, 4); light.position.set(8, 20, 18); scene.add(light);
  const rim = new THREE.DirectionalLight(0x7d99ff, 2); rim.position.set(-20, -3, -15); scene.add(rim);
  const garden = new THREE.Group(); scene.add(garden);

  // Hundreds of real curved petals share geometry and only four draw calls.
  const flowerCount = small ? 85 : 185;
  const petalGeometry = geometry(new THREE.SphereGeometry(1, 8, 6));
  const petals = new THREE.InstancedMesh(petalGeometry, material(new THREE.MeshStandardMaterial({ color: 0xffc72e, roughness: 0.65, metalness: 0.13, emissive: 0x8f3f02, emissiveIntensity: 0.26 })), flowerCount * 18);
  const centers = new THREE.InstancedMesh(geometry(new THREE.SphereGeometry(1, 12, 8)), material(new THREE.MeshStandardMaterial({ color: 0x5d280a, roughness: 0.96, emissive: 0x422002, emissiveIntensity: 0.25 })), flowerCount);
  const stems = new THREE.InstancedMesh(geometry(new THREE.CylinderGeometry(0.026, 0.045, 1, 5)), material(new THREE.MeshStandardMaterial({ color: 0x567338, roughness: 0.9 })), flowerCount);
  const leaves = new THREE.InstancedMesh(petalGeometry, material(new THREE.MeshStandardMaterial({ color: 0x829440, roughness: 0.8, side: THREE.DoubleSide })), flowerCount * 2);
  const flower = new THREE.Object3D();
  const part = new THREE.Object3D();
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < flowerCount; i++) {
    const radius = 3 + Math.pow(random(), 0.66) * 25;
    const angle = (i % 3) * Math.PI * 2 / 3 + radius * 0.24 + (random() - 0.5) * 0.5;
    flower.position.set(Math.cos(angle) * radius, (random() - 0.5) * 4, Math.sin(angle) * radius);
    flower.rotation.set(-Math.PI * 0.3 + random() * 0.65, random() * 0.65, (random() - 0.5) * 0.7);
    flower.scale.setScalar(0.45 + random() * 0.8);
    flower.updateMatrix();
    for (let p = 0; p < 18; p++) {
      const a = p / 18 * Math.PI * 2;
      part.position.set(Math.cos(a) * 0.44, Math.sin(a) * 0.44, -0.035 + (p % 2) * 0.07);
      part.rotation.set(Math.sin(a) * 0.14, Math.cos(a) * 0.14, a);
      part.scale.set(0.39, 0.115, 0.047); part.updateMatrix();
      petals.setMatrixAt(i * 18 + p, matrix.multiplyMatrices(flower.matrix, part.matrix));
      petals.setColorAt(i * 18 + p, new THREE.Color().setHSL(0.105 + random() * 0.035, 0.92, 0.50 + random() * 0.17));
    }
    part.position.set(0, 0, 0.035); part.rotation.set(0, 0, 0); part.scale.set(0.265, 0.265, 0.16); part.updateMatrix();
    centers.setMatrixAt(i, matrix.multiplyMatrices(flower.matrix, part.matrix));
    part.position.set(0, -0.9, -0.11); part.scale.set(1, 1.7, 1); part.updateMatrix();
    stems.setMatrixAt(i, matrix.multiplyMatrices(flower.matrix, part.matrix));
    for (let j = 0; j < 2; j++) {
      part.position.set(j ? 0.22 : -0.2, -0.8 - j * 0.4, -0.09);
      part.rotation.set(0, 0, j ? 0.6 : -0.6); part.scale.set(0.12, 0.37, 0.025); part.updateMatrix();
      leaves.setMatrixAt(i * 2 + j, matrix.multiplyMatrices(flower.matrix, part.matrix));
    }
  }
  garden.add(petals, centers, stems, leaves);

  function points(count: number, spiral: boolean) {
    const positions: number[] = [], colors: number[] = [];
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      if (spiral) {
        const r = Math.pow(random(), 0.62) * 34;
        const a = (i % 3) / 3 * Math.PI * 2 + r * 0.24 + (random() - 0.5) * 0.5;
        positions.push(Math.cos(a) * r, (random() - 0.5) * (5 - r / 10), Math.sin(a) * r);
        color.setHSL(i % 9 ? 0.11 : 0.61, 0.68, 0.53 + random() * 0.36);
      } else {
        positions.push((random() - 0.5) * 220, (random() - 0.5) * 150, (random() - 0.5) * 220);
        color.setHSL(0.55 + random() * 0.15, 0.2, 0.65 + random() * 0.3);
      }
      colors.push(color.r, color.g, color.b);
    }
    const g = geometry(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return new THREE.Points(g, material(new THREE.PointsMaterial({ size: spiral ? 0.15 : 0.23, map: glowTexture, transparent: true, opacity: 0.8, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false })));
  }
  const dust = points(small ? 4000 : 11000, true); garden.add(dust);
  scene.add(points(small ? 1000 : 2600, false));

  // Golden constellation nodes surround each memory, even before photos are added.
  const nodes: THREE.Vector3[] = [];
  const linePositions: number[] = [];
  for (let c = 0; c < 5; c++) {
    const anchor = new THREE.Vector3().fromArray(PHOTO_POSITIONS[c]);
    let previous: THREE.Vector3 | null = null;
    for (let n = 0; n < 6; n++) {
      const a = n / 6 * Math.PI * 2;
      const point = anchor.clone().add(new THREE.Vector3(Math.cos(a) * (3 + random() * 2), Math.sin(a) * 3, (random() - 0.5) * 3));
      nodes.push(point);
      if (previous) linePositions.push(...previous.toArray(), ...point.toArray());
      previous = point;
    }
    if (c < 4) linePositions.push(...anchor.toArray(), ...PHOTO_POSITIONS[c + 1]);
  }
  const lineGeometry = geometry(new THREE.BufferGeometry());
  lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  const lineMaterial = material(new THREE.LineBasicMaterial({ color: 0xffd582, transparent: true, opacity: 0.23, depthWrite: false }));
  scene.add(new THREE.LineSegments(lineGeometry, lineMaterial));
  const nodeGeometry = geometry(new THREE.BufferGeometry().setFromPoints(nodes));
  const nodeMaterial = material(new THREE.PointsMaterial({ size: 0.56, color: 0xffdc8e, map: glowTexture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(new THREE.Points(nodeGeometry, nodeMaterial));
  const core = new THREE.Sprite(material(new THREE.SpriteMaterial({ map: glowTexture, color: 0xffae44, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false })));
  core.scale.set(15, 15, 1); scene.add(core);

  // Meteors are short luminous line segments, never full-screen flashes.
  const meteorGeometry = geometry(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(-5, 1.1, -2)]));
  const meteorMaterial = material(new THREE.LineBasicMaterial({ color: 0xffe1ad, transparent: true, opacity: 0 }));
  const meteor = new THREE.Line(meteorGeometry, meteorMaterial); scene.add(meteor);
  let composer: EffectComposer | null = null;
  let bloom: UnrealBloomPass | null = null;
  if (!small) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.45, 0.65, 0.85);
    composer.addPass(bloom);
  }
  const photosGroup = new THREE.Group(); scene.add(photosGroup);
  const wordsGroup = new THREE.Group(); scene.add(wordsGroup);
  const wordResources: Array<THREE.Material | THREE.Texture | THREE.BufferGeometry> = [];
  const words: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  function setMessages(config: Personalization) {
    wordsGroup.clear(); words.length = 0; wordResources.splice(0).forEach(resource => resource.dispose());
    function label(text: string, position: THREE.Vector3, width: number, title = false) {
      const bitmap = document.createElement('canvas'); bitmap.width = 1536; bitmap.height = 384;
      const context = bitmap.getContext('2d')!;
      context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillStyle = title ? '#ffdf8c' : '#f5dea4';
      const size = title ? 110 : 57;
      context.font = (title ? '' : 'italic ') + size + 'px Georgia, serif';
      const lines: string[] = []; let line = '';
      for (const word of text.split(/\s+/)) {
        const next = line ? line + ' ' + word : word;
        if (context.measureText(next).width > 1400 && line) { lines.push(line); line = word; } else line = next;
      }
      if (line) lines.push(line);
      const lineHeight = Math.min(size * 1.25, 340 / Math.max(1, lines.length));
      if (lineHeight < size) context.font = (title ? '' : 'italic ') + Math.floor(lineHeight * 0.82) + 'px Georgia, serif';
      lines.forEach((value, index) => context.fillText(value, 768, 192 + (index - (lines.length - 1) / 2) * lineHeight, 1400));
      const texture = new THREE.CanvasTexture(bitmap); texture.colorSpace = THREE.SRGBColorSpace;
      const shape = new THREE.PlaneGeometry(width, width / 4);
      const ink = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(shape, ink); mesh.position.copy(position); mesh.userData.title = title;
      wordResources.push(texture, shape, ink); words.push(mesh); wordsGroup.add(mesh);
    }
    // Letters are located in open parts of the 3D world, never in a HUD.
    label('Para ' + config.name, new THREE.Vector3(0, 18, -17), 23, true);
    label('TE AMO', new THREE.Vector3(0, 12.5, -17), 15, true);
    const phrases = [config.dedication, ...config.phrases].filter(Boolean).slice(0, 13);
    phrases.forEach((text, index) => {
      const angle = index / phrases.length * Math.PI * 2 + 0.28;
      label(text, new THREE.Vector3(Math.cos(angle) * 40, 7 + (index % 2) * 4, Math.sin(angle) * 40), 16);
    });
  }
  let photoGeneration = 0;
  let photoResources: Array<THREE.Material | THREE.Texture | THREE.BufferGeometry> = [];
  let photoMeshes: THREE.Mesh[] = [];
  function clearPhotos() {
    photosGroup.clear(); photoMeshes = [];
    photoResources.forEach(resource => resource.dispose()); photoResources = [];
  }
  function setPhotos(photos: Photo[]) {
    const generation = ++photoGeneration; clearPhotos();
    photos.slice(0, 5).forEach((photo, index) => {
      const image = new Image(); image.crossOrigin = 'anonymous'; image.decoding = 'async';
      image.onload = () => {
        if (destroyed || generation !== photoGeneration) return;
        try {
          const preview = document.createElement('canvas');
          const ratio = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
          preview.width = Math.max(1, Math.round(image.naturalWidth * ratio)); preview.height = Math.max(1, Math.round(image.naturalHeight * ratio));
          preview.getContext('2d')!.drawImage(image, 0, 0, preview.width, preview.height);
          const texture = new THREE.CanvasTexture(preview); texture.colorSpace = THREE.SRGBColorSpace;
          const aspect = image.naturalWidth / image.naturalHeight;
          const width = 5 * Math.sqrt(aspect), height = 5 / Math.sqrt(aspect);
          const g = new THREE.PlaneGeometry(width, height);
          const m = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: false });
          const mesh = new THREE.Mesh(g, m); mesh.userData.index = index;
          mesh.position.fromArray(PHOTO_POSITIONS[index]);
          photoResources.push(texture, g, m); photoMeshes.push(mesh); photosGroup.add(mesh);
        } catch { onMediaError('No se pudo abrir la fotografía: ' + photo.name); }
      };
      image.onerror = () => { if (!destroyed && generation === photoGeneration) onMediaError('No se pudo cargar la fotografía: ' + photo.name); };
      image.src = photo.src;
    });
  }
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pointerStart = { x: 0, y: 0, time: 0 };
  const activePointers = new Set<number>();
  let multiTouch = false;
  let focused = false;
  let flight: { position: THREE.Vector3; target: THREE.Vector3 } | null = null;
  const stopFlight = () => { flight = null; };
  controls.addEventListener('start', stopFlight);
  function pointerDown(event: PointerEvent) {
    activePointers.add(event.pointerId);
    if (activePointers.size === 1) multiTouch = false; else multiTouch = true;
    pointerStart = { x: event.clientX, y: event.clientY, time: performance.now() };
  }
  function pointerUp(event: PointerEvent) {
    activePointers.delete(event.pointerId);
    if (multiTouch || activePointers.size || event.button > 0) return;
    if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 6 || performance.now() - pointerStart.time > 650) return;
    const bounds = canvas.getBoundingClientRect();
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(photoMeshes, false)[0];
    if (hit) onPhoto(hit.object.userData.index as number);
    else if (focused) { focused = false; go(overview.clone(), new THREE.Vector3()); }
  }
  function pointerCancel(event: PointerEvent) { activePointers.delete(event.pointerId); multiTouch = true; }
  canvas.addEventListener('pointerdown', pointerDown); canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerCancel);
  function contextLost(event: Event) { event.preventDefault(); cancelAnimationFrame(animationFrame); onContextLost(); }
  canvas.addEventListener('webglcontextlost', contextLost);
  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix();
    renderer.setSize(width, height, false); composer?.setSize(width, height);
  }
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
  let previousTime = performance.now(), elapsed = 0, slowFrames = 0;
  let lastRender = 0;
  function render(now: number) {
    if (destroyed) return;
    animationFrame = requestAnimationFrame(render);
    if (document.hidden) { previousTime = now; return; }
    if (!motion && !flight && now - lastRender < 32) return;
    const dt = Math.min((now - previousTime) / 1000, 0.05); previousTime = now; lastRender = now;
    if (motion) elapsed += dt;
    if (flight) {
      const smoothing = reducedQuery.matches ? 1 : 1 - Math.exp(-dt * 3.2);
      camera.position.lerp(flight.position, smoothing); controls.target.lerp(flight.target, smoothing);
      if (camera.position.distanceTo(flight.position) < 0.015) flight = null;
    }
    controls.update(dt);
    garden.rotation.y = Math.sin(elapsed * 0.035) * 0.08;
    garden.position.y = Math.sin(elapsed * 0.45) * 0.16;
    nodeMaterial.opacity = 0.7 + Math.sin(elapsed * 1.4) * 0.2;
    lineMaterial.opacity = 0.23 + Math.sin(elapsed * 0.7) * 0.07;
    const meteorProgress = (elapsed % 13) / 1.8;
    meteor.visible = motion && meteorProgress < 1;
    if (meteor.visible) { meteor.position.set(-35 + meteorProgress * 70, 26 - meteorProgress * 18, -25); meteorMaterial.opacity = Math.sin(meteorProgress * Math.PI) * 0.65; }
    photoMeshes.forEach(mesh => { mesh.quaternion.copy(camera.quaternion); });
    words.forEach(mesh => {
      mesh.quaternion.copy(camera.quaternion);
      // Keep the photographs unobstructed when approaching a memory.
      mesh.material.opacity = focused ? 0 : 1;
    });
    if (composer) composer.render(); else renderer.render(scene, camera);
    if (dt > 0.036 && motion) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 90) {
      renderer.setPixelRatio(1); bloom?.dispose(); composer?.dispose(); bloom = null; composer = null; resize(); slowFrames = 0;
    }
  }
  animationFrame = requestAnimationFrame(render);
  function go(position: THREE.Vector3, target: THREE.Vector3) { controls.autoRotate = false; flight = { position, target }; }
  function preferenceChange() { motion = !reducedQuery.matches; controls.autoRotate = motion; }
  reducedQuery.addEventListener('change', preferenceChange);
  return {
    setPhotos,
    setMessages,
    focus(index) {
      focused = true;
      const target = new THREE.Vector3().fromArray(PHOTO_POSITIONS[Math.max(0, Math.min(4, index))]);
      const mesh = photoMeshes.find(value => value.userData.index === index);
      const parameters = (mesh?.geometry as THREE.PlaneGeometry | undefined)?.parameters;
      const requiredHeight = Math.max(parameters?.height || 5, (parameters?.width || 5) / camera.aspect);
      const distance = Math.max(7, requiredHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.2);
      go(target.clone().add(new THREE.Vector3(0, 0, distance)), target);
    },
    reset() { focused = false; go(overview.clone(), new THREE.Vector3()); },
    zoom(direction) {
      const distance = camera.position.distanceTo(controls.target);
      const desired = THREE.MathUtils.clamp(distance * (direction > 0 ? 0.8 : 1.25), controls.minDistance, controls.maxDistance);
      go(camera.position.clone().sub(controls.target).normalize().multiplyScalar(desired).add(controls.target), controls.target.clone());
    },
    setMotion(enabled) { motion = enabled; controls.autoRotate = enabled; },
    dispose() {
      if (destroyed) return;
      destroyed = true; photoGeneration++; cancelAnimationFrame(animationFrame); observer.disconnect();
      reducedQuery.removeEventListener('change', preferenceChange);
      canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('webglcontextlost', contextLost);
      canvas.removeEventListener('pointercancel', pointerCancel);
      controls.removeEventListener('start', stopFlight); controls.dispose(); clearPhotos();
      wordResources.splice(0).forEach(resource => resource.dispose()); wordsGroup.clear();
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
      petals.dispose(); centers.dispose(); stems.dispose(); leaves.dispose(); bloom?.dispose(); composer?.dispose(); renderer.dispose();
    },
  };
}
