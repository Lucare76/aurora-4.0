import { computeTopCategories7Days } from './topCategories7Days';

const parseDate = (v) => new Date(v);
const getAmount = (t) => Number(t.amount) || 0;
const getType = (t) => t.type || (getAmount(t) >= 0 ? 'income' : 'expense');
const getCategoryName = (t) => t.categoryName || t.category || 'Senza categoria';

function daysAgo(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

describe('topCategories7Days', () => {
  test('ritorna top categorie spesa ultimi 7 giorni', () => {
    const out = computeTopCategories7Days({
      transactions: [
        { amount: -30, type: 'expense', categoryName: 'Casa', date: daysAgo(1) },
        { amount: -70, type: 'expense', categoryName: 'Casa', date: daysAgo(2) },
        { amount: -50, type: 'expense', categoryName: 'Auto', date: daysAgo(3) },
        { amount: 500, type: 'income', categoryName: 'Stipendio', date: daysAgo(2) }
      ],
      parseDate,
      getAmount,
      getType,
      getCategoryName
    });
    expect(out.items.length).toBeGreaterThan(0);
    expect(out.items[0].category).toBe('Casa');
  });
});

