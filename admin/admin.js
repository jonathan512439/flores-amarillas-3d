const $ = selector => document.querySelector(selector);
const state = { config: null, selectedPhotos: [], selectedAudio: null, busy: false };
const setStatus = (message, error = false) => {
  $('#status').textContent = message;
  $('#status').setAttribute('data-error', String(error));
};
function renderPhrases() {
  const root = $('#phrases');
  root.replaceChildren();
  state.config.phrases.forEach((phrase, index) => {
    const row = document.createElement('div');
    row.className = 'phrase-row';
    const textarea = document.createElement('textarea');
    textarea.rows = 2; textarea.maxLength = 300; textarea.value = phrase;
    textarea.setAttribute('aria-label', `Frase ${index + 1}`);
    textarea.oninput = () => { state.config.phrases[index] = textarea.value; };
    const remove = document.createElement('button');
    remove.type = 'button'; remove.textContent = '×'; remove.title = 'Quitar frase';
    remove.onclick = () => { state.config.phrases.splice(index, 1); renderPhrases(); };
    row.append(textarea, remove); root.append(row);
  });
  $('#add-phrase').disabled = state.config.phrases.length >= 12;
}
function renderFiles() {
  const root = $('#existing');
  root.replaceChildren();
  const photos = state.selectedPhotos.length ? state.selectedPhotos.map(file => file.name) : state.config.photos.map(photo => photo.name || photo.src.slice(6));
  const audio = state.selectedAudio?.name || state.config.audio?.slice(6);
  [...photos, ...(audio ? ['♫ ' + audio] : [])].forEach(name => {
    const chip = document.createElement('span');
    chip.className = 'file-chip'; chip.textContent = name; root.append(chip);
  });
}
async function request(path, payload) {
  const response = await fetch(path, payload === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Galaxy-Admin': '1' }, body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok || result.ok === false) throw new Error(result.error || 'No se pudo completar la operación.');
  return result;
}
function fileData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, data: reader.result });
    reader.onerror = () => reject(new Error('No se pudo leer ' + file.name));
    reader.readAsDataURL(file);
  });
}
async function save(shouldPublish) {
  if (state.busy || !state.config || !$('#config-form').reportValidity()) return;
  state.busy = true;
  const controls = [...document.querySelectorAll('input, textarea, button')];
  controls.forEach(control => { control.disabled = true; });
  try {
    const config = { ...state.config, name: $('#name').value.trim(), dedication: $('#dedication').value.trim(), volume: Number($('#volume').value) };
    if (state.selectedPhotos.length) config.photos = state.selectedPhotos.map((file, index) => ({ fileName: file.name, name: `Recuerdo ${index + 1}` }));
    if (state.selectedAudio) config.audioFileName = state.selectedAudio.name;
    setStatus('Guardando archivos…');
    const files = await Promise.all([...state.selectedPhotos, ...(state.selectedAudio ? [state.selectedAudio] : [])].map(fileData));
    const result = await request('/api/save', { config, files });
    state.config = result.config;
    state.selectedPhotos = []; state.selectedAudio = null;
    $('#photos').value = ''; $('#audio').value = '';
    renderFiles(); renderPhrases();
    setStatus('Guardado en la carpeta public/media. Publica para actualizar el enlace compartido.');
    if (shouldPublish) {
      setStatus('Enviando cambios a GitHub…');
      setStatus((await request('/api/publish', {})).message);
    }
  } catch (error) { setStatus(error.message, true); }
  finally {
    state.busy = false; controls.forEach(control => { control.disabled = false; });
    $('#add-phrase').disabled = state.config.phrases.length >= 12;
  }
}
$('#photos').onchange = event => {
  const photos = Array.from(event.target.files || []);
  if (photos.length > 5 || photos.some(file => file.size > 20 * 1024 * 1024)) {
    event.target.value = ''; setStatus('Elige hasta cinco fotos de un máximo de 20 MB cada una.', true); return;
  }
  state.selectedPhotos = photos; renderFiles();
};
$('#audio').onchange = event => {
  const file = event.target.files?.[0];
  if (file?.size > 50 * 1024 * 1024) { event.target.value = ''; setStatus('La canción admite hasta 50 MB.', true); return; }
  state.selectedAudio = file || null; renderFiles();
};
$('#remove-photos').onclick = () => { state.config.photos = []; state.selectedPhotos = []; $('#photos').value = ''; renderFiles(); };
$('#remove-audio').onclick = () => { state.config.audio = ''; state.selectedAudio = null; $('#audio').value = ''; renderFiles(); };
$('#volume').oninput = event => { $('#volume-output').textContent = Math.round(Number(event.target.value) * 100) + '%'; };
$('#add-phrase').onclick = () => { state.config.phrases.push(''); renderPhrases(); [...document.querySelectorAll('#phrases textarea')].at(-1)?.focus(); };
$('#config-form').onsubmit = event => { event.preventDefault(); void save(false); };
$('#publish').onclick = () => { void save(true); };
document.querySelectorAll('input, textarea, button').forEach(control => { control.disabled = true; });
void request('/api/state').then(value => {
  state.config = value.config;
  $('#name').value = state.config.name;
  $('#dedication').value = state.config.dedication;
  $('#volume').value = state.config.volume ?? 0.6;
  $('#volume-output').textContent = Math.round(Number($('#volume').value) * 100) + '%';
  document.querySelectorAll('input, textarea, button').forEach(control => { control.disabled = false; });
  renderPhrases(); renderFiles();
}).catch(error => setStatus('No se pudo leer la configuración: ' + error.message, true));
