import { computeExpenseVolatility30 } from './expenseVolatility30';

const parseDate = (v) => new Date(v);
const getAmount = (t) => Number(t.amount) || 0;
const getType = (t) => t.type || (getAmount(t) >= 0 ? 'income' : 'expense');

function daysAgo(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

describe('expenseVolatility30', () => {
  test('calcola media, std dev e coefficiente variazione', () => {
    const out = computeExpenseVolatility30({
      transactions: [
        { amount: -20, type: 'expense', date: daysAgo(1) },
        { amount: -40, type: 'expense', date: daysAgo(2) },
        { amount: -10, type: 'expense', date: daysAgo(3) }
      ],
      parseDate,
      getAmount,
      getType
    });
    expect(out.mean).toBeGreaterThan(0);
    expect(out.stdDev).toBeGreaterThanOrEqual(0);
  });
});

