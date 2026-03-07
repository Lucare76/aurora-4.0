export function computeSavingsTargetTracker(input = {}) {
  const monthlyIncome = Math.max(0, Number(input.monthlyIncome) || 0);
  const monthlyExpenses = Math.max(0, Number(input.monthlyExpenses) || 0);
  const savingsTargetType = input.savingsTargetType || 'percent';
  const savingsTargetPercent = Math.max(0, Number(input.savingsTargetPercent) || 0);
  const savingsTargetAmount = Math.max(0, Number(input.savingsTargetAmount) || 0);
  const now = input.now instanceof Date ? input.now : new Date();

  const currentSavings = monthlyIncome - monthlyExpenses;
  const targetSavings =
    savingsTargetType === 'amount'
      ? savingsTargetAmount
      : monthlyIncome > 0
      ? (monthlyIncome * savingsTargetPercent) / 100
      : 0;

  const progress = targetSavings > 0 ? currentSavings / targetSavings : 0;

  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const elapsedDays = Math.max(1, now.getDate());
  const remainingDays = Math.max(0, daysInMonth - elapsedDays);
  const remainingToTarget = Math.max(0, targetSavings - currentSavings);
  const requiredDailySavings = remainingDays > 0 ? remainingToTarget / remainingDays : remainingToTarget;

  let level = 'ok';
  if (targetSavings > 0 && progress < 0.6) level = 'critical';
  else if (targetSavings > 0 && progress < 1) level = 'warn';

  const message =
    targetSavings <= 0
      ? 'Target risparmio non impostato.'
      : level === 'critical'
      ? 'Ritmo risparmio sotto target.'
      : level === 'warn'
      ? 'Target quasi raggiunto.'
      : 'Target risparmio raggiunto.';

  return {
    level,
    message,
    currentSavings,
    targetSavings,
    progress,
    remainingToTarget,
    requiredDailySavings
  };
}

