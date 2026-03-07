export function computeSpendingMomentum7(input = {}) {
  const transactions = Array.isArray(input.transactions) ? input.transactions : [];
  const parseDate = typeof input.parseDate === 'function' ? input.parseDate : (v) => new Date(v);
  const getAmount = typeof input.getAmount === 'function' ? input.getAmount : (t) => Number(t?.amount) || 0;
  const getType = typeof input.getType === 'function' ? input.getType : (t) => (getAmount(t) >= 0 ? 'income' : 'expense');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentStart = new Date(today);
  currentStart.setDate(currentStart.getDate() - 6);
  const prevStart = new Date(currentStart);
  prevStart.setDate(prevStart.getDate() - 7);
  const prevEnd = new Date(currentStart);
  prevEnd.setDate(prevEnd.getDate() - 1);

  let currentExpense = 0;
  let prevExpense = 0;

  transactions.forEach((t) => {
    const d = parseDate(t?.date);
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return;
    if (getType(t) !== 'expense') return;
    const amount = Math.abs(getAmount(t));
    if (d >= currentStart && d <= today) currentExpense += amount;
    if (d >= prevStart && d <= prevEnd) prevExpense += amount;
  });

  const delta = currentExpense - prevExpense;
  const deltaPct = prevExpense > 0 ? (delta / prevExpense) * 100 : 0;

  let level = 'ok';
  if (deltaPct >= 25 && delta > 50) level = 'critical';
  else if (delta > 0) level = 'warn';

  const message =
    level === 'critical'
      ? 'Spese in forte accelerazione.'
      : level === 'warn'
      ? 'Spese in aumento rispetto alla settimana scorsa.'
      : 'Spese stabili o in calo.';

  return {
    level,
    message,
    currentExpense,
    prevExpense,
    delta,
    deltaPct
  };
}

