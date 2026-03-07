const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export function computeLiquidityRadar(input = {}) {
  const totalBalance = Number(input.totalBalance) || 0;
  const monthlyExpenses = Math.max(0, Number(input.monthlyExpenses) || 0);
  const monthlyIncome = Math.max(0, Number(input.monthlyIncome) || 0);
  const dueSubscriptionsSoon = Array.isArray(input.dueSubscriptionsSoon) ? input.dueSubscriptionsSoon : [];
  const overdueSubscriptions = Array.isArray(input.overdueSubscriptions) ? input.overdueSubscriptions : [];
  const accounts = Array.isArray(input.accounts) ? input.accounts : [];

  const avgDailyExpense = monthlyExpenses / 30;
  const runwayDays = avgDailyExpense > 0 ? totalBalance / avgDailyExpense : 999;
  const upcomingSubsCost = dueSubscriptionsSoon.reduce((sum, s) => sum + Math.abs(Number(s?.amount) || 0), 0);
  const overdueSubsCost = overdueSubscriptions.reduce((sum, s) => sum + Math.abs(Number(s?.amount) || 0), 0);
  const reserveTarget = Math.max(monthlyExpenses * 1.5, monthlyIncome > 0 ? monthlyIncome * 0.5 : 0);
  const reserveRatio = reserveTarget > 0 ? totalBalance / reserveTarget : 1;

  let level = 'ok';
  if (runwayDays < 20 || reserveRatio < 0.65 || totalBalance < 0) level = 'critical';
  else if (runwayDays < 45 || reserveRatio < 1 || overdueSubscriptions.length > 0) level = 'warn';

  const atRiskAccounts = accounts
    .map((a) => {
      const b = Number(a?.balance) || 0;
      return { id: a?.id, name: a?.name || 'Conto', balance: b };
    })
    .filter((a) => a.balance < 0)
    .sort((a, b) => a.balance - b.balance)
    .slice(0, 3);

  const score = Math.round(clamp((reserveRatio * 60) + clamp(runwayDays, 0, 90) * 0.4, 0, 100));

  const tips = [];
  if (runwayDays < 30) {
    tips.push({
      id: 'reduce-burn',
      title: 'Riduci burn rate',
      detail: 'Taglia o posticipa le uscite non essenziali questa settimana.',
      cta: 'Apri Reports',
      menu: 'reports'
    });
  }
  if (overdueSubscriptions.length > 0 || dueSubscriptionsSoon.length > 0) {
    tips.push({
      id: 'subs-check',
      title: 'Rivedi abbonamenti',
      detail: `${overdueSubscriptions.length} scaduti, ${dueSubscriptionsSoon.length} in scadenza.`,
      cta: 'Apri Abbonamenti',
      menu: 'subscriptions'
    });
  }
  if (atRiskAccounts.length > 0) {
    tips.push({
      id: 'accounts-check',
      title: 'Conti in rosso',
      detail: `${atRiskAccounts.length} conto/i con saldo negativo.`,
      cta: 'Apri Conti',
      menu: 'accounts'
    });
  }
  if (tips.length === 0) {
    tips.push({
      id: 'liquidity-ok',
      title: 'Liquidita stabile',
      detail: 'Mantieni il ritmo e aggiorna regolarmente i movimenti.',
      cta: 'Apri Dashboard',
      menu: 'dashboard'
    });
  }

  return {
    score,
    level,
    runwayDays: Number.isFinite(runwayDays) ? runwayDays : 999,
    avgDailyExpense,
    reserveTarget,
    reserveRatio,
    upcomingSubsCost,
    overdueSubsCost,
    atRiskAccounts,
    tips: tips.slice(0, 3)
  };
}

