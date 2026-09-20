import { CONFIG } from './config.js';
import { initHero } from './hero.js';
import { initForm, setBusy } from './form.js';
import { buildXlsx } from './xlsx.js';
import { clientHtml, ownersSummary, sendDemande } from './mail.js';

document.getElementById('insta-link').href = CONFIG.INSTAGRAM_URL;
document.getElementById('foot-insta').href = CONFIG.INSTAGRAM_URL;
const fm = document.getElementById('foot-mail'); fm.href = `mailto:${CONFIG.CONTACT_EMAIL}`; fm.textContent = CONFIG.CONTACT_EMAIL;

const templatePromise = fetch(CONFIG.XLSX_TEMPLATE).then((r) => r.arrayBuffer());
const eur = (n) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

function showResult(html, hideForm) {
  const box = document.getElementById('devis-result');
  box.innerHTML = html; box.hidden = false;
  if (hideForm) document.getElementById('devis-form').hidden = true;
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function downloadLink(blob, name) {
  const url = URL.createObjectURL(blob);
  return `<a class="btn-ghost" download="${name}" href="${url}">Télécharger le devis (.xlsx)</a>`;
}

initHero({ zones: CONFIG.ZONES });

initForm({
  async onSubmit(state, devis, photos) {
    setBusy(true);
    try {
      const xlsxBuf = await buildXlsx(window.ExcelJS, await templatePromise, state, devis);
      const xlsxBlob = new Blob([xlsxBuf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const html = clientHtml(devis, state, CONFIG);
      const summary = ownersSummary(devis, state);
      const res = await sendDemande(CONFIG, { state, devis, xlsxBlob, photos, clientHtml: html, ownersSummary: summary });
      if (res.ok) {
        showResult(`<h2>Merci !</h2><p>Votre devis <strong>${devis.numero}</strong> a été envoyé à <strong>${state.client.email}</strong>.</p>
          ${devis.horsLimites ? '<p>Format hors standard : nous revenons vers vous sous 48 h.</p>' : `<p>Montant estimé : <strong>${eur(devis.totalTTC)} TTC</strong></p>`}
          <p>${downloadLink(xlsxBlob, `${devis.numero}.xlsx`)}</p>`, true);
      } else {
        showResult(`<p class="error">Erreur d'envoi (${res.error}). Écrivez-nous à <a href="mailto:${CONFIG.CONTACT_EMAIL}">${CONFIG.CONTACT_EMAIL}</a> — vos données sont conservées ci-dessus.</p>
          <p>${downloadLink(xlsxBlob, `${devis.numero}.xlsx`)}</p>`, false);
      }
    } finally {
      setBusy(false);
    }
  },
});
