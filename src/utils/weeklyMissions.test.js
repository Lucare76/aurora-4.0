import { buildWeeklyMissions } from './weeklyMissions';

describe('weeklyMissions', () => {
  test('crea missioni in base ai rischi', () => {
    const out = buildWeeklyMissions({
      monthlyUncategorizedCount: 2,
      overdueSubscriptions: [{ id: 1 }],
      dueSubscriptionsSoon: [],
      burnRateDaily: -15,
      budgetAlerts: [{ level: 'warn' }]
    });
    expect(out.length).toBeGreaterThan(0);
    expect(out.some((m) => m.id === 'categorize')).toBe(true);
  });
});

