export const CONFIG = {
  WORKER_URL: 'https://caisse-fraiche-mail.caissefraiche.workers.dev',   // локально: http://localhost:8787 (wrangler dev)
  INSTAGRAM_URL: 'https://www.instagram.com/caissefraiche',
  CONTACT_EMAIL: 'contact@liraa-agency.com',       // показывается в футере, в письмах и при ошибке отправки
  ADRESSE: '106 rue Bracion, 75014 Paris',
  XLSX_TEMPLATE: 'assets/Calcul_Devis.xlsx',
  // Зоны hero: видео + таймкоды-стопы (сек). Один файл на зону, клик = play до следующего стопа.
  ZONES: {
    crate:  { video: null, poster: 'assets/crate.jpg', stops: [0] },          // placeholder: статика
    podium: { video: 'assets/podium.mp4', poster: null, stops: [0, 3.3] },   // placeholder: 2 состояния
  },
};
