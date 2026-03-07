export function computeEmergencyFundCoverage(input = {}) {
  const totalBalance = Number(input.totalBalance) || 0;
  const monthlyExpenses = Math.max(0, Number(input.monthlyExpenses) || 0);

  const monthsCovered = monthlyExpenses > 0 ? totalBalance / monthlyExpenses : 0;
  const targetMonths = 6;
  const gapMonths = Math.max(0, targetMonths - monthsCovered);

  let level = 'ok';
  if (monthsCovered < 2) level = 'critical';
  else if (monthsCovered < 4) level = 'warn';

  const message =
    level === 'critical'
      ? 'Copertura emergenza bassa.'
      : level === 'warn'
      ? 'Copertura emergenza media.'
      : 'Copertura emergenza solida.';

  return {
    level,
    message,
    monthsCovered,
    targetMonths,
    gapMonths
  };
}

