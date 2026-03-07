export function computeDailySpike30(input = {}) {
  const transactions = Array.isArray(input.transactions) ? input.transactions : [];
  const parseDate = typeof input.parseDate === 'function' ? input.parseDate : (v) => new Date(v);
  const getAmount = typeof input.getAmount === 'function' ? input.getAmount : (t) => Number(t?.amount) || 0;
  const getType = typeof input.getType === 'function' ? input.getType : (t) => (getAmount(t) >= 0 ? 'income' : 'expense');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - 29);

  const byDay = new Map();
  transactions.forEach((t) => {
    const d = parseDate(t?.date);
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return;
    d.setHours(0, 0, 0, 0);
    if (d < start || d > today) return;
    if (getType(t) !== 'expense') return;
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) || 0) + Math.abs(getAmount(t)));
  });

  const rows = Array.from(byDay.entries()).map(([date, amount]) => ({ date, amount }));
  if (rows.length === 0) {
    return { level: 'ok', message: 'Nessuna spesa registrata negli ultimi 30 giorni.', avg: 0, peak: null, ratio: 0 };
  }

  const avg = rows.reduce((s, r) => s + r.amount, 0) / rows.length;
  const peak = rows.sort((a, b) => b.amount - a.amount)[0];
  const ratio = avg > 0 ? peak.amount / avg : 0;

  let level = 'ok';
  if (ratio >= 3) level = 'critical';
  else if (ratio >= 2) level = 'warn';

  const message =
    level === 'critical'
      ? 'Picco spesa molto sopra media.'
      : level === 'warn'
      ? 'Picco spesa sopra media.'
      : 'Spese giornaliere regolari.';

  return { level, message, avg, peak, ratio };
}

