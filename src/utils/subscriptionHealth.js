const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export function computeSubscriptionHealth(input = {}) {
  const subscriptions = Array.isArray(input.subscriptions) ? input.subscriptions : [];
  const dueSubscriptionsSoon = Array.isArray(input.dueSubscriptionsSoon) ? input.dueSubscriptionsSoon : [];
  const overdueSubscriptions = Array.isArray(input.overdueSubscriptions) ? input.overdueSubscriptions : [];

  const active = subscriptions.filter((s) => s?.active !== false);
  const activeCount = active.length;
  const pausedCount = subscriptions.filter((s) => s?.active === false).length;
  const fixedCount = active.filter((s) => s?.kind === 'fixed').length;
  const recurringCount = Math.max(0, activeCount - fixedCount);

  let score = 100;
  score -= overdueSubscriptions.length * 20;
  score -= dueSubscriptionsSoon.filter((s) => Number(s?.daysTo) <= 2).length * 8;
  score -= dueSubscriptionsSoon.filter((s) => Number(s?.daysTo) > 2 && Number(s?.daysTo) <= 7).length * 4;
  if (activeCount === 0) score -= 10;
  const finalScore = Math.round(clamp(score, 0, 100));

  let level = 'ok';
  if (overdueSubscriptions.length >= 2 || finalScore < 50) level = 'critical';
  else if (finalScore < 75) level = 'warn';

  const message =
    level === 'critical'
      ? 'Gestione abbonamenti critica.'
      : level === 'warn'
      ? 'Alcuni abbonamenti richiedono attenzione.'
      : 'Gestione abbonamenti sotto controllo.';

  return {
    score: finalScore,
    level,
    message,
    activeCount,
    pausedCount,
    recurringCount,
    fixedCount,
    dueSoonCount: dueSubscriptionsSoon.length,
    overdueCount: overdueSubscriptions.length
  };
}
