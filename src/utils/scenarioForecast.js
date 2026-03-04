export function projectScenario({
  income = 0,
  expenses = 0,
  incomeShiftPct = 0,
  expenseShiftPct = 0
} = {}) {
  const baseIncome = Math.max(0, Number(income) || 0);
  const baseExpenses = Math.max(0, Number(expenses) || 0);
  const incPct = Number(incomeShiftPct) || 0;
  const expPct = Number(expenseShiftPct) || 0;

  const projectedIncome = baseIncome * (1 + incPct / 100);
  const projectedExpenses = baseExpenses * (1 + expPct / 100);
  const projectedNet = projectedIncome - projectedExpenses;
  const baselineNet = baseIncome - baseExpenses;

  return {
    projectedIncome,
    projectedExpenses,
    projectedNet,
    deltaNet: projectedNet - baselineNet
  };
}

