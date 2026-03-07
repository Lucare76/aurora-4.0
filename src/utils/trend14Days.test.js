import { buildTrend14Days } from './trend14Days';

const parseDate = (v) => new Date(v);
const getAmount = (t) => Number(t.amount) || 0;
const getType = (t) => t.type || (getAmount(t) >= 0 ? 'income' : 'expense');

function daysAgo(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

describe('trend14Days', () => {
  test('costruisce 14 punti e calcola net', () => {
    const out = buildTrend14Days({
      transactions: [
        { amount: 100, type: 'income', date: daysAgo(1) },
        { amount: -40, type: 'expense', date: daysAgo(1) },
        { amount: -60, type: 'expense', date: daysAgo(0) }
      ],
      parseDate,
      getAmount,
      getType
    });
    expect(out.items.length).toBe(14);
    expect(out.maxValue).toBeGreaterThan(0);
  });
});

