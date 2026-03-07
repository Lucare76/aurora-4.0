export function computeBurnRate7Days(input = {}) {
  const transactions = Array.isArray(input.transactions) ? input.transactions : [];
  const parseDate = typeof input.parseDate === 'function' ? input.parseDate : (v) => new Date(v);
  const getAmount = typeof input.getAmount === 'function' ? input.getAmount : (t) => Number(t?.amount) || 0;
  const getType = typeof input.getType === 'function' ? input.getType : (t) => (getAmount(t) >= 0 ? 'income' : 'expense');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - 6);

  let income = 0;
  let expense = 0;
  transactions.forEach((t) => {
    const d = parseDate(t?.date);
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return;
    d.setHours(0, 0, 0, 0);
    if (d < start || d > today) return;
    const amt = Math.abs(getAmount(t));
    if (getType(t) === 'income') income += amt;
    if (getType(t) === 'expense') expense += amt;
  });

  const net = income - expense;
  const dailyNet = net / 7;
  const projected30 = dailyNet * 30;

  let level = 'ok';
  if (dailyNet < -20) level = 'critical';
  else if (dailyNet < 0) level = 'warn';

  const message =
    level === 'critical'
      ? 'Burn rate negativo alto.'
      : level === 'warn'
      ? 'Burn rate leggermente negativo.'
      : 'Burn rate positivo.';

  return { level, message, income, expense, net, dailyNet, projected30 };
}

