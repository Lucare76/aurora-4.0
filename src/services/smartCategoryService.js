// src/services/smartCategoryService.js

const RECEIPT_HINTS = [
  { keys: ['esselunga', 'coop', 'conad', 'lidl', 'eurospin', 'carrefour', 'pam', 'supermercato'], cat: ['spesa', 'alimentari'] },
  { keys: ['farmacia', 'parafarmacia'], cat: ['salute', 'farmacia'] },
  { keys: ['enel', 'eni', 'acea', 'a2a', 'hera', 'gas', 'luce'], cat: ['utenze', 'bollette'] },
  { keys: ['amazon', 'amzn', 'ebay', 'zara', 'h&m', 'ikea'], cat: ['shopping'] },
  { keys: ['ristorante', 'pizzeria', 'bar', 'mcdonald', 'burger king', 'deliveroo', 'just eat', 'glovo'], cat: ['ristoranti', 'intrattenimento'] },
  { keys: ['autogrill', 'telepass', 'q8', 'eni station', 'ip', 'tamoil', 'esso'], cat: ['trasporti', 'auto'] },
  { keys: ['trenitalia', 'italo', 'uber', 'taxi'], cat: ['trasporti'] }
];

function confidenceFromScore(score) {
  if (score >= 2.2) return { value: 0.9, label: 'Alta' };
  if (score >= 1.4) return { value: 0.7, label: 'Media' };
  return { value: 0.5, label: 'Bassa' };
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordsOf(value) {
  return normalizeText(value).split(' ').filter((w) => w.length > 2);
}

function scoreByWordOverlap(a, b) {
  const wa = wordsOf(a);
  const wb = new Set(wordsOf(b));
  if (!wa.length || !wb.size) return 0;
  let hits = 0;
  for (const w of wa) if (wb.has(w)) hits += 1;
  return hits / Math.max(wa.length, 1);
}

function findCategoryByNameHints(categories, hints) {
  if (!categories?.length || !hints?.length) return null;
  const normalizedHints = hints.map(normalizeText);
  let best = null;
  let bestScore = 0;

  for (const cat of categories) {
    const name = normalizeText(cat.name);
    let score = 0;
    for (const hint of normalizedHints) {
      if (!hint) continue;
      if (name === hint) score = Math.max(score, 1);
      else if (name.includes(hint) || hint.includes(name)) score = Math.max(score, 0.8);
      else score = Math.max(score, scoreByWordOverlap(name, hint) * 0.7);
    }
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }

  return bestScore >= 0.55 ? best : null;
}

function buildSuggestion(categoryId, subCategoryId, categories, meta = {}) {
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return null;
  const sub = subCategoryId ? cat.subCategories?.find((s) => s.id === subCategoryId) : null;
  return {
    categoryId,
    subCategoryId: subCategoryId || '',
    categoryName: cat.name,
    categoryIcon: cat.icon,
    subCategoryName: sub?.name || '',
    confidence: meta.confidence ?? 0.5,
    confidenceLabel: meta.confidenceLabel ?? 'Media',
    source: meta.source || 'history',
    score: meta.score ?? 0
  };
}

/**
 * Suggerisce top categorie/sottocategorie usando storico transazioni.
 */
export function suggestTopCategories(description, transactions, categories, type, limit = 3) {
  if (!description || description.length < 2) return null;

  const needle = normalizeText(description);
  const agg = {};

  for (const t of transactions || []) {
    if (t.type !== type) continue;
    if (!t.description || !t.categoryId) continue;
    const txDesc = normalizeText(t.description);
    if (!txDesc) continue;

    const score =
      (txDesc.includes(needle) || needle.includes(txDesc) ? 1 : 0) +
      scoreByWordOverlap(needle, txDesc);

    if (score <= 0.4) continue;

    const key = `${t.categoryId}|${t.subCategoryId || ''}`;
    agg[key] = (agg[key] || 0) + score;
  }

  const rankedKeys = Object.keys(agg).sort((a, b) => agg[b] - agg[a]).slice(0, Math.max(1, limit));
  if (rankedKeys.length === 0) return [];

  return rankedKeys
    .map((key) => {
      const [categoryId, subCategoryId] = key.split('|');
      const score = agg[key] || 0;
      const conf = confidenceFromScore(score);
      return buildSuggestion(categoryId, subCategoryId, categories, {
        confidence: conf.value,
        confidenceLabel: conf.label,
        source: 'history',
        score
      });
    })
    .filter(Boolean);
}

/**
 * Compatibilità: ritorna solo il miglior suggerimento.
 */
export function suggestCategory(description, transactions, categories, type) {
  return suggestTopCategories(description, transactions, categories, type, 1)?.[0] || null;
}

/**
 * Suggerimento dedicato a OCR scontrino:
 * 1) merchant nello storico
 * 2) raw OCR nello storico
 * 3) fallback keyword merchant -> nome categoria dell'app
 */
export function suggestTopCategoriesFromReceipt(receiptData, transactions, categories, type = 'expense', limit = 3) {
  const merchant = receiptData?.merchant || '';
  const rawText = receiptData?.rawText || '';
  const merged = new Map();

  const pushSuggestion = (item, minConfidence = 0.5, source = 'history', scoreBoost = 0) => {
    if (!item?.categoryId) return;
    const key = `${item.categoryId}|${item.subCategoryId || ''}`;
    const next = {
      ...item,
      source,
      confidence: Math.max(item.confidence || 0, minConfidence),
      confidenceLabel: item.confidence >= 0.9 ? 'Alta' : item.confidence >= 0.7 ? 'Media' : 'Bassa',
      score: (item.score || 0) + scoreBoost
    };
    const current = merged.get(key);
    if (!current || next.score > current.score) {
      merged.set(key, next);
    }
  };

  suggestTopCategories(merchant, transactions, categories, type, limit)
    .forEach((s) => pushSuggestion(s, 0.7, 'merchant_history', 0.4));

  suggestTopCategories(rawText, transactions, categories, type, limit)
    .forEach((s) => pushSuggestion(s, 0.6, 'ocr_history', 0.2));

  const scanText = normalizeText(`${merchant} ${rawText}`);
  const hitRule = RECEIPT_HINTS.find((r) => r.keys.some((k) => scanText.includes(normalizeText(k))));
  if (hitRule) {
    const cat = findCategoryByNameHints(categories, hitRule.cat);
    if (cat) {
      const fallback = buildSuggestion(cat.id, '', categories, {
        confidence: 0.55,
        confidenceLabel: 'Bassa',
        source: 'receipt_keyword',
        score: 0.8
      });
      pushSuggestion(fallback, 0.55, 'receipt_keyword');
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, Math.max(1, limit));
}

/**
 * Compatibilità: ritorna solo il miglior suggerimento OCR.
 */
export function suggestCategoryFromReceipt(receiptData, transactions, categories, type = 'expense') {
  return suggestTopCategoriesFromReceipt(receiptData, transactions, categories, type, 1)?.[0] || null;
}
