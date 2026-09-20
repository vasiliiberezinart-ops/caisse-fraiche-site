// Единственное место с ценами и размерами. Владельцы правят здесь.
// Источник: assets/source/Calcul_Devis.xlsx
export const PRICES = {
  CP_INT: 0.5,        // Épaisseur contreplaqué intérieur, cm  (Feuille 1!I7)
  PLANCHE_EP: 3.5,    // Épaisseur planche, cm                  (I9)
  PLANCHE_L: 7,       // Largeur planche, cm                    (I11)
  CP_EXT: 1.5,        // Épaisseur contreplaqué extérieur, cm   (I13)
  BOULONS: 36,        // Inserts/boulons par caisse             (A22)
  TVA: 0.20,
  COEF_EXPRESS: 1.2,  // délai « 2 jours »
  DEVIS_VALIDITE_JOURS: 30,
  ACOMPTE: 0.30,
  MATERIAUX: [
    { key: 'cp5',      label: 'Contreplaqué 5mm',           prixHT: 13.92, moHT: 30 },
    { key: 'cp15',     label: 'Contreplaqué 15mm',          prixHT: 35,    moHT: 40 },
    { key: 'planches', label: 'Planches',                   prixHT: 6.75,  moHT: 9  },
    { key: 'boulons',  label: 'Insert, Boulon, vis, clous', prixHT: 0.15,  moHT: 0  },
  ],
  OPTIONS: {
    photogrammetrie: { label: 'Photogrammétrie',        prixTTC: 60,  description: "Afin de ne pas déplacer votre objet jusqu'à notre atelier, nous venons prendre son empreinte 3D, envoyée directement à nos équipes pour la réalisation d'un calage intérieur au mm. Ainsi l'objet ne se déplace jamais sans être protégé." },
    livraison:       { label: 'Livraison de la caisse', prixTTC: 80,  description: "Livraison de la caisse à l'adresse de facturation dans la journée." },
    mise_en_caisse:  { label: 'Mise en caisse',         prixTTC: 150, description: 'Nous nous chargeons de la mise en boîte de votre objet. Au-delà de 120 kg, nous vous invitons à nous contacter par téléphone.' },
    monte_charge:    { label: 'Monte-charge',           prixTTC: 180, description: "Pour toute sortie de l'objet nécessitant une descente du 1er au 7e étage, nous prenons en charge la commande d'un dispositif approprié." },
    transport:       { label: 'Transport',              prixTTC: 100, description: 'Nous assurons un transport vers les aéroports de Paris, ou tout autre lieu de livraison dans Paris et la petite couronne.' },
  },
};
