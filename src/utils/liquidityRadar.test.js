import { computeLiquidityRadar } from './liquidityRadar';

describe('liquidityRadar', () => {
  test('stato ok con buona riserva', () => {
    const out = computeLiquidityRadar({
      totalBalance: 12000,
      monthlyExpenses: 2200,
      monthlyIncome: 3200,
      dueSubscriptionsSoon: [],
      overdueSubscriptions: [],
      accounts: [{ id: 'a1', name: 'Main', balance: 12000 }]
    });
    expect(out.level).toBe('ok');
    expect(out.score).toBeGreaterThan(60);
  });

  test('stato critical con runway basso e saldo negativo', () => {
    const out = computeLiquidityRadar({
      totalBalance: -200,
      monthlyExpenses: 1800,
      monthlyIncome: 1200,
      dueSubscriptionsSoon: [{ amount: 20 }],
      overdueSubscriptions: [{ amount: 35 }],
      accounts: [{ id: 'a1', name: 'Card', balance: -200 }]
    });
    expect(out.level).toBe('critical');
    expect(out.tips.length).toBeGreaterThan(0);
    expect(out.atRiskAccounts.length).toBe(1);
  });
});

