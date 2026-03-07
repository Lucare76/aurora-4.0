const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export function computeIncomeRunRate(input = {}) {
  const monthlyIncome = Math.max(0, Number(input.monthlyIncome) || 0);
  const targetIncome = Math.max(0, Number(input.targetIncome) || 0);
  const now = input.now instanceof Date ? input.now : new Date();

  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const day = clamp(now.getDate(), 1, daysInMonth);

  const incomePerDay = monthlyIncome / day;
  const projectedIncome = incomePerDay * daysInMonth;
  const gapToTarget = targetIncome > 0 ? targetIncome - projectedIncome : 0;

  let level = 'ok';
  if (targetIncome > 0 && projectedIncome < targetIncome * 0.85) level = 'critical';
  else if (targetIncome > 0 && projectedIncome < targetIncome) level = 'warn';

  const message =
    targetIncome <= 0
      ? 'Target entrate non impostato.'
      : level === 'critical'
      ? 'Run-rate entrate molto sotto target.'
      : level === 'warn'
      ? 'Run-rate entrate leggermente sotto target.'
      : 'Run-rate entrate in linea con il target.';

  return {
    level,
    message,
    daysInMonth,
    elapsedDays: day,
    incomePerDay,
    projectedIncome,
    targetIncome,
    gapToTarget
  };
}

