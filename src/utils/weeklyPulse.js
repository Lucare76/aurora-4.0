function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sumByType(rows, getType, getAmount, type) {
  return rows
    .filter((r) => getType(r) === type)
    .reduce((sum, r) => sum + Math.abs(getAmount(r)), 0);
}

export function computeWeeklyPulse(input = {}) {
  const transactions = Array.isArray(input.transactions) ? input.transactions : [];
  const parseDate = typeof input.parseDate === 'function' ? input.parseDate : (v) => new Date(v);
  const getAmount = typeof input.getAmount === 'function' ? input.getAmount : (t) => Number(t?.amount) || 0;
  const getType = typeof input.getType === 'function' ? input.getType : (t) => (getAmount(t) >= 0 ? 'income' : 'expense');

  const today = startOfDay(new Date());
  const last7Start = new Date(today);
  last7Start.setDate(last7Start.getDate() - 6);
  const prev7Start = new Date(last7Start);
  prev7Start.setDate(prev7Start.getDate() - 7);
  const prev7End = new Date(last7Start);
  prev7End.setDate(prev7End.getDate() - 1);

  const withDate = transactions
    .map((t) => ({ ...t, _d: startOfDay(parseDate(t?.date)) }))
    .filter((t) => t._d instanceof Date && !Number.isNaN(t._d.getTime()));

  const last7 = withDate.filter((t) => t._d >= last7Start && t._d <= today);
  const prev7 = withDate.filter((t) => t._d >= prev7Start && t._d <= prev7End);

  const incomeLast7 = sumByType(last7, getType, getAmount, 'income');
  const expenseLast7 = sumByType(last7, getType, getAmount, 'expense');
  const netLast7 = incomeLast7 - expenseLast7;

  const incomePrev7 = sumByType(prev7, getType, getAmount, 'income');
  const expensePrev7 = sumByType(prev7, getType, getAmount, 'expense');
  const netPrev7 = incomePrev7 - expensePrev7;

  const expenseDelta = expenseLast7 - expensePrev7;
  const incomeDelta = incomeLast7 - incomePrev7;
  const netDelta = netLast7 - netPrev7;

  let level = 'ok';
  if (expenseDelta > 80 && expensePrev7 > 0 && expenseDelta / expensePrev7 >= 0.2) level = 'warn';
  if (netLast7 < 0 && netDelta < 0) level = 'critical';

  const message =
    level === 'critical'
      ? 'Trend settimanale in peggioramento: cashflow negativo.'
      : level === 'warn'
      ? 'Spese in crescita rispetto alla settimana precedente.'
      : 'Trend settimanale stabile.';

  const topExpense = last7
    .filter((t) => getType(t) === 'expense')
    .map((t) => ({
      id: t.id,
      amount: Math.abs(getAmount(t)),
      description: t.description || 'Spesa'
    }))
    .sort((a, b) => b.amount - a.amount)[0] || null;

  return {
    level,
    message,
    periods: {
      last7: { income: incomeLast7, expense: expenseLast7, net: netLast7, count: last7.length },
      prev7: { income: incomePrev7, expense: expensePrev7, net: netPrev7, count: prev7.length }
    },
    delta: {
      income: incomeDelta,
      expense: expenseDelta,
      net: netDelta
    },
    topExpense
  };
}

