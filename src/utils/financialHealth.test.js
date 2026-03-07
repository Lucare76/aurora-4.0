import { computeFinancialHealth } from './financialHealth';

describe('computeFinancialHealth', () => {
  test('restituisce score alto con situazione sana', () => {
    const out = computeFinancialHealth({
      monthlyIncome: 4000,
      monthlyExpenses: 2200,
      monthlyUncategorizedCount: 0,
      totalBalance: 15000,
      savingsProgress: 0.85,
      budgetAlerts: [],
      dueSubscriptionsSoon: [],
      overdueSubscriptions: []
    });
    expect(out.score).toBeGreaterThanOrEqual(75);
    expect(out.level).toBe('excellent');
    expect(out.missions.length).toBeGreaterThan(0);
  });

  test('restituisce score basso con rischi multipli', () => {
    const out = computeFinancialHealth({
      monthlyIncome: 1500,
      monthlyExpenses: 2400,
      monthlyUncategorizedCount: 5,
      totalBalance: -300,
      savingsProgress: 0.1,
      budgetAlerts: [{ level: 'over' }, { level: 'warn' }, { level: 'danger' }],
      dueSubscriptionsSoon: [{}, {}],
      overdueSubscriptions: [{}, {}]
    });
    expect(out.score).toBeLessThan(40);
    expect(['watch', 'critical']).toContain(out.level);
    expect(out.missions.some((m) => m.id === 'reduce-expenses')).toBe(true);
  });
});

