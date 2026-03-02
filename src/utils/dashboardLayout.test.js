import {
  buildDashboardPreview,
  DASHBOARD_ORDER_DEFAULT,
  getVisibleOrderedOptionalSections,
  normalizeDashboardOrder
} from './dashboardLayout';

describe('dashboardLayout utils', () => {
  test('normalizeDashboardOrder keeps fixed sections in first positions', () => {
    const out = normalizeDashboardOrder(['actions', 'story', 'header', 'budgetAlerts', 'financial']);
    expect(out.slice(0, 3)).toEqual(['header', 'financial', 'story']);
  });

  test('normalizeDashboardOrder includes all known sections', () => {
    const out = normalizeDashboardOrder(['forecast']);
    expect(out).toEqual(expect.arrayContaining(DASHBOARD_ORDER_DEFAULT));
    expect(out.length).toBe(DASHBOARD_ORDER_DEFAULT.length);
  });

  test('visible optional sections respect order and visibility flags', () => {
    const settings = {
      dashboardOrder: ['header', 'financial', 'story', 'actions', 'forecast', 'top5'],
      dashboardShowActions: true,
      dashboardShowForecast: false,
      dashboardShowTop5: true
    };
    expect(getVisibleOrderedOptionalSections(settings)).toEqual(['actions', 'top5']);
  });

  test('buildDashboardPreview includes month stats in mobile only', () => {
    const settings = {
      dashboardOrder: ['header', 'financial', 'story', 'actions'],
      dashboardShowActions: true
    };
    const preview = buildDashboardPreview(settings);
    expect(preview.desktop).toEqual(['header', 'financial', 'story', 'actions']);
    expect(preview.mobile).toEqual(['header', 'financial', 'monthStats', 'story', 'actions']);
  });
});
