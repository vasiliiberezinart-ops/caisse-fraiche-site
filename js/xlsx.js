// Заполняет Calcul_Devis.xlsx заказчика. Формулы шаблона не трогаем — пишем только значения.
// Объекты 3+: копия листа "Feuille 1 - Objet 2" + блок в Feuille 2 ниже строки 65 + правка формулы TOTAL.
// ExcelJS передаётся снаружи: в браузере — глобал с CDN, в Node — import.

const OUI = (b) => (b ? 'Oui' : 'Non');
const OPTION_ROWS = { photogrammetrie: 25, livraison: 26, mise_en_caisse: 27, monte_charge: 28, transport: 29 };
const EXTRA_START_ROW = 67;   // первый свободный ряд после подписи (B64)
const OBJET_BLOCK_ROWS = 14;  // высота блока одного доп. объекта

function copySheet(wb, srcName, dstName) {
  const src = wb.getWorksheet(srcName);
  const dst = wb.addWorksheet(dstName);
  src.columns.forEach((c, i) => { dst.getColumn(i + 1).width = c.width; });
  src.eachRow({ includeEmpty: true }, (row, r) => {
    row.eachCell({ includeEmpty: true }, (cell, c) => {
      const t = dst.getCell(r, c);
      t.value = cell.value;
      t.style = cell.style;
    });
  });
  return dst;
}

// Блок DÉTAIL для доп. объекта n (n ≥ 3) в Feuille 2, начиная со строки start. Возвращает адреса sous-total {G,H}.
function writeExtraObjetBlock(f2, start, n, objet, sheetName) {
  const q = (a) => `'${sheetName}'!${a}`;
  // Оформление — копия строк объекта 2 (10–12) и его DÉTAIL (40–46)
  const copyRowStyle = (srcRow, dstRow) => {
    for (let c = 1; c <= 9; c++) f2.getCell(dstRow, c).style = f2.getCell(srcRow, c).style;
    f2.getRow(dstRow).height = f2.getRow(srcRow).height;
  };
  [10, 11, 12].forEach((r, i) => copyRowStyle(r, start + i));
  [40, 41, 42, 43, 44, 45, 46].forEach((r, i) => copyRowStyle(r, start + 4 + i));
  f2.getCell(`B${start}`).value = `OBJET DU DEVIS — OBJET ${n}`;
  f2.getCell(`B${start + 1}`).value = "Nature de l'objet"; f2.getCell(`C${start + 1}`).value = objet.nature;
  f2.getCell(`D${start + 1}`).value = 'Poids (kg)';        f2.getCell(`E${start + 1}`).value = objet.poids;
  f2.getCell(`B${start + 2}`).value = 'Longueur (cm)';     f2.getCell(`C${start + 2}`).value = objet.L;
  f2.getCell(`D${start + 2}`).value = 'Largeur (cm)';      f2.getCell(`E${start + 2}`).value = objet.l;
  f2.getCell(`F${start + 2}`).value = 'Hauteur (cm)';      f2.getCell(`G${start + 2}`).value = objet.H;
  const h = start + 4;
  f2.getCell(`B${h}`).value = `DÉTAIL DU DEVIS — OBJET ${n}`;
  const hdr = ['Qt', 'Matériaux', 'Prix matériau unité HT', "Main d'oeuvre/unité HT", "Main d'oeuvre total HT", 'Prix matériau TTC (unité)', 'Prix total matériaux TTC', "Main d'oeuvre total TTC", "Coeff. main d'oeuvre (délai)"];
  hdr.forEach((t, i) => { f2.getCell(h + 1, i + 1).value = t; });
  const rows = [
    ['F21', 'Contreplaqué 5mm', 13.92, 30],
    ['G21', 'Contreplaqué 15mm', 35, 40],
    ['H21', 'Planches', 6.75, 9],
    ['A22', 'Insert, Boulon, vis, clous', 0.15, 0],
  ];
  rows.forEach(([src, label, prixHT, moHT], i) => {
    const r = h + 2 + i;
    f2.getCell(`A${r}`).value = { formula: `${q(src)}` };
    f2.getCell(`B${r}`).value = label;
    f2.getCell(`C${r}`).value = prixHT;
    f2.getCell(`D${r}`).value = moHT;
    f2.getCell(`E${r}`).value = { formula: `D${r}*A${r}` };
    f2.getCell(`F${r}`).value = { formula: `C${r}*(1+$G$21)` };
    f2.getCell(`G${r}`).value = { formula: `A${r}*F${r}` };
    f2.getCell(`H${r}`).value = { formula: `E${r}*(1+$G$21)*$E$21` };
    f2.getCell(`I${r}`).value = { formula: `$E$21` };
  });
  const st = h + 6;
  f2.getCell(`B${st}`).value = `SOUS-TOTAL OBJET ${n}`;
  f2.getCell(`G${st}`).value = { formula: `SUM(G${h + 2}:G${h + 5})` };
  f2.getCell(`H${st}`).value = { formula: `SUM(H${h + 2}:H${h + 5})` };
  return { G: `G${st}`, H: `H${st}` };
}

// ExcelJS сохраняет закэшированные результаты формул из шаблона; сбрасываем, чтобы пересчёт был обязательным
function stripCachedResults(wb) {
  wb.eachSheet((ws) => {
    ws.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        const v = cell.value;
        if (v && typeof v === 'object' && 'formula' in v) cell.value = { formula: v.formula };
        else if (v && typeof v === 'object' && 'sharedFormula' in v) cell.value = { sharedFormula: v.sharedFormula };
      });
    });
  });
}

export async function buildXlsx(ExcelJS, templateBuffer, state, devis) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(templateBuffer);
  const f2 = wb.getWorksheet('Feuille 2');
  const [o1, o2, ...rest] = state.objets;

  // Шапка
  f2.getCell('F2').value = Number(devis.numero.slice(-7));
  f2.getCell('F3').value = devis.dateEmission;
  f2.getCell('F4').value = devis.dateValidite;

  // Objet 1
  f2.getCell('C7').value = o1.nature; f2.getCell('E7').value = o1.poids;
  f2.getCell('C8').value = o1.L; f2.getCell('E8').value = o1.l; f2.getCell('G8').value = o1.H;
  // Objet 2 (если нет — очищаем, чтобы IF($C$12="") дал 0)
  f2.getCell('C11').value = o2 ? o2.nature : null; f2.getCell('E11').value = o2 ? o2.poids : null;
  f2.getCell('C12').value = o2 ? o2.L : null; f2.getCell('E12').value = o2 ? o2.l : null; f2.getCell('G12').value = o2 ? o2.H : null;

  // Destinataire
  const c = state.client || {};
  f2.getCell('C15').value = c.nom || ''; f2.getCell('C16').value = c.adresse || '';
  f2.getCell('C17').value = c.email || ''; f2.getCell('C18').value = c.siret || '';

  // Délai + options
  f2.getCell('C21').value = state.delai;
  for (const [key, row] of Object.entries(OPTION_ROWS)) f2.getCell(`C${row}`).value = OUI((state.options || []).includes(key));

  // Объекты 3+
  const extraSousTotaux = [];
  rest.forEach((o, i) => {
    const n = i + 3;
    const sheetName = `Feuille 1 - Objet ${n}`;
    const ws = copySheet(wb, 'Feuille 1 - Objet 2', sheetName);
    ws.getCell('C7').value = o.L; ws.getCell('D7').value = o.l; ws.getCell('E7').value = o.H;
    extraSousTotaux.push(writeExtraObjetBlock(f2, EXTRA_START_ROW + i * OBJET_BLOCK_ROWS, n, o, sheetName));
  });
  if (extraSousTotaux.length) {
    const extra = extraSousTotaux.map(({ G, H }) => `+${G}+${H}`).join('');
    f2.getCell('H48').value = { formula: `G38+H38+G46+H46+D30${extra}` };
  }

  stripCachedResults(wb);                    // иначе Excel/LibreOffice покажут старые числа из шаблона
  wb.calcProperties.fullCalcOnLoad = true;   // Excel/LibreOffice пересчитают при открытии
  return wb.xlsx.writeBuffer();
}
