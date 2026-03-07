import { computeSpendingMomentum7 } from './spendingMomentum7';

const parseDate = (v) => new Date(v);
const getAmount = (t) => Number(t.amount) || 0;
const getType = (t) => t.type || (getAmount(t) >= 0 ? 'income' : 'expense');

function daysAgo(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

describe('spendingMomentum7', () => {
  test('rileva aumento spese settimana corrente', () => {
    const out = computeSpendingMomentum7({
      transactions: [
        { amount: -100, type: 'expense', date: daysAgo(2) },
        { amount: -80, type: 'expense', date: daysAgo(1) },
        { amount: -40, type: 'expense', date: daysAgo(8) }
      ],
      parseDate,
      getAmount,
      getType
    });
    expect(out.currentExpense).toBeGreaterThan(out.prevExpense);
    expect(['warn', 'critical']).toContain(out.level);
  });
});

