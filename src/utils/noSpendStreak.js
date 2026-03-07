export function computeNoSpendStreak(input = {}) {
  const transactions = Array.isArray(input.transactions) ? input.transactions : [];
  const parseDate = typeof input.parseDate === 'function' ? input.parseDate : (v) => new Date(v);
  const getAmount = typeof input.getAmount === 'function' ? input.getAmount : (t) => Number(t?.amount) || 0;
  const getType = typeof input.getType === 'function' ? input.getType : (t) => (getAmount(t) >= 0 ? 'income' : 'expense');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const expenseDays = new Set();
  transactions.forEach((t) => {
    const d = parseDate(t?.date);
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return;
    if (getType(t) !== 'expense') return;
    d.setHours(0, 0, 0, 0);
    expenseDays.add(d.toISOString().slice(0, 10));
  });

  let streak = 0;
  for (let i = 0; i <= 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (expenseDays.has(key)) break;
    streak += 1;
  }

  let noSpendDaysMonth = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(currentYear, currentMonth, day);
    if (d > today) break;
    const key = d.toISOString().slice(0, 10);
    if (!expenseDays.has(key)) noSpendDaysMonth += 1;
  }

  let level = 'ok';
  if (streak <= 1) level = 'warn';
  if (streak === 0) level = 'critical';

  const message =
    level === 'critical'
      ? 'Nessun giorno no-spend in corso.'
      : level === 'warn'
      ? 'Serie no-spend corta.'
      : 'Buona serie no-spend.';

  return {
    level,
    message,
    streak,
    noSpendDaysMonth
  };
}

