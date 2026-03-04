import { projectScenario } from './scenarioForecast';

describe('projectScenario', () => {
  it('projects income/expenses and net with percentage shifts', () => {
    const result = projectScenario({
      income: 3000,
      expenses: 2000,
      incomeShiftPct: 10,
      expenseShiftPct: 5
    });

    expect(result.projectedIncome).toBeCloseTo(3300, 2);
    expect(result.projectedExpenses).toBeCloseTo(2100, 2);
    expect(result.projectedNet).toBeCloseTo(1200, 2);
    expect(result.deltaNet).toBeCloseTo(200, 2);
  });
});

