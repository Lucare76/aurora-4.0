import { computeIncomeConcentration } from './incomeConcentration';

const parseDate = (v) => new Date(v);
const getAmount = (t) => Number(t.amount) || 0;
const getType = (t) => t.type || (getAmount(t) >= 0 ? 'income' : 'expense');
const getSourceLabel = (t) => t.categoryName || t.description || 'Altro';

function daysAgo(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

describe('incomeConcentration', () => {
  test('warn/critical con forte concentrazione', () => {
    const out = computeIncomeConcentration({
      transactions: [
        { amount: 2000, type: 'income', categoryName: 'Stipendio', date: daysAgo(3) },
        { amount: 300, type: 'income', categoryName: 'Extra', date: daysAgo(5) }
      ],
      parseDate,
      getAmount,
      getType,
      getSourceLabel
    });
    expect(['warn', 'critical']).toContain(out.level);
    expect(out.topSource?.label).toBe('Stipendio');
  });
});

