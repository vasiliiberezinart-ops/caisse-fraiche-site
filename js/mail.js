// Письмо клиенту (HTML), сводка владельцам (текст), отправка в Worker.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = (n) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const dateFR = (d) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dims = (o) => `${o.L} × ${o.l} × ${o.H}`;

export function clientHtml(devis, state, cfg) {
  const c = state.client || {};
  const objets = devis.objets.map((o, i) => `
    <tr><td>${i + 1}</td><td>${esc(o.nature)}<br><small>int. ${dims(o)} cm · ${esc(o.poids)} kg</small></td>
        <td>ext. ${o.raskroi.ext.L} × ${o.raskroi.ext.l} × ${o.raskroi.ext.H} cm</td>
        <td align="right">${o.horsLimites ? 'hors standard' : eur(o.sousTotal)}</td></tr>`).join('');
  const options = devis.options.map((o) => `<tr><td></td><td colspan="2">Option — ${esc(o.label)}</td><td align="right">${eur(o.prixTTC)}</td></tr>`).join('');
  const total = devis.horsLimites
    ? `<p style="padding:12px;border:1px solid #c80;color:#8a4b00"><strong>Format hors standard.</strong> Nous revenons vers vous sous 48 h avec un devis personnalisé.</p>`
    : `<table width="100%" style="margin-top:12px"><tr><td align="right"><strong>TOTAL TTC</strong></td><td align="right" width="140"><strong style="font-size:18px">${eur(devis.totalTTC)}</strong></td></tr></table>`;
  return `<!DOCTYPE html><html lang="fr"><body style="font-family:Helvetica,Arial,sans-serif;color:#1d1b18;max-width:640px;margin:0 auto;padding:24px">
  <h1 style="font-weight:500;letter-spacing:-.02em;margin:0">CAISSE FRAÎCHE <span style="font-weight:300">by LIRAA</span></h1>
  <p style="color:#6f6a62;margin:4px 0 20px">${esc(cfg.ADRESSE)}</p>
  <table width="100%" style="font-size:14px"><tr>
    <td><strong>Devis n° ${esc(devis.numero)}</strong><br>Émis le ${dateFR(devis.dateEmission)}<br>Valable jusqu'au ${dateFR(devis.dateValidite)}</td>
    <td align="right">${esc(c.nom)}<br>${esc(c.adresse)}<br>${esc(c.email)}${c.siret ? `<br>SIRET ${esc(c.siret)}` : ''}</td>
  </tr></table>
  <table width="100%" cellpadding="8" style="border-collapse:collapse;margin-top:20px;font-size:14px">
    <thead><tr style="border-bottom:1px solid #a39d93;text-align:left"><th>#</th><th>Objet</th><th>Caisse</th><th align="right">TTC</th></tr></thead>
    <tbody>${objets}${options}</tbody>
  </table>
  <p style="font-size:13px;color:#6f6a62">Délai : ${esc(state.delai)}${devis.coef > 1 ? " (express, main d'œuvre +20 %)" : ''}</p>
  ${total}
  <h3 style="font-weight:500;margin-top:28px">Conditions</h3>
  <ul style="font-size:13px;color:#444;line-height:1.5">
    <li>Devis valable 30 jours à compter de la date d'émission.</li>
    <li>TVA au taux de 20 % incluse dans les montants TTC indiqués.</li>
    <li>Conditions de paiement : un acompte de 30 % du montant TTC à la commande vaut acceptation du devis. Solde à la livraison.</li>
    <li>Le versement de l'acompte, associé à la signature du présent devis, vaut bon de commande.</li>
    <li>Les options sélectionnées sont incluses dans le total TTC.</li>
  </ul>
  <p style="font-size:13px;color:#6f6a62">Coordonnées bancaires : communiquées à la confirmation. — Bon pour accord (signature client) : ______________</p>
  <p style="font-size:12px;color:#6f6a62;margin-top:28px">Caisse Fraîche by LIRAA · ${esc(cfg.ADRESSE)} · ${esc(cfg.CONTACT_EMAIL)}</p>
</body></html>`;
}

export function ownersSummary(devis, state) {
  const lines = [`Demande ${devis.numero} — ${state.client?.nom} — ${state.client?.email}`, `Délai : ${state.delai} (coef ${devis.coef})`, ''];
  devis.objets.forEach((o, i) => {
    const r = o.raskroi;
    lines.push(`Objet ${i + 1} — ${o.nature} — ${o.poids} kg — int. ${dims(o)} cm → ext. ${r.ext.L} × ${r.ext.l} × ${r.ext.H} cm${o.horsLimites ? '  ⚠ HORS LIMITES' : ''}`);
    lines.push(`  CP 5mm: ${r.cp5} · CP 15mm: ${r.cp15} · Planches: ${r.planches} · Boulons: ${r.boulons} · sous-total ${o.sousTotal.toFixed(2)} €`);
  });
  lines.push('', `Options : ${devis.options.map((o) => o.label).join(', ') || '—'} (${devis.optionsTTC} €)`);
  lines.push(`TOTAL TTC : ${devis.horsLimites ? 'à établir (hors limites)' : devis.totalTTC.toFixed(2) + ' €'}`);
  return lines.join('\n');
}

const toB64 = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });

export async function sendDemande(cfg, { state, devis, xlsxBlob, photos, clientHtml: html, ownersSummary: summary }) {
  const payload = {
    honeypot: state.honeypot || '',
    numero: devis.numero, client: state.client, totalTTC: devis.totalTTC, horsLimites: devis.horsLimites,
    clientHtml: html, ownersSummary: summary,
    xlsxName: `${devis.numero}.xlsx`, xlsxB64: await toB64(xlsxBlob),
    photos: await Promise.all(photos.map(async (p) => ({ name: p.name, b64: await toB64(p.blob) }))),
  };
  try {
    const r = await fetch(cfg.WORKER_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const j = await r.json().catch(() => ({}));
    return r.ok && j.ok ? { ok: true } : { ok: false, error: j.error || `HTTP ${r.status}` };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}
