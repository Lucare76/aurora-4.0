import { computeBurnRate7Days } from './burnRate7Days';

const parseDate = (v) => new Date(v);
const getAmount = (t) => Number(t.amount) || 0;
const getType = (t) => t.type || (getAmount(t) >= 0 ? 'income' : 'expense');

function daysAgo(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

describe('burnRate7Days', () => {
  test('calcola metriche ultime 7 giornate', () => {
    const out = computeBurnRate7Days({
      transactions: [
        { amount: 300, type: 'income', date: daysAgo(1) },
        { amount: -120, type: 'expense', date: daysAgo(2) },
        { amount: -80, type: 'expense', date: daysAgo(4) }
      ],
      parseDate,
      getAmount,
      getType
    });
    expect(out.income).toBeGreaterThan(0);
    expect(out.expense).toBeGreaterThan(0);
  });
});

