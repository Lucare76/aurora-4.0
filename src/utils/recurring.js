export function parseRecurringDate(value) {
  if (!value) return null;
  if (value && typeof value === 'object' && typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getRecurringNextRunLabel(value) {
  const d = parseRecurringDate(value);
  if (!d) return 'N/D';

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const target = new Date(d);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.round((target.getTime() - now.getTime()) / 86400000);
  if (diffDays === 0) return 'Oggi';
  if (diffDays === 1) return 'Domani';
  if (diffDays > 1) return `Tra ${diffDays} giorni`;
  return `${Math.abs(diffDays)} giorni fa`;
}
