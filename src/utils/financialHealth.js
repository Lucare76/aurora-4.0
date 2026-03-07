const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function computeFinancialHealth(input = {}) {
  const monthlyIncome = Math.max(0, Number(input.monthlyIncome) || 0);
  const monthlyExpenses = Math.max(0, Number(input.monthlyExpenses) || 0);
  const monthlyUncategorizedCount = Math.max(0, Number(input.monthlyUncategorizedCount) || 0);
  const totalBalance = Number(input.totalBalance) || 0;
  const savingsProgress = clamp(Number(input.savingsProgress) || 0, 0, 1);
  const budgetAlerts = Array.isArray(input.budgetAlerts) ? input.budgetAlerts : [];
  const dueSubscriptionsSoon = Array.isArray(input.dueSubscriptionsSoon) ? input.dueSubscriptionsSoon : [];
  const overdueSubscriptions = Array.isArray(input.overdueSubscriptions) ? input.overdueSubscriptions : [];

  let score = 50;

  const savingsRate = monthlyIncome > 0 ? (monthlyIncome - monthlyExpenses) / monthlyIncome : 0;
  score += clamp(savingsRate * 45, -25, 25);
  score += clamp((totalBalance / 20000) * 10, -8, 8);
  score += clamp((savingsProgress - 0.5) * 20, -10, 10);

  const dangerBudgets = budgetAlerts.filter((b) => b.level === 'over' || b.level === 'danger').length;
  const warningBudgets = budgetAlerts.filter((b) => b.level === 'warn').length;
  score -= dangerBudgets * 6;
  score -= warningBudgets * 3;
  score -= Math.min(15, monthlyUncategorizedCount * 2);
  score -= Math.min(12, overdueSubscriptions.length * 4);
  score -= Math.min(6, dueSubscriptionsSoon.length);

  const finalScore = Math.round(clamp(score, 0, 100));
  const level = finalScore >= 75 ? 'excellent' : finalScore >= 55 ? 'good' : finalScore >= 35 ? 'watch' : 'critical';
  const label =
    level === 'excellent'
      ? 'Ottima'
      : level === 'good'
      ? 'Buona'
      : level === 'watch'
      ? 'Da monitorare'
      : 'Critica';

  const missions = [];
  if (monthlyIncome > 0 && monthlyExpenses > monthlyIncome) {
    missions.push({
      id: 'reduce-expenses',
      title: 'Riduci spese del mese',
      detail: 'Le uscite superano le entrate correnti.',
      cta: 'Apri Reports',
      menu: 'reports',
      priority: 100
    });
  }
  if (dangerBudgets > 0 || warningBudgets > 0) {
    missions.push({
      id: 'check-budgets',
      title: 'Rivedi i budget a rischio',
      detail: `${dangerBudgets + warningBudgets} categorie oltre soglia.`,
      cta: 'Apri Budget',
      menu: 'budgets',
      priority: 90
    });
  }
  if (monthlyUncategorizedCount > 0) {
    missions.push({
      id: 'categorize',
      title: 'Completa la categorizzazione',
      detail: `${monthlyUncategorizedCount} transazioni senza categoria.`,
      cta: 'Apri Transazioni',
      menu: 'transactions',
      filter: 'uncategorized',
      priority: 80
    });
  }
  if (overdueSubscriptions.length > 0 || dueSubscriptionsSoon.length > 0) {
    missions.push({
      id: 'subscriptions',
      title: 'Controlla abbonamenti',
      detail:
        overdueSubscriptions.length > 0
          ? `${overdueSubscriptions.length} scaduti da risolvere.`
          : `${dueSubscriptionsSoon.length} in scadenza a breve.`,
      cta: 'Apri Abbonamenti',
      menu: 'subscriptions',
      priority: 70
    });
  }
  if (missions.length === 0) {
    missions.push({
      id: 'maintain',
      title: 'Mantieni il ritmo',
      detail: 'Nessuna urgenza: aggiorna movimenti e obiettivi.',
      cta: 'Apri Dashboard',
      menu: 'dashboard',
      priority: 10
    });
  }

  missions.sort((a, b) => b.priority - a.priority);

  return {
    score: finalScore,
    level,
    label,
    savingsRatePct: Math.round(savingsRate * 1000) / 10,
    missions: missions.slice(0, 3),
    riskCount: dangerBudgets + warningBudgets + overdueSubscriptions.length + monthlyUncategorizedCount
  };
}

