import { PRICES } from './prices.js';
import { calcDevis } from './calc.js';

const fmt = (n) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

let form, objetsEl, tpl, estimateEl, onSubmitCb;

function addObjet() {
  const node = tpl.content.firstElementChild.cloneNode(true);
  objetsEl.appendChild(node);
  renumber();
  if (objetsEl.children.length > 1) node.querySelector('input[name=nature]').focus();
}
function renumber() {
  objetsEl.querySelectorAll('.objet').forEach((o, i) => { o.querySelector('.num').textContent = i + 1; });
}
function renderOptions() {
  const box = document.getElementById('options');
  box.innerHTML = Object.entries(PRICES.OPTIONS).map(([key, o]) => `
    <label class="option">
      <input type="checkbox" name="options" value="${key}"> ${o.label}
      <span class="price">${o.prixTTC}€ TTC</span>
      <i class="info" tabindex="0" data-tip="${o.description.replace(/"/g, '&quot;')}">i</i>
    </label>`).join('');
}

export function readState() {
  const objets = [...objetsEl.querySelectorAll('.objet')].map((o) => ({
    nature: o.querySelector('[name=nature]').value.trim(),
    L: parseFloat(o.querySelector('[name=L]').value),
    l: parseFloat(o.querySelector('[name=l]').value),
    H: parseFloat(o.querySelector('[name=H]').value),
    poids: parseFloat(o.querySelector('[name=poids]').value),
  }));
  const fd = new FormData(form);
  return {
    objets,
    options: fd.getAll('options'),
    delai: fd.get('delai') || '2 à 4 jours',
    client: { nom: fd.get('nom').trim(), adresse: fd.get('adresse').trim(), email: fd.get('email').trim(), siret: (fd.get('siret') || '').trim() },
    honeypot: fd.get('website') || '',
  };
}

function updateEstimate() {
  const s = readState();
  const ready = s.objets.length && s.objets.every((o) => o.L > 0 && o.l > 0 && o.H > 0);
  if (!ready) { estimateEl.textContent = ''; estimateEl.classList.remove('hors'); return; }
  const d = calcDevis(s);
  if (d.horsLimites) {
    estimateEl.classList.add('hors');
    estimateEl.innerHTML = '<span>Format hors standard</span><span>devis personnalisé sous 48h</span>';
  } else {
    estimateEl.classList.remove('hors');
    estimateEl.innerHTML = `<span>Estimation</span><strong>${fmt(d.totalTTC)} TTC</strong>`;
  }
}

// Сжатие фото: ≤1200px по длинной стороне, JPEG 0.8
async function compressImage(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * k); canvas.height = Math.round(bmp.height * k);
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.8));
}
async function collectPhotos() {
  const out = [];
  const blocks = [...objetsEl.querySelectorAll('.objet')];
  for (let i = 0; i < blocks.length; i++) {
    const f = blocks[i].querySelector('[name=photo]').files[0];
    if (!f) continue;
    try { out.push({ name: `objet-${i + 1}.jpg`, blob: await compressImage(f) }); }
    catch { out.push({ name: `objet-${i + 1}-non-transmise.txt`, blob: new Blob(['photo non transmise (format non supporté)'], { type: 'text/plain' }) }); }
  }
  return out;
}

function validate() {
  let ok = true;
  form.querySelectorAll('input[required]').forEach((i) => { i.classList.add('touched'); if (!i.checkValidity()) ok = false; });
  if (!ok) form.querySelector('input.touched:invalid')?.focus();
  return ok;
}

export function setBusy(b) {
  const btn = document.getElementById('submit');
  btn.disabled = b;
  btn.textContent = b ? 'Envoi en cours…' : 'Recevoir mon devis';
}

export function initForm({ onSubmit }) {
  onSubmitCb = onSubmit;
  form = document.getElementById('devis-form');
  objetsEl = document.getElementById('objets');
  tpl = document.getElementById('objet-template');
  estimateEl = document.getElementById('estimate');
  renderOptions();
  addObjet();
  document.getElementById('add-objet').addEventListener('click', addObjet);
  objetsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.remove');
    if (btn) { btn.closest('.objet').remove(); renumber(); updateEstimate(); }
  });
  form.addEventListener('change', (e) => {
    if (e.target.name === 'photo') {
      const f = e.target.files[0];
      e.target.closest('.file').querySelector('.file-name').textContent = f ? f.name : 'Aucune photo';
    }
  });
  form.addEventListener('input', updateEstimate);
  form.addEventListener('change', updateEstimate);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const state = readState();
    const devis = calcDevis(state);
    const photos = await collectPhotos();
    onSubmitCb(state, devis, photos);
  });
}
