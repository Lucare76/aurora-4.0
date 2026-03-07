export function computeIncomeConcentration(input = {}) {
  const transactions = Array.isArray(input.transactions) ? input.transactions : [];
  const parseDate = typeof input.parseDate === 'function' ? input.parseDate : (v) => new Date(v);
  const getAmount = typeof input.getAmount === 'function' ? input.getAmount : (t) => Number(t?.amount) || 0;
  const getType = typeof input.getType === 'function' ? input.getType : (t) => (getAmount(t) >= 0 ? 'income' : 'expense');
  const getSourceLabel = typeof input.getSourceLabel === 'function'
    ? input.getSourceLabel
    : (t) => t?.categoryName || t?.category || t?.description || 'Altro';

  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 29);
  start.setHours(0, 0, 0, 0);

  const bySource = new Map();
  transactions.forEach((t) => {
    const d = parseDate(t?.date);
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return;
    if (d < start || d > now) return;
    if (getType(t) !== 'income') return;
    const label = String(getSourceLabel(t) || 'Altro').trim() || 'Altro';
    bySource.set(label, (bySource.get(label) || 0) + Math.abs(getAmount(t)));
  });

  const items = Array.from(bySource.entries())
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount);

  const total = items.reduce((sum, x) => sum + x.amount, 0);
  const top = items[0] || null;
  const topShare = total > 0 && top ? (top.amount / total) * 100 : 0;

  let level = 'ok';
  if (topShare >= 80) level = 'critical';
  else if (topShare >= 60) level = 'warn';

  const message =
    total <= 0
      ? 'Nessuna entrata negli ultimi 30 giorni.'
      : level === 'critical'
      ? 'Entrate molto concentrate su una sola fonte.'
      : level === 'warn'
      ? 'Entrate parzialmente concentrate.'
      : 'Entrate ben distribuite.';

  return {
    level,
    message,
    total,
    topSource: top,
    topShare,
    items: items.slice(0, 5)
  };
}

