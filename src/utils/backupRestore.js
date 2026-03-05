import { getBackupCollections } from './backupProfiles';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function shouldReviveDate(key = '', value = '') {
  const keyLc = String(key).toLowerCase();
  if (!ISO_DATE_RE.test(String(value))) return false;
  return (
    keyLc.includes('date') ||
    keyLc.includes('deadline') ||
    keyLc.includes('due') ||
    keyLc.endsWith('at') ||
    keyLc.includes('timestamp')
  );
}

export function reviveBackupValue(value, parentKey = '') {
  if (Array.isArray(value)) {
    return value.map((item) => reviveBackupValue(item, parentKey));
  }
  if (value && typeof value === 'object') {
    const out = {};
    Object.entries(value).forEach(([k, v]) => {
      out[k] = reviveBackupValue(v, k);
    });
    return out;
  }
  if (typeof value === 'string' && shouldReviveDate(parentKey, value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return value;
}

export function parseBackupJson(rawText = '') {
  const parsed = JSON.parse(String(rawText || '{}'));
  const data = parsed?.data && typeof parsed.data === 'object' ? parsed.data : {};
  return {
    exportedAt: parsed?.exportedAt || null,
    profile: parsed?.profile || 'full',
    userId: parsed?.userId || '',
    data
  };
}

export function summarizeBackupPayload(payload, profile = 'full') {
  const cols = getBackupCollections(profile);
  const summary = cols.map((col) => ({
    collection: col,
    count: Array.isArray(payload?.data?.[col]) ? payload.data[col].length : 0
  }));
  const total = summary.reduce((sum, item) => sum + item.count, 0);
  return { collections: summary, total };
}

function normalizeForCompare(value) {
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => normalizeForCompare(item));
  if (value && typeof value === 'object') {
    const out = {};
    Object.keys(value)
      .sort()
      .forEach((key) => {
        if (['userId', 'createdAt', 'updatedAt'].includes(key)) return;
        out[key] = normalizeForCompare(value[key]);
      });
    return out;
  }
  return value;
}

export function hasBackupConflict(existingDoc = {}, incomingDoc = {}) {
  const a = JSON.stringify(normalizeForCompare(existingDoc));
  const b = JSON.stringify(normalizeForCompare(incomingDoc));
  return a !== b;
}
