export function computeTopCategories7Days(input = {}) {
  const transactions = Array.isArray(input.transactions) ? input.transactions : [];
  const parseDate = typeof input.parseDate === 'function' ? input.parseDate : (v) => new Date(v);
  const getAmount = typeof input.getAmount === 'function' ? input.getAmount : (t) => Number(t?.amount) || 0;
  const getType = typeof input.getType === 'function' ? input.getType : (t) => (getAmount(t) >= 0 ? 'income' : 'expense');
  const getCategoryName = typeof input.getCategoryName === 'function' ? input.getCategoryName : (t) => t?.categoryName || t?.category || 'Senza categoria';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - 6);

  const totals = new Map();
  transactions.forEach((t) => {
    const d = parseDate(t?.date);
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return;
    d.setHours(0, 0, 0, 0);
    if (d < start || d > today) return;
    if (getType(t) !== 'expense') return;
    const key = String(getCategoryName(t) || 'Senza categoria').trim() || 'Senza categoria';
    totals.set(key, (totals.get(key) || 0) + Math.abs(getAmount(t)));
  });

  const items = Array.from(totals.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const total = items.reduce((sum, x) => sum + x.amount, 0);
  return {
    total,
    items
  };
}

