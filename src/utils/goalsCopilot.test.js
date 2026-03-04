import { buildGoalsCopilotPlan } from './goalsCopilot';

describe('buildGoalsCopilotPlan', () => {
  it('selects most urgent goal and suggests amount', () => {
    const in60Days = new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString();
    const in180Days = new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString();
    const plan = buildGoalsCopilotPlan({
      monthlyIncome: 3000,
      savingsRatePct: 10,
      goals: [
        { id: 'g1', name: 'Vacanza', targetAmount: 1200, currentAmount: 200, deadline: in180Days },
        { id: 'g2', name: 'Auto', targetAmount: 1000, currentAmount: 100, deadline: in60Days }
      ]
    });

    expect(plan.topGoal?.id).toBe('g2');
    expect(plan.monthlyBudget).toBeCloseTo(300, 2);
    expect(plan.suggestionAmount).toBeGreaterThan(0);
  });
});

