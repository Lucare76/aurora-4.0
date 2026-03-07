const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export function computeDailyPace(input = {}) {
  const monthlyIncome = Math.max(0, Number(input.monthlyIncome) || 0);
  const monthlyExpenses = Math.max(0, Number(input.monthlyExpenses) || 0);
  const now = input.now instanceof Date ? input.now : new Date();
  const targetSavingsRate = clamp(Number(input.targetSavingsRate) || 0.2, 0, 0.9);

  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const day = clamp(now.getDate(), 1, daysInMonth);
  const remainingDays = Math.max(0, daysInMonth - day);

  const expensePerDayCurrent = monthlyExpenses / day;
  const projectedExpense = expensePerDayCurrent * daysInMonth;

  const targetSavings = monthlyIncome * targetSavingsRate;
  const targetExpenseCeiling = Math.max(0, monthlyIncome - targetSavings);
  const remainingExpenseBudget = Math.max(0, targetExpenseCeiling - monthlyExpenses);
  const allowedDailySpend = remainingDays > 0 ? remainingExpenseBudget / remainingDays : 0;

  let level = 'ok';
  if (projectedExpense > targetExpenseCeiling * 1.15) level = 'critical';
  else if (projectedExpense > targetExpenseCeiling) level = 'warn';

  const message =
    level === 'critical'
      ? 'Ritmo spese troppo alto rispetto al target.'
      : level === 'warn'
      ? 'Ritmo spese sopra il target, da monitorare.'
      : 'Ritmo spese in linea con il target.';

  return {
    level,
    message,
    daysInMonth,
    day,
    remainingDays,
    targetSavings,
    targetExpenseCeiling,
    remainingExpenseBudget,
    allowedDailySpend,
    projectedExpense
  };
}

