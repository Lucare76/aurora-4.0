import { computeWeeklyPulse } from './weeklyPulse';

const parseDate = (v) => new Date(v);
const getAmount = (t) => Number(t.amount) || 0;
const getType = (t) => t.type || (getAmount(t) >= 0 ? 'income' : 'expense');

function daysAgo(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

describe('weeklyPulse', () => {
  test('warn quando spese aumentano molto', () => {
    const tx = [
      { id: 'p1', type: 'expense', amount: -100, date: daysAgo(10) },
      { id: 'p2', type: 'expense', amount: -120, date: daysAgo(8) },
      { id: 'l1', type: 'expense', amount: -220, date: daysAgo(2) },
      { id: 'l2', type: 'expense', amount: -180, date: daysAgo(1) },
      { id: 'i1', type: 'income', amount: 500, date: daysAgo(0) }
    ];
    const out = computeWeeklyPulse({ transactions: tx, parseDate, getAmount, getType });
    expect(['warn', 'critical']).toContain(out.level);
    expect(out.delta.expense).toBeGreaterThan(0);
  });

  test('ok con trend stabile', () => {
    const tx = [
      { id: 'a', type: 'income', amount: 600, date: daysAgo(2) },
      { id: 'b', type: 'expense', amount: -200, date: daysAgo(1) },
      { id: 'c', type: 'income', amount: 580, date: daysAgo(9) },
      { id: 'd', type: 'expense', amount: -210, date: daysAgo(11) }
    ];
    const out = computeWeeklyPulse({ transactions: tx, parseDate, getAmount, getType });
    expect(out.level).toBe('ok');
  });
});

