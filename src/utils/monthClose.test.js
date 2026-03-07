import { buildMonthCloseChecklist, buildMonthCloseSnapshot } from './monthClose';

describe('monthClose utils', () => {
  test('checklist OK quando non ci sono rischi', () => {
    const out = buildMonthCloseChecklist({
      monthlyIncome: 3000,
      monthlyExpenses: 2200,
      monthlyUncategorizedCount: 0,
      budgetAlerts: [],
      dueSubscriptionsSoon: [],
      overdueSubscriptions: []
    });
    expect(out.overall).toBe('ok');
    expect(out.checks.every((c) => c.status === 'ok')).toBe(true);
  });

  test('checklist CRITICAL con deficit e abbonamenti scaduti', () => {
    const out = buildMonthCloseChecklist({
      monthlyIncome: 1400,
      monthlyExpenses: 2100,
      monthlyUncategorizedCount: 3,
      budgetAlerts: [{ level: 'danger' }],
      dueSubscriptionsSoon: [{}],
      overdueSubscriptions: [{}, {}]
    });
    expect(out.overall).toBe('critical');
    expect(out.checks.some((c) => c.status === 'critical')).toBe(true);
  });

  test('snapshot include periodo e checklist', () => {
    const snap = buildMonthCloseSnapshot({
      year: 2026,
      month: 3,
      userId: 'u1',
      currency: 'EUR',
      monthlyIncome: 1000,
      monthlyExpenses: 900
    });
    expect(snap.kind).toBe('aurora-month-close');
    expect(snap.period).toBe('2026-03');
    expect(snap.userId).toBe('u1');
    expect(snap.checklist).toBeTruthy();
  });
});

