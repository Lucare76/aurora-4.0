export function computeExpenseVolatility30(input = {}) {
  const transactions = Array.isArray(input.transactions) ? input.transactions : [];
  const parseDate = typeof input.parseDate === 'function' ? input.parseDate : (v) => new Date(v);
  const getAmount = typeof input.getAmount === 'function' ? input.getAmount : (t) => Number(t?.amount) || 0;
  const getType = typeof input.getType === 'function' ? input.getType : (t) => (getAmount(t) >= 0 ? 'income' : 'expense');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - 29);

  const byDay = new Map();
  for (let i = 0; i < 30; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    byDay.set(d.toISOString().slice(0, 10), 0);
  }

  transactions.forEach((t) => {
    const d = parseDate(t?.date);
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return;
    d.setHours(0, 0, 0, 0);
    if (d < start || d > today) return;
    if (getType(t) !== 'expense') return;
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) || 0) + Math.abs(getAmount(t)));
  });

  const values = Array.from(byDay.values());
  const mean = values.reduce((s, v) => s + v, 0) / Math.max(1, values.length);
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / Math.max(1, values.length);
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? stdDev / mean : 0;

  let level = 'ok';
  if (cv >= 1.1) level = 'critical';
  else if (cv >= 0.75) level = 'warn';

  const message =
    mean <= 0
      ? 'Nessuna uscita negli ultimi 30 giorni.'
      : level === 'critical'
      ? 'Uscite molto irregolari.'
      : level === 'warn'
      ? 'Uscite abbastanza variabili.'
      : 'Uscite stabili.';

  return {
    level,
    message,
    mean,
    stdDev,
    cv
  };
}

