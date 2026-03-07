import { computeCategorizationScore30 } from './categorizationScore30';

const parseDate = (v) => new Date(v);

function daysAgo(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

describe('categorizationScore30', () => {
  test('calcola score e uncategorized', () => {
    const out = computeCategorizationScore30({
      transactions: [
        { amount: -20, type: 'expense', date: daysAgo(1), categoryId: 'c1' },
        { amount: -10, type: 'expense', date: daysAgo(2) },
        { amount: 100, type: 'income', date: daysAgo(3), categoryId: 'c2' }
      ],
      parseDate
    });
    expect(out.total).toBe(3);
    expect(out.uncategorized).toBe(1);
    expect(out.scorePct).toBeLessThan(100);
  });
});

