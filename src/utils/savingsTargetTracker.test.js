import { computeSavingsTargetTracker } from './savingsTargetTracker';

describe('savingsTargetTracker', () => {
  test('ok quando target raggiunto', () => {
    const out = computeSavingsTargetTracker({
      monthlyIncome: 3000,
      monthlyExpenses: 2200,
      savingsTargetType: 'amount',
      savingsTargetAmount: 500,
      now: new Date('2026-03-20T12:00:00Z')
    });
    expect(out.level).toBe('ok');
    expect(out.currentSavings).toBeGreaterThanOrEqual(out.targetSavings);
  });

  test('warn/critical quando sotto target', () => {
    const out = computeSavingsTargetTracker({
      monthlyIncome: 2000,
      monthlyExpenses: 1900,
      savingsTargetType: 'percent',
      savingsTargetPercent: 20,
      now: new Date('2026-03-10T12:00:00Z')
    });
    expect(['warn', 'critical']).toContain(out.level);
  });
});

