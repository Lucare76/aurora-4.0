export const DASHBOARD_SECTIONS = [
  { id: 'header', label: 'Buongiorno', required: true },
  { id: 'financial', label: 'Saldo totale + Cash Flow', required: true },
  { id: 'story', label: 'Story del mese', required: true },
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
