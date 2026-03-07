export function computeRolling30Comparison(input = {}) {
  const transactions = Array.isArray(input.transactions) ? input.transactions : [];
  const parseDate = typeof input.parseDate === 'function' ? input.parseDate : (v) => new Date(v);
  const getAmount = typeof input.getAmount === 'function' ? input.getAmount : (t) => Number(t?.amount) || 0;
  const getType = typeof input.getType === 'function' ? input.getType : (t) => (getAmount(t) >= 0 ? 'income' : 'expense');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastStart = new Date(today);
  lastStart.setDate(lastStart.getDate() - 29);
  const prevStart = new Date(lastStart);
  prevStart.setDate(prevStart.getDate() - 30);
  const prevEnd = new Date(lastStart);
  prevEnd.setDate(prevEnd.getDate() - 1);

  const sums = {
    last: { income: 0, expense: 0 },
    prev: { income: 0, expense: 0 }
  };

  transactions.forEach((t) => {
    const d = parseDate(t?.date);
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return;
    const type = getType(t);
    const amt = Math.abs(getAmount(t));
    if (d >= lastStart && d <= today) {
      if (type === 'income') sums.last.income += amt;
      if (type === 'expense') sums.last.expense += amt;
      return;
    }
    if (d >= prevStart && d <= prevEnd) {
      if (type === 'income') sums.prev.income += amt;
      if (type === 'expense') sums.prev.expense += amt;
    }
  });

  const lastNet = sums.last.income - sums.last.expense;
  const prevNet = sums.prev.income - sums.prev.expense;
  const deltaNet = lastNet - prevNet;
  const deltaIncome = sums.last.income - sums.prev.income;
  const deltaExpense = sums.last.expense - sums.prev.expense;

  let level = 'ok';
  if (deltaNet < -100) level = 'critical';
  else if (deltaNet < 0) level = 'warn';

  const message =
    level === 'critical'
      ? 'Peggioramento netto marcato rispetto ai 30g precedenti.'
      : level === 'warn'
      ? 'Netto in leggero calo rispetto al periodo precedente.'
      : 'Trend netto stabile o in miglioramento.';

  return {
    level,
    message,
    last: { ...sums.last, net: lastNet },
    prev: { ...sums.prev, net: prevNet },
    delta: { income: deltaIncome, expense: deltaExpense, net: deltaNet }
  };
}

