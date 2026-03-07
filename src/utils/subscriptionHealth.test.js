import { computeSubscriptionHealth } from './subscriptionHealth';

describe('subscriptionHealth', () => {
  test('critical con molti scaduti', () => {
    const out = computeSubscriptionHealth({
      subscriptions: [{ active: true }, { active: true }],
      dueSubscriptionsSoon: [{ daysTo: 1 }, { daysTo: 5 }],
      overdueSubscriptions: [{}, {}]
    });
    expect(out.level).toBe('critical');
    expect(out.score).toBeLessThan(50);
  });

  test('ok quando non ci sono urgenze', () => {
    const out = computeSubscriptionHealth({
      subscriptions: [{ active: true, kind: 'fixed' }, { active: false }],
      dueSubscriptionsSoon: [],
      overdueSubscriptions: []
    });
    expect(out.level).toBe('ok');
  });
});

