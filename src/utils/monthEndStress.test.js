import { computeMonthEndStress } from './monthEndStress';

describe('monthEndStress', () => {
  test('ok con proiezione positiva', () => {
    const out = computeMonthEndStress({
      totalBalance: 5000,
      monthlyIncome: 3000,
      monthlyExpenses: 1800,
      now: new Date('2026-03-20T12:00:00Z')
    });
    expect(out.level).toBe('ok');
    expect(out.projectedEndBalance).toBeGreaterThan(0);
  });

  test('critical con proiezione negativa', () => {
    const out = computeMonthEndStress({
      totalBalance: 200,
      monthlyIncome: 800,
      monthlyExpenses: 2200,
      now: new Date('2026-03-10T12:00:00Z')
    });
    expect(out.level).toBe('critical');
    expect(out.projectedEndBalance).toBeLessThan(0);
  });
});

