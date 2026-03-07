export function computeSubscriptionBurden(input = {}) {
  const subscriptions = Array.isArray(input.subscriptions) ? input.subscriptions : [];
  const monthlyIncome = Math.max(0, Number(input.monthlyIncome) || 0);

  const active = subscriptions.filter((s) => s?.active !== false);
  const monthlyTotal = active.reduce((sum, s) => sum + Math.abs(Number(s?.amount) || 0), 0);
  const burdenPct = monthlyIncome > 0 ? (monthlyTotal / monthlyIncome) * 100 : 0;

  let level = 'ok';
  if (burdenPct >= 25) level = 'critical';
  else if (burdenPct >= 15) level = 'warn';

  const message =
    level === 'critical'
      ? 'Peso abbonamenti elevato sulle entrate.'
      : level === 'warn'
      ? 'Peso abbonamenti da monitorare.'
      : 'Peso abbonamenti sotto controllo.';

  return {
    level,
    message,
    activeCount: active.length,
    monthlyTotal,
    burdenPct
  };
}

