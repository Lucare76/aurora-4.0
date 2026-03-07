import { computeTransactionAnomalies } from './transactionAnomalies';

const parseDate = (v) => new Date(v);
const getAmount = (t) => Number(t.amount) || 0;
const getType = (t) => t.type || (getAmount(t) >= 0 ? 'income' : 'expense');
const getCategoryName = (t) => t.categoryName || t.category || 'Senza categoria';
const getAccountName = (t) => t.accountName || 'Conto';

describe('transaction anomalies', () => {
  test('identifica duplicati nello stesso giorno', () => {
    const tx = [
      { id: '1', description: 'Netflix', amount: -12.99, date: '2026-03-01', type: 'expense', categoryName: 'Abbonamenti', accountName: 'Carta' },
      { id: '2', description: 'Netflix', amount: -12.99, date: '2026-03-01', type: 'expense', categoryName: 'Abbonamenti', accountName: 'Carta' }
    ];
    const out = computeTransactionAnomalies({ transactions: tx, parseDate, getAmount, getType, getCategoryName, getAccountName });
    expect(out.total).toBe(1);
    expect(out.items[0].kind).toBe('duplicate');
  });

  test('identifica spike su categoria con storico sufficiente', () => {
    const tx = [
      { id: 'a1', description: 'Spesa 1', amount: -20, date: '2026-03-01', type: 'expense', categoryName: 'Casa' },
      { id: 'a2', description: 'Spesa 2', amount: -22, date: '2026-03-05', type: 'expense', categoryName: 'Casa' },
      { id: 'a3', description: 'Spesa 3', amount: -18, date: '2026-03-10', type: 'expense', categoryName: 'Casa' },
      { id: 'a4', description: 'Spesa 4', amount: -21, date: '2026-03-12', type: 'expense', categoryName: 'Casa' },
      { id: 'a5', description: 'Spesa alta', amount: -120, date: '2026-03-20', type: 'expense', categoryName: 'Casa' }
    ];
    const out = computeTransactionAnomalies({ transactions: tx, parseDate, getAmount, getType, getCategoryName, getAccountName });
    expect(out.items.some((i) => i.kind === 'spike')).toBe(true);
  });
});

