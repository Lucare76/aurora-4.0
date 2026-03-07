const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export function computeMonthEndStress(input = {}) {
  const totalBalance = Number(input.totalBalance) || 0;
  const monthlyIncome = Math.max(0, Number(input.monthlyIncome) || 0);
  const monthlyExpenses = Math.max(0, Number(input.monthlyExpenses) || 0);
  const now = input.now instanceof Date ? input.now : new Date();

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const day = now.getDate();
  const elapsed = clamp(day, 1, daysInMonth);
  const remaining = Math.max(0, daysInMonth - elapsed);

  const avgIncomePerDay = monthlyIncome / elapsed;
  const avgExpensePerDay = monthlyExpenses / elapsed;
  const projectedIncomeRemaining = avgIncomePerDay * remaining;
  const projectedExpenseRemaining = avgExpensePerDay * remaining;
  const projectedNetRemaining = projectedIncomeRemaining - projectedExpenseRemaining;
  const projectedEndBalance = totalBalance + projectedNetRemaining;

  let level = 'ok';
  if (projectedEndBalance < 0) level = 'critical';
  else if (projectedEndBalance < totalBalance * 0.85) level = 'warn';

  const confidence = clamp(Math.round((elapsed / daysInMonth) * 100), 5, 100);
  const message =
    level === 'critical'
      ? 'Rischio chiusura mese in rosso.'
      : level === 'warn'
      ? 'Possibile calo liquidita a fine mese.'
      : 'Proiezione fine mese stabile.';

  return {
    level,
    message,
    elapsedDays: elapsed,
    remainingDays: remaining,
    confidence,
    projectedIncomeRemaining,
    projectedExpenseRemaining,
    projectedNetRemaining,
    projectedEndBalance
  };
}

