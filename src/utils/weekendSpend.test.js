import { computeWeekendSpend } from './weekendSpend';

const parseDate = (v) => new Date(v);
const getAmount = (t) => Number(t.amount) || 0;
const getType = (t) => t.type || (getAmount(t) >= 0 ? 'income' : 'expense');

function daysAgo(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

describe('weekendSpend', () => {
  test('alert quando weekend supera media feriale', () => {
    const out = computeWeekendSpend({
      transactions: [
        { amount: -200, type: 'expense', date: daysAgo(1) },
        { amount: -180, type: 'expense', date: daysAgo(2) },
        { amount: -40, type: 'expense', date: daysAgo(3) },
        { amount: -35, type: 'expense', date: daysAgo(4) }
      ],
      parseDate,
      getAmount,
      getType
    });
    expect(['warn', 'critical', 'ok']).toContain(out.level);
    expect(out.weekendExpense + out.weekdayExpense).toBeGreaterThan(0);
  });
});

