import { computePriorityGoal } from './goalsPriority';

describe('goalsPriority', () => {
  test('ritorna no goal quando lista vuota', () => {
    const out = computePriorityGoal({ goals: [] });
    expect(out.hasGoal).toBe(false);
    expect(out.level).toBe('ok');
  });

  test('seleziona obiettivo prioritario e suggerisce rata mensile', () => {
    const out = computePriorityGoal({
      monthlySavings: 120,
      goals: [
        {
          id: 'g1',
          name: 'Vacanza',
          targetAmount: 1200,
          currentAmount: 200,
          deadline: new Date(Date.now() + 100 * 86400000).toISOString()
        }
      ]
    });
    expect(out.hasGoal).toBe(true);
    expect(out.topGoal?.name).toBe('Vacanza');
    expect(out.suggestedMonthly).toBeGreaterThan(0);
  });
});

