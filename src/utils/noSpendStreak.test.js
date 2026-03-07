import { computeNoSpendStreak } from './noSpendStreak';

const parseDate = (v) => new Date(v);
const getAmount = (t) => Number(t.amount) || 0;
const getType = (t) => t.type || (getAmount(t) >= 0 ? 'income' : 'expense');

function daysAgo(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

describe('noSpendStreak', () => {
  test('calcola streak e giorni no-spend del mese', () => {
    const out = computeNoSpendStreak({
      transactions: [
        { amount: -20, type: 'expense', date: daysAgo(2) },
        { amount: -10, type: 'expense', date: daysAgo(6) }
      ],
      parseDate,
      getAmount,
      getType
    });
    expect(out.streak).toBeGreaterThanOrEqual(0);
    expect(out.noSpendDaysMonth).toBeGreaterThan(0);
  });
});

