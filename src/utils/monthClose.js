export function buildMonthCloseChecklist(input = {}) {
  const monthlyIncome = Math.max(0, Number(input.monthlyIncome) || 0);
  const monthlyExpenses = Math.max(0, Number(input.monthlyExpenses) || 0);
  const monthlySavings = Number(input.monthlySavings) || monthlyIncome - monthlyExpenses;
  const uncategorizedCount = Math.max(0, Number(input.monthlyUncategorizedCount) || 0);
  const budgetAlerts = Array.isArray(input.budgetAlerts) ? input.budgetAlerts : [];
  const dueSubscriptionsSoon = Array.isArray(input.dueSubscriptionsSoon) ? input.dueSubscriptionsSoon : [];
  const overdueSubscriptions = Array.isArray(input.overdueSubscriptions) ? input.overdueSubscriptions : [];

  const criticalBudgets = budgetAlerts.filter((b) => b.level === 'over' || b.level === 'danger').length;
  const warningBudgets = budgetAlerts.filter((b) => b.level === 'warn').length;

  const checks = [
    {
      id: 'categorization',
      title: 'Categorizzazione completa',
      status: uncategorizedCount === 0 ? 'ok' : 'warn',
      detail:
        uncategorizedCount === 0
          ? 'Nessuna transazione senza categoria nel mese.'
          : `${uncategorizedCount} transazioni da categorizzare.`
    },
    {
      id: 'budget-control',
      title: 'Controllo budget',
      status: criticalBudgets === 0 ? (warningBudgets === 0 ? 'ok' : 'warn') : 'critical',
      detail:
        criticalBudgets > 0
          ? `${criticalBudgets} budget critici oltre soglia.`
          : warningBudgets > 0
          ? `${warningBudgets} budget in attenzione.`
          : 'Nessun budget in stato di rischio.'
    },
    {
      id: 'subscriptions',
      title: 'Abbonamenti verificati',
      status: overdueSubscriptions.length > 0 ? 'critical' : dueSubscriptionsSoon.length > 0 ? 'warn' : 'ok',
      detail:
        overdueSubscriptions.length > 0
          ? `${overdueSubscriptions.length} abbonamenti scaduti da gestire.`
          : dueSubscriptionsSoon.length > 0
          ? `${dueSubscriptionsSoon.length} abbonamenti in scadenza a breve.`
          : 'Nessun abbonamento in scadenza imminente.'
    },
    {
      id: 'cashflow',
      title: 'Cashflow mensile',
      status: monthlySavings >= 0 ? 'ok' : 'critical',
      detail:
        monthlySavings >= 0
          ? `Risparmio netto positivo: ${monthlySavings.toFixed(2)}`
          : `Deficit mensile: ${Math.abs(monthlySavings).toFixed(2)}`
    }
  ];

  const hasCritical = checks.some((c) => c.status === 'critical');
  const hasWarnings = checks.some((c) => c.status === 'warn');
  const overall = hasCritical ? 'critical' : hasWarnings ? 'warn' : 'ok';

  return {
    checks,
    overall,
    summary: {
      income: monthlyIncome,
      expenses: monthlyExpenses,
      savings: monthlySavings,
      uncategorizedCount,
      criticalBudgets,
      warningBudgets,
      dueSubscriptionsSoon: dueSubscriptionsSoon.length,
      overdueSubscriptions: overdueSubscriptions.length
    }
  };
}

export function buildMonthCloseSnapshot(input = {}) {
  const now = new Date();
  const month = String(input.month || now.getMonth() + 1).padStart(2, '0');
  const year = Number(input.year || now.getFullYear());
  const checklist = buildMonthCloseChecklist(input);
  return {
    kind: 'aurora-month-close',
    generatedAt: now.toISOString(),
    period: `${year}-${month}`,
    userId: input.userId || null,
    currency: input.currency || 'EUR',
    checklist
  };
}

