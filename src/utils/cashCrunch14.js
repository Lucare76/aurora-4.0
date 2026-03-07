export function computeCashCrunch14(input = {}) {
  const totalBalance = Number(input.totalBalance) || 0;
  const burnRateDaily = Number(input.burnRateDaily) || 0;
  const dueSubscriptionsSoon = Array.isArray(input.dueSubscriptionsSoon) ? input.dueSubscriptionsSoon : [];

  const horizonDays = 14;
  const subs14 = dueSubscriptionsSoon
    .filter((s) => Number(s?.daysTo) >= 0 && Number(s?.daysTo) <= horizonDays)
    .reduce((sum, s) => sum + Math.abs(Number(s?.amount) || 0), 0);

  const projected = totalBalance + burnRateDaily * horizonDays - subs14;

  let level = 'ok';
  if (projected < 0) level = 'critical';
  else if (projected < totalBalance * 0.75) level = 'warn';

  const message =
    level === 'critical'
      ? 'Possibile carenza cassa entro 14 giorni.'
      : level === 'warn'
      ? 'Cassa in calo da monitorare.'
      : 'Cassa a breve termine stabile.';

  return {
    level,
    message,
    projected,
    subs14,
    burnRateDaily,
    horizonDays
  };
}

