// Чистая логика Calcul_Devis.xlsx. Без DOM. Работает в Node и браузере.
import { PRICES } from './prices.js';

export const HORS_LIMITES = 'Hors limites';

// Feuille 1, колонки F/G: сколько плит 122×250 на qt панелей a×b
export function plaques(a, b, qt) {
  const mn = Math.min(a, b), mx = Math.max(a, b);
  if (mn <= 61 && mx <= 250) return 0.5 * qt;
  if (mn <= 122 && mx <= 125) return 0.5 * qt;
  if (mn > 61 && mn <= 122 && mx > 125 && mx <= 250) return 1 * qt;
  if (mn > 122 && mn <= 244 && mx <= 250) return 2 * qt;
  return HORS_LIMITES;
}

// Feuille 1, колонка H: сколько досок 300 см на qt отрезков длины len
export function planches300(len, qt) {
  if (len <= 0) return HORS_LIMITES;
  if (len <= 75) return Math.ceil(qt / 4);
  if (len <= 100) return Math.ceil(qt / 3);
  if (len <= 150) return Math.ceil(qt / 2);
  if (len <= 300) return Math.ceil(qt / 1);
  return HORS_LIMITES;
}

// Feuille 1 целиком для одного объекта. L = côté le plus long, l = côté court, H = hauteur (cm, intérieur)
export function calcObjet({ L, l, H }, P = PRICES) {
  const { CP_INT, PLANCHE_EP, PLANCHE_L, CP_EXT, BOULONS } = P;
  const D13 = l + 2 * (2 * PLANCHE_EP + CP_INT);   // largeur des côtés gauche/droite
  const C17 = L + 2 * (PLANCHE_EP + CP_INT);       // longueur haut/bas
  const lignes = [
    { qt: 2, nom: 'Contreplaqué Avant/Arrière',   dims: [L, H],          type: 'cp5' },
    { qt: 4, nom: 'Planche verticale courte',     len: H - 2 * PLANCHE_L, type: 'planches' },
    { qt: 2, nom: 'Planche verticale milieu',     len: H - 2 * PLANCHE_L, type: 'planches' },
    { qt: 2, nom: 'Planche horizontale milieu',   len: L,                type: 'planches' },
    { qt: 4, nom: 'Planche horizontale longue',   len: L,                type: 'planches' },
    { qt: 2, nom: 'Contreplaqué Gauche/Droite',   dims: [D13, H],        type: 'cp5' },
    { qt: 4, nom: 'Planche verticale courte',     len: H - 2 * PLANCHE_L, type: 'planches' },
    { qt: 2, nom: 'Planche horizontale milieu',   len: D13 - 2 * PLANCHE_L, type: 'planches' },
    { qt: 4, nom: 'Planche horizontale longue',   len: D13,              type: 'planches' },
    { qt: 2, nom: 'Contreplaqué Haut/Bas',        dims: [C17, D13],      type: 'cp15' },
    { qt: 4, nom: 'Planche passage transpalette', len: D13,              type: 'planches' },
  ];
  const tot = { cp5: 0, cp15: 0, planches: 0 };
  let horsLimites = false;
  for (const x of lignes) {
    x.res = x.dims ? plaques(x.dims[0], x.dims[1], x.qt) : planches300(x.len, x.qt);
    if (x.res === HORS_LIMITES) horsLimites = true;   // SUM в Excel игнорирует текст
    else tot[x.type] += x.res;
  }
  return {
    ...tot,
    boulons: BOULONS,
    ext: { L: C17, l: D13, H: H + 2 * CP_EXT },
    horsLimites,
    lignes,
  };
}

// Номер devis: DEV-YYYY-MM-NNNNNNN, NNNNNNN = секунды с начала месяца (уникально, растёт; ≤ 2 678 400)
export function devisNumero(now = new Date()) {
  const y = now.getFullYear(), m = now.getMonth();
  const start = new Date(y, m, 1);
  const seconds = Math.floor((now - start) / 1000);
  return `DEV-${y}-${String(m + 1).padStart(2, '0')}-${String(seconds).padStart(7, '0')}`;
}

// Feuille 2: devis по всем объектам
export function calcDevis(state, P = PRICES, now = new Date()) {
  const coef = state.delai === '2 jours' ? P.COEF_EXPRESS : 1;
  const objets = state.objets.map((o) => {
    const raskroi = calcObjet(o, P);
    const lignes = P.MATERIAUX.map((m) => {
      const qt = raskroi[m.key];
      return {
        ...m,
        qt,
        matTTC: qt * m.prixHT * (1 + P.TVA),
        moTTC: qt * m.moHT * (1 + P.TVA) * coef,
      };
    });
    const sousTotal = lignes.reduce((s, x) => s + x.matTTC + x.moTTC, 0);
    return { ...o, raskroi, lignes, sousTotal, horsLimites: raskroi.horsLimites };
  });
  const options = (state.options || []).map((key) => ({ key, ...P.OPTIONS[key] }));
  const optionsTTC = options.reduce((s, o) => s + o.prixTTC, 0);
  const totalTTC = objets.reduce((s, o) => s + o.sousTotal, 0) + optionsTTC;
  const dateValidite = new Date(now);
  dateValidite.setDate(dateValidite.getDate() + P.DEVIS_VALIDITE_JOURS);
  return {
    numero: devisNumero(now),
    dateEmission: now,
    dateValidite,
    coef,
    objets,
    options,
    optionsTTC,
    totalTTC,
    horsLimites: objets.some((o) => o.horsLimites),
  };
}
