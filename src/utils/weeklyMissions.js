export function buildWeeklyMissions(input = {}) {
  const monthlyUncategorizedCount = Math.max(0, Number(input.monthlyUncategorizedCount) || 0);
  const overdueSubscriptions = Array.isArray(input.overdueSubscriptions) ? input.overdueSubscriptions : [];
  const dueSubscriptionsSoon = Array.isArray(input.dueSubscriptionsSoon) ? input.dueSubscriptionsSoon : [];
  const burnRateDaily = Number(input.burnRateDaily) || 0;
  const budgetAlerts = Array.isArray(input.budgetAlerts) ? input.budgetAlerts : [];

  const missions = [];

  if (monthlyUncategorizedCount > 0) {
    missions.push({
      id: 'categorize',
      title: 'Categorizza movimenti',
      detail: `${monthlyUncategorizedCount} transazioni senza categoria`,
      cta: 'Apri Transazioni',
      menu: 'transactions',
      priority: 100
    });
  }

  if (overdueSubscriptions.length > 0 || dueSubscriptionsSoon.length > 0) {
    missions.push({
      id: 'subscriptions',
      title: 'Rivedi abbonamenti',
      detail:
        overdueSubscriptions.length > 0
          ? `${overdueSubscriptions.length} abbonamenti scaduti`
          : `${dueSubscriptionsSoon.length} abbonamenti in scadenza`,
      cta: 'Apri Abbonamenti',
      menu: 'subscriptions',
      priority: overdueSubscriptions.length > 0 ? 95 : 75
    });
  }

  const riskyBudgets = budgetAlerts.filter((a) => a.level === 'over' || a.level === 'danger' || a.level === 'warn');
  if (riskyBudgets.length > 0) {
    missions.push({
      id: 'budgets',
      title: 'Controlla budget',
      detail: `${riskyBudgets.length} categorie vicine o oltre soglia`,
      cta: 'Apri Budget',
      menu: 'budgets',
      priority: 85
    });
  }

  if (burnRateDaily < 0) {
    missions.push({
      id: 'burn',
      title: 'Riduci burn rate',
      detail: `Netto medio giorno: ${burnRateDaily.toFixed(2)}`,
      cta: 'Apri Report',
      menu: 'reports',
      priority: burnRateDaily < -20 ? 92 : 72
    });
  }

  if (missions.length === 0) {
    missions.push({
      id: 'keep',
      title: 'Mantieni il ritmo',
      detail: 'Nessuna urgenza rilevata questa settimana',
      cta: 'Apri Dashboard',
      menu: 'dashboard',
      priority: 10
    });
  }

  missions.sort((a, b) => b.priority - a.priority);
  return missions.slice(0, 3);
}

