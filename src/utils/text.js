function normalizeWhitespace(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function applyLabelExceptions(value) {
  const raw = String(value || '');
  const normalized = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return normalized.replace(/\bdeco['’]?\b/gi, "Deco'");
}

export function toTitleCaseIt(value) {
  const raw = normalizeWhitespace(value);
  if (!raw) return '';
  const titled = raw
    .toLocaleLowerCase('it-IT')
    .replace(/\b\p{L}/gu, (c) => c.toLocaleUpperCase('it-IT'));
  return applyLabelExceptions(titled);
}

export function formatEntityLabel(value, { fallback = '' } = {}) {
  const raw = normalizeWhitespace(value);
  if (!raw) return fallback;
  return toTitleCaseIt(raw);
}

export function formatCategoryLabel(value, { fallback = '-' } = {}) {
  const raw = normalizeWhitespace(value);
  if (!raw) return fallback;
  const lettersOnly = raw.replace(/[^\p{L}]/gu, '');
  if (!lettersOnly) return applyLabelExceptions(raw);

  const isAllCaps = lettersOnly === lettersOnly.toLocaleUpperCase('it-IT');
  if (!isAllCaps) return applyLabelExceptions(raw);
  return toTitleCaseIt(raw);
}
