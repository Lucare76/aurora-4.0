// src/utils/autoCategorize.js

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Ritorna una categoria testuale in base a descrizione/importo.
 * Usa punteggio keyword per essere piu robusto rispetto a semplici include.
 */
export function autoCategorize(t) {
  const desc = normalizeText(t?.description || '');
  const amount = Number(t?.amount || 0);

  const rules = [
    { category: 'Spesa', keywords: ['esselunga', 'coop', 'conad', 'lidl', 'eurospin', 'carrefour', 'supermercato'] },
    { category: 'Shopping', keywords: ['amazon', 'amzn', 'zalando', 'ikea', 'mediaworld'] },
    { category: 'Utenze', keywords: ['enel', 'eni', 'acea', 'a2a', 'hera', 'gas', 'luce', 'acqua', 'bolletta'] },
    { category: 'Telefono/Internet', keywords: ['telecom', 'tim', 'vodafone', 'wind', 'fastweb', 'iliad'] },
    { category: 'Abbonamenti', keywords: ['netflix', 'spotify', 'prime video', 'disney', 'youtube premium'] },
    { category: 'Trasporti', keywords: ['trenitalia', 'italo', 'uber', 'taxi', 'metro', 'autobus'] },
    { category: 'Auto/Trasporti', keywords: ['autostrade', 'telepass', 'benzina', 'gasolio', 'q8', 'eni station'] },
    { category: 'Salute', keywords: ['farmacia', 'parafarmacia', 'ospedale', 'visita', 'medico'] },
    { category: 'Ristoranti/Bar', keywords: ['ristorante', 'pizzeria', 'bar', 'caffe', 'colazione', 'pranzo', 'cena'] },
    { category: 'Pagamenti Online', keywords: ['paypal', 'stripe', 'satispay'] },
    { category: 'Contanti', keywords: ['prelievo atm', 'prelievo', 'bancomat'] },
    { category: 'Trasferimenti', keywords: ['bonifico', 'giroconto', 'trasferimento'] },
    { category: 'Entrate', keywords: ['stipendio', 'salary', 'accredito', 'rimborso', 'pensione'] }
  ];

  let best = { category: null, score: 0 };

  for (const rule of rules) {
    let score = 0;
    for (const keyword of rule.keywords) {
      if (desc.includes(keyword)) score += 1;
    }
    if (score > best.score) best = { category: rule.category, score };
  }

  if (best.score > 0) return best.category;
  if (amount > 0) return 'Entrate';
  if (amount < 0) return 'Uscite';
  return 'Senza categoria';
}

export default autoCategorize;
