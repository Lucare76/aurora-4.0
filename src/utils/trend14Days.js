export function buildTrend14Days(input = {}) {
  const transactions = Array.isArray(input.transactions) ? input.transactions : [];
  const parseDate = typeof input.parseDate === 'function' ? input.parseDate : (v) => new Date(v);
  const getAmount = typeof input.getAmount === 'function' ? input.getAmount : (t) => Number(t?.amount) || 0;
  const getType = typeof input.getType === 'function' ? input.getType : (t) => (getAmount(t) >= 0 ? 'income' : 'expense');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - 13);

  const map = new Map();
  for (let i = 0; i < 14; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { key, label: d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }), income: 0, expense: 0, net: 0 });
  }

  transactions.forEach((t) => {
    const d = parseDate(t?.date);
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return;
    d.setHours(0, 0, 0, 0);
    if (d < start || d > today) return;
    const key = d.toISOString().slice(0, 10);
    const row = map.get(key);
    if (!row) return;
    const amt = Math.abs(getAmount(t));
    const type = getType(t);
    if (type === 'income') row.income += amt;
    if (type === 'expense') row.expense += amt;
    row.net = row.income - row.expense;
  });

  const items = Array.from(map.values());
  const maxValue = Math.max(1, ...items.map((x) => Math.max(x.income, x.expense, Math.abs(x.net))));
  const netSum = items.reduce((sum, x) => sum + x.net, 0);
  const level = netSum < 0 ? 'warn' : 'ok';

  return { items, maxValue, netSum, level };
}

