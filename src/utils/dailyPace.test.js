import { computeDailyPace } from './dailyPace';

describe('dailyPace', () => {
  test('ok quando proiezione entro target', () => {
    const out = computeDailyPace({
      monthlyIncome: 3000,
      monthlyExpenses: 900,
      targetSavingsRate: 0.2,
      now: new Date('2026-03-15T12:00:00Z')
    });
    expect(out.level).toBe('ok');
    expect(out.allowedDailySpend).toBeGreaterThan(0);
  });

  test('critical quando proiezione supera molto il target', () => {
    const out = computeDailyPace({
      monthlyIncome: 2000,
      monthlyExpenses: 1600,
      targetSavingsRate: 0.2,
      now: new Date('2026-03-10T12:00:00Z')
    });
    expect(out.level).toBe('critical');
  });
});

