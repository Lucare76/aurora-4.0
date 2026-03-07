import { computeRolling30Comparison } from './rolling30Comparison';

const parseDate = (v) => new Date(v);
const getAmount = (t) => Number(t.amount) || 0;
const getType = (t) => t.type || (getAmount(t) >= 0 ? 'income' : 'expense');

function daysAgo(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

describe('rolling30Comparison', () => {
  test('calcola delta tra ultimi 30 e precedenti 30 giorni', () => {
    const out = computeRolling30Comparison({
      transactions: [
        { amount: 1000, type: 'income', date: daysAgo(5) },
        { amount: -400, type: 'expense', date: daysAgo(3) },
        { amount: 800, type: 'income', date: daysAgo(35) },
        { amount: -500, type: 'expense', date: daysAgo(40) }
      ],
      parseDate,
      getAmount,
      getType
    });
    expect(out.last.income).toBeGreaterThan(0);
    expect(out.prev.income).toBeGreaterThan(0);
  });
});

