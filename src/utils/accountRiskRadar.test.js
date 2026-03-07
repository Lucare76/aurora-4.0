import { computeAccountRiskRadar } from './accountRiskRadar';

const parseDate = (v) => new Date(v);
const getAmount = (t) => Number(t.amount) || 0;

function daysAgo(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

describe('accountRiskRadar', () => {
  test('identifica conto critico con proiezione negativa', () => {
    const out = computeAccountRiskRadar({
      accounts: [{ id: 'a1', name: 'Carta', balance: 100 }],
      transactions: [{ accountId: 'a1', amount: -500, date: daysAgo(2) }],
      parseDate,
      getAmount
    });
    expect(out.total).toBe(1);
    expect(out.items[0].level).toBe('critical');
  });

  test('nessun rischio con saldo stabile', () => {
    const out = computeAccountRiskRadar({
      accounts: [{ id: 'a1', name: 'Main', balance: 2000 }],
      transactions: [{ accountId: 'a1', amount: 100, date: daysAgo(3) }],
      parseDate,
      getAmount
    });
    expect(out.total).toBe(0);
  });
});

