export function computeWeekendSpend(input = {}) {
  const transactions = Array.isArray(input.transactions) ? input.transactions : [];
  const parseDate = typeof input.parseDate === 'function' ? input.parseDate : (v) => new Date(v);
  const getAmount = typeof input.getAmount === 'function' ? input.getAmount : (t) => Number(t?.amount) || 0;
  const getType = typeof input.getType === 'function' ? input.getType : (t) => (getAmount(t) >= 0 ? 'income' : 'expense');

  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 27);
  start.setHours(0, 0, 0, 0);

  let weekendExpense = 0;
  let weekdayExpense = 0;
  let weekendDays = 0;
  let weekdayDays = 0;
  const seenDays = new Set();

  transactions.forEach((t) => {
    const d = parseDate(t?.date);
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return;
    if (d < start || d > now) return;
    const key = d.toISOString().slice(0, 10);
    if (!seenDays.has(key)) {
      seenDays.add(key);
      const day = d.getDay();
      if (day === 0 || day === 6) weekendDays += 1;
      else weekdayDays += 1;
    }
    if (getType(t) !== 'expense') return;
    const amount = Math.abs(getAmount(t));
    const day = d.getDay();
    if (day === 0 || day === 6) weekendExpense += amount;
    else weekdayExpense += amount;
  });

  const weekendAvg = weekendDays > 0 ? weekendExpense / weekendDays : 0;
  const weekdayAvg = weekdayDays > 0 ? weekdayExpense / weekdayDays : 0;
  const ratio = weekdayAvg > 0 ? weekendAvg / weekdayAvg : 1;

  let level = 'ok';
  if (ratio >= 1.6 && weekendExpense > 80) level = 'critical';
  else if (ratio >= 1.25 && weekendExpense > 40) level = 'warn';

  const message =
    level === 'critical'
      ? 'Weekend molto sopra media feriale.'
      : level === 'warn'
      ? 'Weekend un po sopra media.'
      : 'Weekend in linea.';

  return {
    level,
    message,
    weekendExpense,
    weekdayExpense,
    weekendAvg,
    weekdayAvg,
    ratio
  };
}

