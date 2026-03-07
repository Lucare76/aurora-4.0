export const DASHBOARD_SECTIONS = [
  { id: 'header', label: 'Buongiorno', required: true },
  { id: 'financial', label: 'Saldo totale + Cash Flow', required: true },
  { id: 'story', label: 'Story del mese', required: true },
  { id: 'monthClose', label: 'Assistente chiusura mese', required: false },
  { id: 'anomalies', label: 'Anomalie transazioni', required: false },
  { id: 'liquidityRadar', label: 'Radar liquidita', required: false },
  { id: 'weeklyPulse', label: 'Pulse settimanale', required: false },
  { id: 'agenda14', label: 'Agenda 14 giorni', required: false },
  { id: 'monthEndStress', label: 'Stress test fine mese', required: false },
  { id: 'goalsPriority', label: 'Obiettivo prioritario', required: false },
  { id: 'dataQuality', label: 'Qualita dati', required: false },
  { id: 'accountRisk', label: 'Conti a rischio', required: false },
  { id: 'dailyPace', label: 'Pace giornaliero spese', required: false },
  { id: 'incomeRunRate', label: 'Stato entrate', required: false },
  { id: 'trend14', label: 'Trend 14 giorni', required: false },
  { id: 'topCategories7', label: 'Top categorie 7 giorni', required: false },
  { id: 'weekendSpend', label: 'Weekend spend alert', required: false },
  { id: 'subscriptionBurden', label: 'Peso abbonamenti', required: false },
  { id: 'noSpend', label: 'No-spend streak', required: false },
  { id: 'burnRate7', label: 'Burn rate 7 giorni', required: false },
  { id: 'weeklyMissions', label: 'Missioni settimanali', required: false },
  { id: 'incomeConcentration', label: 'Concentrazione entrate', required: false },
  { id: 'cashCrunch14', label: 'Rischio cassa 14 giorni', required: false },
  { id: 'expenseVolatility', label: 'Variabilita spese 30g', required: false },
  { id: 'savingsTarget', label: 'Obiettivo risparmio mese', required: false },
  { id: 'commitments30', label: 'Impegni 30 giorni', required: false },
  { id: 'dailySpike', label: 'Picco spesa giornaliera', required: false },
  { id: 'rolling30', label: 'Confronto 30g vs 30g', required: false },
  { id: 'emergencyFund', label: 'Copertura fondo emergenza', required: false },
  { id: 'categorizationScore', label: 'Indice categorizzazione 30g', required: false },
  { id: 'spendingMomentum', label: 'Momentum spese 7g', required: false },
  { id: 'subscriptionHealth', label: 'Salute abbonamenti', required: false },
  { id: 'focusToday', label: 'Focus Oggi', required: false },
  { id: 'subscriptionsDue', label: 'Abbonamenti in scadenza', required: false },
  { id: 'subscriptionsOverdue', label: 'Abbonamenti scaduti', required: false },
  { id: 'smartInsights', label: 'Insights intelligenti', required: false },
  { id: 'forecast', label: 'Forecast 30/60/90 giorni', required: false },
  { id: 'insightsBase', label: 'Insights (card standard)', required: false },
  { id: 'top5', label: 'Top 5 spese & entrate', required: false },
  { id: 'budgetAlerts', label: 'Alert Budget', required: false },
  { id: 'actions', label: 'Azioni consigliate oggi', required: false },
  { id: 'birthdays', label: 'Prossimi compleanni', required: false }
];

export const DASHBOARD_ORDER_DEFAULT = DASHBOARD_SECTIONS.map((s) => s.id);
export const FIXED_SECTION_IDS = DASHBOARD_SECTIONS.filter((s) => s.required).map((s) => s.id);
export const OPTIONAL_SECTION_IDS = DASHBOARD_SECTIONS.filter((s) => !s.required).map((s) => s.id);

export const DASHBOARD_VISIBILITY_FIELDS = {
  subscriptionsDue: 'dashboardShowSubscriptionsDue',
  monthClose: 'dashboardShowMonthClose',
  anomalies: 'dashboardShowAnomalies',
  liquidityRadar: 'dashboardShowLiquidityRadar',
  weeklyPulse: 'dashboardShowWeeklyPulse',
  agenda14: 'dashboardShowAgenda14',
  monthEndStress: 'dashboardShowMonthEndStress',
  goalsPriority: 'dashboardShowGoalsPriority',
  dataQuality: 'dashboardShowDataQuality',
  accountRisk: 'dashboardShowAccountRisk',
  dailyPace: 'dashboardShowDailyPace',
  incomeRunRate: 'dashboardShowIncomeRunRate',
  trend14: 'dashboardShowTrend14',
  topCategories7: 'dashboardShowTopCategories7',
  weekendSpend: 'dashboardShowWeekendSpend',
  subscriptionBurden: 'dashboardShowSubscriptionBurden',
  noSpend: 'dashboardShowNoSpend',
  burnRate7: 'dashboardShowBurnRate7',
  weeklyMissions: 'dashboardShowWeeklyMissions',
  incomeConcentration: 'dashboardShowIncomeConcentration',
  cashCrunch14: 'dashboardShowCashCrunch14',
  expenseVolatility: 'dashboardShowExpenseVolatility',
  savingsTarget: 'dashboardShowSavingsTarget',
  commitments30: 'dashboardShowCommitments30',
  dailySpike: 'dashboardShowDailySpike',
  rolling30: 'dashboardShowRolling30',
  emergencyFund: 'dashboardShowEmergencyFund',
  categorizationScore: 'dashboardShowCategorizationScore',
  spendingMomentum: 'dashboardShowSpendingMomentum',
  subscriptionHealth: 'dashboardShowSubscriptionHealth',
  focusToday: 'dashboardShowFocusToday',
  subscriptionsOverdue: 'dashboardShowSubscriptionsOverdue',
  smartInsights: 'dashboardShowSmartInsights',
  forecast: 'dashboardShowForecast',
  insightsBase: 'dashboardShowInsightsBase',
  top5: 'dashboardShowTop5',
  budgetAlerts: 'dashboardShowBudgetAlerts',
  actions: 'dashboardShowActions',
  birthdays: 'dashboardShowBirthdays'
};

export function normalizeDashboardOrder(order) {
  if (!Array.isArray(order)) return DASHBOARD_ORDER_DEFAULT;
  const set = new Set(order);
  const merged = order.filter((id) => DASHBOARD_ORDER_DEFAULT.includes(id));
  for (const id of DASHBOARD_ORDER_DEFAULT) {
    if (!set.has(id)) merged.push(id);
  }
  const optional = merged.filter((id) => !FIXED_SECTION_IDS.includes(id));
  return [...FIXED_SECTION_IDS, ...optional];
}

export function getVisibleOrderedOptionalSections(settings) {
  const order = normalizeDashboardOrder(settings?.dashboardOrder);
  return order.filter((id) => {
    const field = DASHBOARD_VISIBILITY_FIELDS[id];
    if (!field) return false;
    return settings?.[field] === true;
  });
}

export function buildDashboardPreview(settings) {
  const orderedOptional = getVisibleOrderedOptionalSections(settings);
  const desktop = [...FIXED_SECTION_IDS, ...orderedOptional];
  const mobile = ['header', 'financial', 'monthStats', 'story', ...orderedOptional];
  return { desktop, mobile };
}

export function getSectionLabel(sectionId) {
  if (sectionId === 'monthStats') return 'Entrate/Uscite mese';
  const found = DASHBOARD_SECTIONS.find((s) => s.id === sectionId);
  return found?.label || sectionId;
}
