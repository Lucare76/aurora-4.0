import { computeSubscriptionBurden } from './subscriptionBurden';

describe('subscriptionBurden', () => {
  test('warn/critical quando quota alta', () => {
    const out = computeSubscriptionBurden({
      monthlyIncome: 1000,
      subscriptions: [
        { amount: 120, active: true },
        { amount: 90, active: true },
        { amount: 40, active: true }
      ]
    });
    expect(['warn', 'critical']).toContain(out.level);
    expect(out.monthlyTotal).toBe(250);
  });

  test('ok con quota bassa', () => {
    const out = computeSubscriptionBurden({
      monthlyIncome: 3000,
      subscriptions: [{ amount: 40, active: true }]
    });
    expect(out.level).toBe('ok');
  });
});

