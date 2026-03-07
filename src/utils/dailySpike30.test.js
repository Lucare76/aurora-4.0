import { computeDailySpike30 } from './dailySpike30';

const parseDate = (v) => new Date(v);
const getAmount = (t) => Number(t.amount) || 0;
const getType = (t) => t.type || (getAmount(t) >= 0 ? 'income' : 'expense');

function daysAgo(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

describe('dailySpike30', () => {
  test('trova picco giornaliero', () => {
    const out = computeDailySpike30({
      transactions: [
        { amount: -20, type: 'expense', date: daysAgo(1) },
        { amount: -200, type: 'expense', date: daysAgo(2) },
        { amount: -30, type: 'expense', date: daysAgo(3) }
      ],
      parseDate,
      getAmount,
      getType
    });
    expect(out.peak).toBeTruthy();
    expect(out.peak.amount).toBeGreaterThan(0);
  });
});

