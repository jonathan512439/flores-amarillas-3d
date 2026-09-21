# Flores amarillas · Tu constelación

Una experiencia de regalo para el 21 de septiembre: flores amarillas tridimensionales, polvo estelar en espiral, constelaciones, meteoros, de una a cinco fotografías y música personal.

La URL pública es deliberadamente una escena inmersiva: no tiene paneles, botones, tarjetas ni instrucciones sobre la galaxia. El título, la dedicatoria, «TE AMO» y las frases se renderizan como parte de la profundidad 3D; las fotografías se navegan tocando sus constelaciones. El editor vive aparte y no se envía al artefacto público.

## Estado de esta entrega

El motor Three.js y el panel independiente están implementados. Se aprobaron la comprobación de tipos, cuatro pruebas de configuración, cuatro pruebas de guardado/publicación del panel, la validación de archivos y la compilación de producción. Las pruebas del panel usan carpetas y repositorios temporales, sin modificar tus recuerdos. Los archivos estáticos se generan en `dist/client`. El estado de cada publicación se consulta en la pestaña **Actions** de GitHub.

No se pudo visualizar el enlace de referencia con las herramientas disponibles. El diseño es una interpretación propia de la descripción, no una réplica visual comprobada. El nombre está configurado como **Cindel**. Las fotos y la canción están pendientes de que el propietario las coloque; la escena inicial funciona sin ellas.

## Panel privado y guardado permanente

Elige una carpeta local del proyecto, abre PowerShell y ejecuta:

```powershell
npm ci
npm run admin
```

Abre `http://localhost:4174`. Ese panel es la única parte con campos y controles. Carga entre 1 y 5 fotos, una canción, el nombre, la dedicatoria y hasta 12 frases. **Guardar archivos** escribe en tu carpeta local `public/media` y actualiza `public/media/manifest.json`; **Guardar y publicar** además hace `git add`, `git commit` y `git push` a `origin/main`. Necesitas Git autenticado con permiso de escritura en el repositorio. El flujo de GitHub Pages recompila y publica automáticamente; espera a que termine en **Actions** antes de compartir el enlace.

El servidor del panel escucha únicamente en `127.0.0.1`, no está incluido en `dist/client` y no debe exponerse a Internet. Los archivos permanecen en el repositorio desde el momento en que el commit termina. No subas fotos o audio privados a un repositorio público.

Al volver a abrir el panel se leen los archivos ya guardados. Si solo cambias frases o volumen, conserva las fotos y el audio existentes. Elegir fotos nuevas reemplaza el conjunto actual. Los archivos reciben nombres con una huella de su contenido para evitar colisiones y cachés antiguas; se conservan los archivos anteriores. Quitar una foto o canción de la escena no borra el archivo ni el historial de Git. El panel admite hasta 20 MB por foto y 50 MB por canción; usa archivos más pequeños para una carga rápida en móvil.

El enlace publicado de este proyecto es **https://jonathan512439.github.io/flores-amarillas-3d/**. La destinataria solo abre ese enlace: no instala nada, no configura archivos y no tiene acceso al panel. Este panel se utiliza desde tu ordenador; GitHub Pages por sí solo no puede recibir subidas ni escribir en Git.

La reproducción con sonido intenta empezar al entrar mediante `autoplay`. Los navegadores pueden bloquear audio audible sin un gesto del visitante; en ese caso, el primer toque o clic sobre la galaxia reintenta el audio. No aparece un botón ni un aviso encima de la escena.

## Ejecutar en tu ordenador

Requiere Node.js 22.13 o posterior y npm. Abre PowerShell en esta carpeta:

```powershell
npm ci
npm run test:config
npm run test:admin
npm run check:media
npm run typecheck
npm run build
npm run preview
```

Abre `http://localhost:4173`. Para editar con recarga automática, usa `npm run dev` y abre la URL que muestre la terminal. La aplicación se sirve por HTTP; no abras directamente el HTML con doble clic.

El código propio se revisa con `npx oxlint app lib`. El starter contiene componentes no utilizados que ya reportaban incidencias: `npm run lint` revisa también esos componentes y no está aprobado globalmente.

## Añadir el nombre, las fotografías y el audio manualmente

1. Copia entre 1 y 5 imágenes en `public/media`. Usa nombres simples, por ejemplo `foto-1.jpg`, `foto-2.jpg`. Para carga rápida, reduce las fotos a unos 1600 px y aproximadamente 300 KB–1 MB cada una.
2. Copia una canción en la misma carpeta, por ejemplo `cancion.mp3`. MP3 es la opción sencilla; M4A con AAC, OGG, WAV, FLAC y otros formatos dependen del códec compatible con el navegador. Se intenta reproducir automáticamente; si el navegador lo bloquea, comienza al tocar o hacer clic en la galaxia.
3. Edita `public/media/manifest.json`, conservando JSON válido (comillas dobles, sin comas finales). Ejemplo completo:

```json
{
  "name": "Cindel",
  "dedication": "Desde que llegaste, todos mis días tienen un poco más de luz.",
  "photos": [
    { "src": "media/foto-1.jpg", "name": "El día que todo comenzó" },
    { "src": "media/foto-2.jpg", "name": "Mi lugar favorito eres tú" }
  ],
  "audio": "media/cancion.mp3",
  "volume": 0.6,
  "phrases": [
    "Te elegiría en todas las constelaciones posibles.",
    "Estas flores son mi manera de decirte que te quiero.",
    "Qué suerte coincidir contigo en este universo."
  ]
}
```

4. Para una sola foto deja un objeto en `photos`; para cinco, añade tres más. No se esconden fotos en móvil. También puedes usar `photos: []` y `audio: ""` mientras preparas el regalo.
5. Ejecuta `npm run check:media` y reconstruye con `npm run build` después de cualquier cambio.

El panel local es el flujo recomendado porque guarda y publica los archivos. También puedes copiar los archivos y editar `manifest.json` a mano si lo prefieres.

## Navegar

- Escritorio: arrastra para orbitar; rueda para acercar/alejar; botón derecho y arrastre para desplazar el encuadre.
- Móvil: un dedo para orbitar; dos dedos para acercar/alejar y desplazar.
- Toca una fotografía en la galaxia para enfocar su constelación. Escape o un toque en el espacio vacío devuelve la vista completa.
- Teclado: flechas recorren fotografías, `+` y `-` acercan/alejan, `Home` vuelve al conjunto, `Espacio` pausa el movimiento y `M` silencia.
- Si WebGL no está disponible, aparece una versión de partículas 2D sin paneles que mantiene el nombre, «TE AMO», fotos y movimiento.

## Publicar gratis en GitHub Pages

Para usar GitHub Pages con GitHub Free, crea un repositorio **público**. Los archivos de ese repositorio y las fotos/música publicadas serán públicos; usa únicamente material que quieras compartir así.

1. En GitHub crea un repositorio vacío llamado, por ejemplo, `flores-amarillas`. No añadas README remoto si vas a seguir los comandos siguientes.
2. Desde esta carpeta ejecuta (sustituye `TU_USUARIO`):

```powershell
git init
git branch -M main
git add .
git commit -m "Crear constelacion de flores amarillas"
git remote add origin https://github.com/TU_USUARIO/flores-amarillas.git
git push -u origin main
```

Si ya existe un repositorio Git, omite `git init`. Si ya existe `origin`, consulta `git remote -v` y conserva tu remoto correcto en lugar de añadir otro. Autentícate con GitHub cuando Git lo solicite.

3. En el repositorio abre **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. Ve a **Actions → Publicar galaxia en GitHub Pages → Run workflow → main → Run workflow**. El archivo `.github/workflows/pages.yml` ya prepara la compilación y la publicación.
5. Espera a que `build` y `deploy` estén en verde. Abre el enlace que aparece en el entorno `github-pages` o en **Settings → Pages**. Habitualmente será `https://TU_USUARIO.github.io/flores-amarillas/`.
6. Abre ese enlace en móvil y ordenador. Prueba el primer y último recuerdo, la música, zoom y vista inicial. Esta prueba en dispositivos reales está pendiente en esta entrega.

La acción configura automáticamente el prefijo de recursos del repositorio mediante `PAGES_BASE_PATH`. `scripts/prepare-pages.mjs` adapta la ubicación física de `_next` para GitHub Pages y verifica que el HTML y sus recursos existan antes de publicarlos. Para actualizar el regalo, cambia los archivos locales y ejecuta:

```powershell
git add .
git commit -m "Actualizar recuerdos y dedicatoria"
git push
```

Cada cambio en `main` inicia una nueva publicación. Nunca subas `node_modules` ni uses la antigua carpeta `dist` sin volver a compilar. El `.gitignore` excluye ambos.

Guía oficial: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## Otros alojamientos estáticos

Después de `npm run build`, el contenido público está en `dist/client`. Puedes cargar **el contenido de esa carpeta** en un alojamiento estático HTTPS. Para publicar en la raíz de un dominio, deja `PAGES_BASE_PATH` sin configurar. No se necesita base de datos ni servidor de aplicación.

## Arquitectura y rendimiento

- React/Vinext para interfaz y exportación estática; Three.js para geometría 3D real.
- Pétalos, centros, tallos y hojas se agrupan por instancias para reducir llamadas a la GPU.
- Móviles: menos flores y partículas, resolución limitada y sin posprocesado bloom. Escritorio: bloom suave y reducción automática de resolución si cae el rendimiento.
- Se detiene el trabajo de renderizado cuando la pestaña está oculta. Las texturas de fotos se reducen a un máximo de 1600 px en memoria.
- Las fotos no usan servicios de terceros. Los recursos seleccionados se liberan al desmontar la experiencia.

Documentación de las técnicas: https://threejs.org/docs/pages/InstancedMesh.html y https://threejs.org/docs/pages/OrbitControls.html

## Comprobaciones pendientes y problemas conocidos

- No hay mediciones reales de FPS ni verificación visual en navegador en este entorno. La validación de tipos, pruebas y compilación no sustituye la comprobación visual en tus dispositivos.
- `npm audit` informa 11 avisos en el árbol del starter (8 altos, 2 moderados, 1 bajo), asociados a herramientas de desarrollo/compilación y componentes de servidor: Vite, Wrangler/Miniflare, parsers de imágenes y funciones RSC. Esta entrega publica archivos estáticos y no expone esos servidores o procesadores de imágenes. Los avisos siguen pendientes de una actualización compatible del starter; evita exponer `npm run dev` a Internet y no apliques `npm audit fix --force` sin revisión.
- El registro previo de Sites dejó de estar accesible desde la cuenta conectada. GitHub Pages funciona de manera independiente; conserva `.openai/hosting.json` si más adelante vas a recuperar ese registro.
- Si faltan imágenes, verifica mayúsculas y minúsculas: GitHub Pages distingue `Foto.jpg` de `foto.jpg` aunque Windows no lo haga.
- Si el audio falla, prueba MP3; cambiar la extensión de un archivo no convierte el códec.
