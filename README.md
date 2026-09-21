# Flores amarillas · Tu constelación

Una experiencia de regalo para el 21 de septiembre: flores amarillas tridimensionales, polvo estelar en espiral, constelaciones, meteoros, de una a cinco fotografías y música personal.

## Estado de esta entrega

El motor Three.js y su interfaz están implementados. Se aprobaron la comprobación de tipos, las cuatro pruebas de configuración, la validación de archivos y la compilación de producción de la versión 3D. Los archivos estáticos se generan en `dist/client`. El estado de cada publicación se consulta en la pestaña **Actions** de GitHub.

No se pudo visualizar el enlace de referencia con las herramientas disponibles. El diseño es una interpretación propia de la descripción, no una réplica visual comprobada. Las fotos, canción y nombre definitivos están pendientes de que el propietario los coloque; la escena inicial funciona sin ellos.

## Ejecutar en tu ordenador

Requiere Node.js 22.13 o posterior y npm. Abre PowerShell en esta carpeta:

```powershell
npm ci
npm run test:config
npm run check:media
npm run typecheck
npm run build
npm run preview
```

Abre `http://localhost:4173`. Para editar con recarga automática, usa `npm run dev` y abre la URL que muestre la terminal. La aplicación se sirve por HTTP; no abras directamente el HTML con doble clic.

El código propio se revisa con `npx oxlint app lib`. El starter contiene componentes no utilizados que ya reportaban incidencias: `npm run lint` revisa también esos componentes y no está aprobado globalmente.

## Añadir el nombre, las fotografías y el audio

1. Copia entre 1 y 5 imágenes en `public/media`. Usa nombres simples, por ejemplo `foto-1.jpg`, `foto-2.jpg`. Para carga rápida, reduce las fotos a unos 1600 px y aproximadamente 300 KB–1 MB cada una.
2. Copia una canción en la misma carpeta, por ejemplo `cancion.mp3`. MP3 es la opción sencilla; M4A con AAC, OGG, WAV, FLAC y otros formatos dependen del códec compatible con el navegador. El audio empieza solamente después de tocar **Música**.
3. Edita `public/media/manifest.json`, conservando JSON válido (comillas dobles, sin comas finales). Ejemplo completo:

```json
{
  "name": "Valentina",
  "dedication": "Desde que llegaste, todos mis días tienen un poco más de luz.",
  "photos": [
    { "src": "media/foto-1.jpg", "name": "El día que todo comenzó" },
    { "src": "media/foto-2.jpg", "name": "Mi lugar favorito eres tú" }
  ],
  "audio": "media/cancion.mp3",
  "phrases": [
    "Te elegiría en todas las constelaciones posibles.",
    "Estas flores son mi manera de decirte que te quiero.",
    "Qué suerte coincidir contigo en este universo."
  ]
}
```

4. Para una sola foto deja un objeto en `photos`; para cinco, añade tres más. No se esconden fotos en móvil. También puedes usar `photos: []` y `audio: ""` mientras preparas el regalo.
5. Ejecuta `npm run check:media` y reconstruye con `npm run build` después de cualquier cambio.

**Alternativa visual:** abre el botón de ajustes en la web, edita el nombre y las frases, selecciona las fotos y el audio, y pulsa **Descargar configuración**. Copia el `manifest.json` descargado y los originales elegidos a `public/media`. El selector solo genera una vista previa en esa pestaña: no sube los archivos, no modifica el sitio publicado y no los conserva al recargar. Para que ella vea los cambios, vuelve a publicar.

## Navegar

- Escritorio: arrastrar para orbitar; rueda para acercar/alejar; botón derecho y arrastre para desplazar el encuadre.
- Móvil: un dedo para orbitar; dos dedos para acercar/alejar y desplazar.
- Toca una fotografía en la galaxia o su miniatura para verla completa y desplazarte a esa constelación. Las flechas recorren todos los recuerdos.
- El botón de casa recupera la vista completa. `+`, `-` y `Home` funcionan al enfocar el lienzo con el teclado.
- Pausa el movimiento ambiental con su botón. Se respeta la preferencia del sistema de reducir movimiento. La música se pausa por separado.
- Si WebGL no está disponible, siguen accesibles las fotos, frases, ajustes y música.

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

La acción configura automáticamente la subruta del repositorio mediante `PAGES_BASE_PATH`. Para actualizar el regalo, cambia los archivos locales y ejecuta:

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
