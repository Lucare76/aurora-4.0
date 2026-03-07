import { computeCashCrunch14 } from './cashCrunch14';

describe('cashCrunch14', () => {
  test('critical con proiezione negativa', () => {
    const out = computeCashCrunch14({
      totalBalance: 100,
      burnRateDaily: -20,
      dueSubscriptionsSoon: [{ amount: 80, daysTo: 3 }]
    });
    expect(out.level).toBe('critical');
  });

  test('ok con cassa stabile', () => {
    const out = computeCashCrunch14({
      totalBalance: 2000,
      burnRateDaily: -5,
      dueSubscriptionsSoon: [{ amount: 20, daysTo: 2 }]
    });
    expect(out.level).toBe('ok');
  });
});

