import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiUser, FiMail, FiBell, FiCheck } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import PageHeader from './PageHeader';
import {
  buildDashboardPreview,
  DASHBOARD_SECTIONS,
  getSectionLabel,
  normalizeDashboardOrder
} from '../../utils/dashboardLayout';
import {
  normalizeSubscriptionNotificationOffsets,
  SUBSCRIPTION_NOTIFICATION_OPTIONS
} from '../../utils/subscriptionsNotifications';
import { getFamilyPermissions } from '../../utils/familyWorkflow';
import { getBackupCollections } from '../../utils/backupProfiles';
import { hasBackupConflict, parseBackupJson, reviveBackupValue, summarizeBackupPayload } from '../../utils/backupRestore';
import { clearRuntimeIssues, getRuntimeIssues } from '../../utils/reliability';

function SettingsContent() {
  const { user, userSettings, setUserSettings, isAdmin, userApprovalStatus } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreDryRunBusy, setRestoreDryRunBusy] = useState(false);
  const [undoingRestore, setUndoingRestore] = useState(false);
  const [runtimeIssueCount, setRuntimeIssueCount] = useState(0);
  const [restoreProfile, setRestoreProfile] = useState('full');
  const [restoreMode, setRestoreMode] = useState('merge');
  const [restorePayload, setRestorePayload] = useState(null);
  const [restoreSummary, setRestoreSummary] = useState(null);
  const [restorePlan, setRestorePlan] = useState(null);
  const [lastRestoreSnapshot, setLastRestoreSnapshot] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isMobileSettings, setIsMobileSettings] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 768
  );
  const [familyRolePreview, setFamilyRolePreview] = useState('owner');
  const hasLoadedOnceRef = useRef(false);
  const autoSaveTimerRef = useRef(null);
  const restoreSnapshotStorageKey = user?.uid ? `aurora_last_restore_snapshot_${user.uid}` : '';

  const [settings, setSettings] = useState({
    reminderEmail: '',
    reminderDaysBefore: 2,
    weatherCity: 'Roma',
    currency: userSettings?.currency || 'EUR',
    savingsTargetType: userSettings?.savingsTargetType || 'percent',
    savingsTargetPercent: userSettings?.savingsTargetPercent ?? 20,
    savingsTargetAmount: userSettings?.savingsTargetAmount ?? 0,
    dashboardMobileMode: userSettings?.dashboardMobileMode || 'normal',
    dashboardOrder: normalizeDashboardOrder(userSettings?.dashboardOrder),
    dashboardShowMonthClose: userSettings?.dashboardShowMonthClose ?? true,
    dashboardShowAnomalies: userSettings?.dashboardShowAnomalies ?? false,
    dashboardShowLiquidityRadar: userSettings?.dashboardShowLiquidityRadar ?? false,
    dashboardShowWeeklyPulse: userSettings?.dashboardShowWeeklyPulse ?? false,
    dashboardShowAgenda14: userSettings?.dashboardShowAgenda14 ?? false,
    dashboardShowMonthEndStress: userSettings?.dashboardShowMonthEndStress ?? false,
    dashboardShowGoalsPriority: userSettings?.dashboardShowGoalsPriority ?? false,
    dashboardShowDataQuality: userSettings?.dashboardShowDataQuality ?? false,
    dashboardShowAccountRisk: userSettings?.dashboardShowAccountRisk ?? false,
    dashboardShowDailyPace: userSettings?.dashboardShowDailyPace ?? false,
    dashboardShowIncomeRunRate: userSettings?.dashboardShowIncomeRunRate ?? false,
    dashboardShowTrend14: userSettings?.dashboardShowTrend14 ?? false,
    dashboardShowTopCategories7: userSettings?.dashboardShowTopCategories7 ?? false,
    dashboardShowWeekendSpend: userSettings?.dashboardShowWeekendSpend ?? false,
    dashboardShowSubscriptionBurden: userSettings?.dashboardShowSubscriptionBurden ?? false,
    dashboardShowNoSpend: userSettings?.dashboardShowNoSpend ?? false,
    dashboardShowBurnRate7: userSettings?.dashboardShowBurnRate7 ?? false,
    dashboardShowWeeklyMissions: userSettings?.dashboardShowWeeklyMissions ?? false,
    dashboardShowIncomeConcentration: userSettings?.dashboardShowIncomeConcentration ?? false,
    dashboardShowCashCrunch14: userSettings?.dashboardShowCashCrunch14 ?? false,
    dashboardShowExpenseVolatility: userSettings?.dashboardShowExpenseVolatility ?? false,
    dashboardShowSavingsTarget: userSettings?.dashboardShowSavingsTarget ?? false,
    dashboardShowCommitments30: userSettings?.dashboardShowCommitments30 ?? false,
    dashboardShowDailySpike: userSettings?.dashboardShowDailySpike ?? false,
    dashboardShowRolling30: userSettings?.dashboardShowRolling30 ?? false,
    dashboardShowEmergencyFund: userSettings?.dashboardShowEmergencyFund ?? false,
    dashboardShowCategorizationScore: userSettings?.dashboardShowCategorizationScore ?? false,
    dashboardShowSpendingMomentum: userSettings?.dashboardShowSpendingMomentum ?? false,
    dashboardShowSubscriptionHealth: userSettings?.dashboardShowSubscriptionHealth ?? false,
    dashboardShowFocusToday: userSettings?.dashboardShowFocusToday ?? false,
    dashboardShowSubscriptionsDue: userSettings?.dashboardShowSubscriptionsDue ?? false,
    dashboardShowSubscriptionsOverdue: userSettings?.dashboardShowSubscriptionsOverdue ?? false,
    dashboardShowSmartInsights: userSettings?.dashboardShowSmartInsights ?? false,
    dashboardShowForecast: userSettings?.dashboardShowForecast ?? false,
    dashboardShowInsightsBase: userSettings?.dashboardShowInsightsBase ?? false,
    dashboardShowTop5: userSettings?.dashboardShowTop5 ?? false,
    dashboardShowBudgetAlerts: userSettings?.dashboardShowBudgetAlerts ?? false,
    dashboardShowActions: userSettings?.dashboardShowActions ?? false,
    dashboardShowBirthdays: userSettings?.dashboardShowBirthdays ?? false,
    subscriptionsNotificationsEnabled: userSettings?.subscriptionsNotificationsEnabled ?? false,
    subscriptionsNotificationOffsets: normalizeSubscriptionNotificationOffsets(
      userSettings?.subscriptionsNotificationOffsets ?? userSettings?.subscriptionsNotificationsDays
    ),
    subscriptionsNotificationsPriceAlert: userSettings?.subscriptionsNotificationsPriceAlert ?? true,
    subscriptionsAutoCreateTransactionOnRenew: userSettings?.subscriptionsAutoCreateTransactionOnRenew ?? true,
    subscriptionsRecurringEnabled: userSettings?.subscriptionsRecurringEnabled ?? true,
    subscriptionsFixedEnabled: userSettings?.subscriptionsFixedEnabled ?? true,
    bellShowBirthdays: userSettings?.bellShowBirthdays ?? true,
    bellShowSubscriptions: userSettings?.bellShowSubscriptions ?? true,
    bellShowUpcoming7Days: userSettings?.bellShowUpcoming7Days ?? true,
    bellSubscriptionReminderDays: Number(userSettings?.bellSubscriptionReminderDays) || 7,
    familyModeEnabled: userSettings?.familyModeEnabled ?? false,
    familyBudgetsEnabled: userSettings?.familyBudgetsEnabled ?? false,
    familyCommentsEnabled: userSettings?.familyCommentsEnabled ?? false,
    familyApprovalsEnabled: userSettings?.familyApprovalsEnabled ?? false,
    onboardingDisabled: userSettings?.onboardingDisabled ?? false
  });

  const dashboardSettingsPayload = useMemo(
    () => ({
      dashboardMobileMode: settings.dashboardMobileMode || 'normal',
      dashboardOrder: normalizeDashboardOrder(settings.dashboardOrder),
      dashboardShowMonthClose: settings.dashboardShowMonthClose !== false,
      dashboardShowAnomalies: settings.dashboardShowAnomalies === true,
      dashboardShowLiquidityRadar: settings.dashboardShowLiquidityRadar === true,
      dashboardShowWeeklyPulse: settings.dashboardShowWeeklyPulse === true,
      dashboardShowAgenda14: settings.dashboardShowAgenda14 === true,
      dashboardShowMonthEndStress: settings.dashboardShowMonthEndStress === true,
      dashboardShowGoalsPriority: settings.dashboardShowGoalsPriority === true,
      dashboardShowDataQuality: settings.dashboardShowDataQuality === true,
      dashboardShowAccountRisk: settings.dashboardShowAccountRisk === true,
      dashboardShowDailyPace: settings.dashboardShowDailyPace === true,
      dashboardShowIncomeRunRate: settings.dashboardShowIncomeRunRate === true,
      dashboardShowTrend14: settings.dashboardShowTrend14 === true,
      dashboardShowTopCategories7: settings.dashboardShowTopCategories7 === true,
      dashboardShowWeekendSpend: settings.dashboardShowWeekendSpend === true,
      dashboardShowSubscriptionBurden: settings.dashboardShowSubscriptionBurden === true,
      dashboardShowNoSpend: settings.dashboardShowNoSpend === true,
      dashboardShowBurnRate7: settings.dashboardShowBurnRate7 === true,
      dashboardShowWeeklyMissions: settings.dashboardShowWeeklyMissions === true,
      dashboardShowIncomeConcentration: settings.dashboardShowIncomeConcentration === true,
      dashboardShowCashCrunch14: settings.dashboardShowCashCrunch14 === true,
      dashboardShowExpenseVolatility: settings.dashboardShowExpenseVolatility === true,
      dashboardShowSavingsTarget: settings.dashboardShowSavingsTarget === true,
      dashboardShowCommitments30: settings.dashboardShowCommitments30 === true,
      dashboardShowDailySpike: settings.dashboardShowDailySpike === true,
      dashboardShowRolling30: settings.dashboardShowRolling30 === true,
      dashboardShowEmergencyFund: settings.dashboardShowEmergencyFund === true,
      dashboardShowCategorizationScore: settings.dashboardShowCategorizationScore === true,
      dashboardShowSpendingMomentum: settings.dashboardShowSpendingMomentum === true,
      dashboardShowSubscriptionHealth: settings.dashboardShowSubscriptionHealth === true,
      dashboardShowFocusToday: settings.dashboardShowFocusToday === true,
      dashboardShowSubscriptionsDue: settings.dashboardShowSubscriptionsDue === true,
      dashboardShowSubscriptionsOverdue: settings.dashboardShowSubscriptionsOverdue === true,
      dashboardShowSmartInsights: settings.dashboardShowSmartInsights === true,
      dashboardShowForecast: settings.dashboardShowForecast === true,
      dashboardShowInsightsBase: settings.dashboardShowInsightsBase === true,
      dashboardShowTop5: settings.dashboardShowTop5 === true,
      dashboardShowBudgetAlerts: settings.dashboardShowBudgetAlerts === true,
      dashboardShowActions: settings.dashboardShowActions === true,
      dashboardShowBirthdays: settings.dashboardShowBirthdays === true
    }),
    [
      settings.dashboardMobileMode,
      settings.dashboardOrder,
      settings.dashboardShowAnomalies,
      settings.dashboardShowLiquidityRadar,
      settings.dashboardShowWeeklyPulse,
      settings.dashboardShowAgenda14,
      settings.dashboardShowMonthEndStress,
      settings.dashboardShowGoalsPriority,
      settings.dashboardShowDataQuality,
      settings.dashboardShowAccountRisk,
      settings.dashboardShowDailyPace,
      settings.dashboardShowIncomeRunRate,
      settings.dashboardShowTrend14,
      settings.dashboardShowTopCategories7,
      settings.dashboardShowWeekendSpend,
      settings.dashboardShowSubscriptionBurden,
      settings.dashboardShowNoSpend,
      settings.dashboardShowBurnRate7,
      settings.dashboardShowWeeklyMissions,
      settings.dashboardShowIncomeConcentration,
      settings.dashboardShowCashCrunch14,
      settings.dashboardShowExpenseVolatility,
      settings.dashboardShowSavingsTarget,
      settings.dashboardShowCommitments30,
      settings.dashboardShowDailySpike,
      settings.dashboardShowRolling30,
      settings.dashboardShowEmergencyFund,
      settings.dashboardShowCategorizationScore,
      settings.dashboardShowSpendingMomentum,
      settings.dashboardShowSubscriptionHealth,
      settings.dashboardShowMonthClose,
      settings.dashboardShowActions,
      settings.dashboardShowBirthdays,
      settings.dashboardShowBudgetAlerts,
      settings.dashboardShowFocusToday,
      settings.dashboardShowForecast,
      settings.dashboardShowInsightsBase,
      settings.dashboardShowSubscriptionsOverdue,
      settings.dashboardShowSubscriptionsDue,
      settings.dashboardShowSmartInsights,
      settings.dashboardShowTop5
    ]
  );

  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.uid) return;

      setLoading(true);
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../../services/firebase');

        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (userDoc.exists()) {
          const data = userDoc.data();
          setSettings({
            reminderEmail: data.reminderEmail || user.email,
            reminderDaysBefore: data.reminderDaysBefore || 2,
            weatherCity: data.weatherCity || 'Roma',
            currency: data.currency || 'EUR',
            savingsTargetType: data.savingsTargetType || 'percent',
            savingsTargetPercent: data.savingsTargetPercent ?? 20,
            savingsTargetAmount: data.savingsTargetAmount ?? 0,
            dashboardMobileMode: data.dashboardMobileMode || 'normal',
            dashboardOrder: normalizeDashboardOrder(data.dashboardOrder),
            dashboardShowMonthClose: data.dashboardShowMonthClose ?? true,
            dashboardShowAnomalies: data.dashboardShowAnomalies ?? false,
            dashboardShowLiquidityRadar: data.dashboardShowLiquidityRadar ?? false,
            dashboardShowWeeklyPulse: data.dashboardShowWeeklyPulse ?? false,
            dashboardShowAgenda14: data.dashboardShowAgenda14 ?? false,
            dashboardShowMonthEndStress: data.dashboardShowMonthEndStress ?? false,
            dashboardShowGoalsPriority: data.dashboardShowGoalsPriority ?? false,
            dashboardShowDataQuality: data.dashboardShowDataQuality ?? false,
            dashboardShowAccountRisk: data.dashboardShowAccountRisk ?? false,
            dashboardShowDailyPace: data.dashboardShowDailyPace ?? false,
            dashboardShowIncomeRunRate: data.dashboardShowIncomeRunRate ?? false,
            dashboardShowTrend14: data.dashboardShowTrend14 ?? false,
            dashboardShowTopCategories7: data.dashboardShowTopCategories7 ?? false,
            dashboardShowWeekendSpend: data.dashboardShowWeekendSpend ?? false,
            dashboardShowSubscriptionBurden: data.dashboardShowSubscriptionBurden ?? false,
            dashboardShowNoSpend: data.dashboardShowNoSpend ?? false,
            dashboardShowBurnRate7: data.dashboardShowBurnRate7 ?? false,
            dashboardShowWeeklyMissions: data.dashboardShowWeeklyMissions ?? false,
            dashboardShowIncomeConcentration: data.dashboardShowIncomeConcentration ?? false,
            dashboardShowCashCrunch14: data.dashboardShowCashCrunch14 ?? false,
            dashboardShowExpenseVolatility: data.dashboardShowExpenseVolatility ?? false,
            dashboardShowSavingsTarget: data.dashboardShowSavingsTarget ?? false,
            dashboardShowCommitments30: data.dashboardShowCommitments30 ?? false,
            dashboardShowDailySpike: data.dashboardShowDailySpike ?? false,
            dashboardShowRolling30: data.dashboardShowRolling30 ?? false,
            dashboardShowEmergencyFund: data.dashboardShowEmergencyFund ?? false,
            dashboardShowCategorizationScore: data.dashboardShowCategorizationScore ?? false,
            dashboardShowSpendingMomentum: data.dashboardShowSpendingMomentum ?? false,
            dashboardShowSubscriptionHealth: data.dashboardShowSubscriptionHealth ?? false,
            dashboardShowFocusToday: data.dashboardShowFocusToday ?? false,
            dashboardShowSubscriptionsDue: data.dashboardShowSubscriptionsDue ?? false,
            dashboardShowSubscriptionsOverdue: data.dashboardShowSubscriptionsOverdue ?? false,
            dashboardShowSmartInsights: data.dashboardShowSmartInsights ?? false,
            dashboardShowForecast: data.dashboardShowForecast ?? false,
            dashboardShowInsightsBase: data.dashboardShowInsightsBase ?? false,
            dashboardShowTop5: data.dashboardShowTop5 ?? false,
            dashboardShowBudgetAlerts: data.dashboardShowBudgetAlerts ?? false,
            dashboardShowActions: data.dashboardShowActions ?? false,
            dashboardShowBirthdays: data.dashboardShowBirthdays ?? false,
            subscriptionsNotificationsEnabled: data.subscriptionsNotificationsEnabled ?? false,
            subscriptionsNotificationOffsets: normalizeSubscriptionNotificationOffsets(
              data.subscriptionsNotificationOffsets ?? data.subscriptionsNotificationsDays
            ),
            subscriptionsNotificationsPriceAlert: data.subscriptionsNotificationsPriceAlert ?? true,
            subscriptionsAutoCreateTransactionOnRenew: data.subscriptionsAutoCreateTransactionOnRenew ?? true,
            subscriptionsRecurringEnabled: data.subscriptionsRecurringEnabled ?? true,
            subscriptionsFixedEnabled: data.subscriptionsFixedEnabled ?? true,
            bellShowBirthdays: data.bellShowBirthdays ?? true,
            bellShowSubscriptions: data.bellShowSubscriptions ?? true,
            bellShowUpcoming7Days: data.bellShowUpcoming7Days ?? true,
            bellSubscriptionReminderDays: Number(data.bellSubscriptionReminderDays) || 7,
            familyModeEnabled: data.familyModeEnabled ?? false,
            familyBudgetsEnabled: data.familyBudgetsEnabled ?? false,
            familyCommentsEnabled: data.familyCommentsEnabled ?? false,
            familyApprovalsEnabled: data.familyApprovalsEnabled ?? false,
            onboardingDisabled: data.onboardingDisabled ?? false
          });
        } else {
          setSettings({
            reminderEmail: user.email,
            reminderDaysBefore: 2,
            weatherCity: 'Roma',
            currency: 'EUR',
            savingsTargetType: 'percent',
            savingsTargetPercent: 20,
            savingsTargetAmount: 0,
            dashboardMobileMode: 'normal',
            dashboardOrder: normalizeDashboardOrder(null),
            dashboardShowMonthClose: true,
            dashboardShowAnomalies: false,
            dashboardShowLiquidityRadar: false,
            dashboardShowWeeklyPulse: false,
            dashboardShowAgenda14: false,
            dashboardShowMonthEndStress: false,
            dashboardShowGoalsPriority: false,
            dashboardShowDataQuality: false,
            dashboardShowAccountRisk: false,
            dashboardShowDailyPace: false,
            dashboardShowIncomeRunRate: false,
            dashboardShowTrend14: false,
            dashboardShowTopCategories7: false,
            dashboardShowWeekendSpend: false,
            dashboardShowSubscriptionBurden: false,
            dashboardShowNoSpend: false,
            dashboardShowBurnRate7: false,
            dashboardShowWeeklyMissions: false,
            dashboardShowIncomeConcentration: false,
            dashboardShowCashCrunch14: false,
            dashboardShowExpenseVolatility: false,
            dashboardShowSavingsTarget: false,
            dashboardShowCommitments30: false,
            dashboardShowDailySpike: false,
            dashboardShowRolling30: false,
            dashboardShowEmergencyFund: false,
            dashboardShowCategorizationScore: false,
            dashboardShowSpendingMomentum: false,
            dashboardShowSubscriptionHealth: false,
            dashboardShowFocusToday: false,
            dashboardShowSubscriptionsDue: false,
            dashboardShowSubscriptionsOverdue: false,
            dashboardShowSmartInsights: false,
            dashboardShowForecast: false,
            dashboardShowInsightsBase: false,
            dashboardShowTop5: false,
            dashboardShowBudgetAlerts: false,
            dashboardShowActions: false,
            dashboardShowBirthdays: false,
            subscriptionsNotificationsEnabled: false,
            subscriptionsNotificationOffsets: [...SUBSCRIPTION_NOTIFICATION_OPTIONS],
            subscriptionsNotificationsPriceAlert: true,
            subscriptionsAutoCreateTransactionOnRenew: true,
            subscriptionsRecurringEnabled: true,
            subscriptionsFixedEnabled: true,
            bellShowBirthdays: true,
            bellShowSubscriptions: true,
            bellShowUpcoming7Days: true,
            bellSubscriptionReminderDays: 7,
            familyModeEnabled: false,
            familyBudgetsEnabled: false,
            familyCommentsEnabled: false,
            familyApprovalsEnabled: false,
            onboardingDisabled: false
          });
        }
      } catch (error) {
        console.error('Errore caricamento impostazioni:', error);
        setMessage({ text: 'Errore caricamento impostazioni', type: 'error' });
      } finally {
        setLoading(false);
        hasLoadedOnceRef.current = true;
      }
    };

    loadSettings();
  }, [user]);

  useEffect(() => {
    setRuntimeIssueCount(getRuntimeIssues().length);
  }, []);

  useEffect(() => {
    if (!restoreSnapshotStorageKey) {
      setLastRestoreSnapshot(null);
      return;
    }
    try {
      const raw = localStorage.getItem(restoreSnapshotStorageKey);
      setLastRestoreSnapshot(raw ? JSON.parse(raw) : null);
    } catch {
      setLastRestoreSnapshot(null);
    }
  }, [restoreSnapshotStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onResize = () => setIsMobileSettings(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!user?.uid || !hasLoadedOnceRef.current) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const { doc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('../../services/firebase');

        await updateDoc(doc(db, 'users', user.uid), dashboardSettingsPayload);
        if (setUserSettings) {
          setUserSettings((prev) => ({
            ...prev,
            ...dashboardSettingsPayload
          }));
        }
        setMessage((prev) =>
          prev.type === 'error'
            ? prev
            : { text: 'Layout dashboard salvato automaticamente', type: 'success' }
        );
      } catch (error) {
        console.error('Errore autosave dashboard:', error);
        setMessage({ text: 'Errore salvataggio automatico dashboard', type: 'error' });
      }
    }, 700);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [dashboardSettingsPayload, setUserSettings, user?.uid]);

  const handleSave = async () => {
    if (!user?.uid) return;

    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const { updateReminderSettings, updateWeatherCity } = await import('../../services/userApprovalService');

      const { doc: fbDoc, updateDoc: fbUpdate } = await import('firebase/firestore');
      const { db: fbDb } = await import('../../services/firebase');

      const [result, weatherResult] = await Promise.all([
        updateReminderSettings(user.uid, settings.reminderEmail, settings.reminderDaysBefore),
        updateWeatherCity(user.uid, settings.weatherCity),
        fbUpdate(fbDoc(fbDb, 'users', user.uid), {
          currency: settings.currency,
          savingsTargetType: settings.savingsTargetType,
          savingsTargetPercent: Number(settings.savingsTargetPercent) || 0,
          savingsTargetAmount: Number(settings.savingsTargetAmount) || 0,
          ...dashboardSettingsPayload,
          dashboardShowFocusToday: settings.dashboardShowFocusToday === true,
          subscriptionsNotificationsEnabled: !!settings.subscriptionsNotificationsEnabled,
          subscriptionsNotificationOffsets: normalizeSubscriptionNotificationOffsets(settings.subscriptionsNotificationOffsets),
          subscriptionsNotificationsDays: Math.max(
            ...normalizeSubscriptionNotificationOffsets(settings.subscriptionsNotificationOffsets)
          ),
          subscriptionsNotificationsPriceAlert: !!settings.subscriptionsNotificationsPriceAlert,
          subscriptionsAutoCreateTransactionOnRenew: settings.subscriptionsAutoCreateTransactionOnRenew !== false,
          subscriptionsRecurringEnabled: settings.subscriptionsRecurringEnabled !== false,
          subscriptionsFixedEnabled: settings.subscriptionsFixedEnabled !== false,
          bellShowBirthdays: settings.bellShowBirthdays !== false,
          bellShowSubscriptions: settings.bellShowSubscriptions !== false,
          bellShowUpcoming7Days: settings.bellShowUpcoming7Days !== false,
          bellSubscriptionReminderDays: Number(settings.bellSubscriptionReminderDays) || 7,
          familyModeEnabled: !!settings.familyModeEnabled,
          familyBudgetsEnabled: !!settings.familyBudgetsEnabled,
          familyCommentsEnabled: !!settings.familyCommentsEnabled,
          familyApprovalsEnabled: !!settings.familyApprovalsEnabled,
          onboardingDisabled: !!settings.onboardingDisabled
        })
      ]);

      if (setUserSettings) {
        setUserSettings((prev) => ({
          ...prev,
          currency: settings.currency,
          savingsTargetType: settings.savingsTargetType,
          savingsTargetPercent: Number(settings.savingsTargetPercent) || 0,
          savingsTargetAmount: Number(settings.savingsTargetAmount) || 0,
          ...dashboardSettingsPayload,
          dashboardShowFocusToday: settings.dashboardShowFocusToday === true,
          subscriptionsNotificationsEnabled: !!settings.subscriptionsNotificationsEnabled,
          subscriptionsNotificationOffsets: normalizeSubscriptionNotificationOffsets(settings.subscriptionsNotificationOffsets),
          subscriptionsNotificationsDays: Math.max(
            ...normalizeSubscriptionNotificationOffsets(settings.subscriptionsNotificationOffsets)
          ),
          subscriptionsNotificationsPriceAlert: !!settings.subscriptionsNotificationsPriceAlert,
          subscriptionsAutoCreateTransactionOnRenew: settings.subscriptionsAutoCreateTransactionOnRenew !== false,
          subscriptionsRecurringEnabled: settings.subscriptionsRecurringEnabled !== false,
          subscriptionsFixedEnabled: settings.subscriptionsFixedEnabled !== false,
          bellShowBirthdays: settings.bellShowBirthdays !== false,
          bellShowSubscriptions: settings.bellShowSubscriptions !== false,
          bellShowUpcoming7Days: settings.bellShowUpcoming7Days !== false,
          bellSubscriptionReminderDays: Number(settings.bellSubscriptionReminderDays) || 7,
          familyModeEnabled: !!settings.familyModeEnabled,
          familyBudgetsEnabled: !!settings.familyBudgetsEnabled,
          familyCommentsEnabled: !!settings.familyCommentsEnabled,
          familyApprovalsEnabled: !!settings.familyApprovalsEnabled,
          onboardingDisabled: !!settings.onboardingDisabled
        }));
      }

      if (result.success && weatherResult.success) {
        setMessage({ text: 'Impostazioni salvate con successo!', type: 'success' });
      } else {
        setMessage({ text: 'Errore salvataggio impostazioni', type: 'error' });
      }
    } catch (error) {
      console.error('Errore salvataggio:', error);
      setMessage({ text: 'Errore: ' + error.message, type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
  };

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleReopenOnboarding = () => {
    window.dispatchEvent(new Event('aurora_onboarding_open'));
    setMessage({ text: 'Guida rapida aperta', type: 'success' });
  };

  const toggleSubscriptionNotificationOffset = (day) => {
    setSettings((prev) => {
      const current = normalizeSubscriptionNotificationOffsets(prev.subscriptionsNotificationOffsets);
      const hasDay = current.includes(day);
      if (hasDay) {
        const next = current.filter((d) => d !== day);
        return {
          ...prev,
          subscriptionsNotificationOffsets: next.length > 0 ? next : [day]
        };
      }
      return {
        ...prev,
        subscriptionsNotificationOffsets: [...current, day].sort((a, b) => b - a)
      };
    });
  };

  const orderedDashboardSections = useMemo(() => {
    const map = new Map(DASHBOARD_SECTIONS.map((s) => [s.id, s]));
    return normalizeDashboardOrder(settings.dashboardOrder).map((id) => map.get(id)).filter(Boolean);
  }, [settings.dashboardOrder]);

  const previewOrder = useMemo(() => buildDashboardPreview(settings), [settings]);
  const familyPermissionsPreview = useMemo(
    () => getFamilyPermissions(familyRolePreview, settings),
    [familyRolePreview, settings]
  );

  const handleResetDashboardDefaults = () => {
    setSettings((prev) => ({
      ...prev,
      dashboardOrder: normalizeDashboardOrder(null),
      dashboardShowMonthClose: true,
      dashboardShowAnomalies: false,
      dashboardShowLiquidityRadar: false,
      dashboardShowWeeklyPulse: false,
      dashboardShowAgenda14: false,
      dashboardShowMonthEndStress: false,
      dashboardShowGoalsPriority: false,
      dashboardShowDataQuality: false,
      dashboardShowAccountRisk: false,
      dashboardShowDailyPace: false,
      dashboardShowIncomeRunRate: false,
      dashboardShowTrend14: false,
      dashboardShowTopCategories7: false,
      dashboardShowWeekendSpend: false,
      dashboardShowSubscriptionBurden: false,
      dashboardShowNoSpend: false,
      dashboardShowBurnRate7: false,
      dashboardShowWeeklyMissions: false,
      dashboardShowIncomeConcentration: false,
      dashboardShowCashCrunch14: false,
      dashboardShowExpenseVolatility: false,
      dashboardShowSavingsTarget: false,
      dashboardShowCommitments30: false,
      dashboardShowDailySpike: false,
      dashboardShowRolling30: false,
      dashboardShowEmergencyFund: false,
      dashboardShowCategorizationScore: false,
      dashboardShowSpendingMomentum: false,
      dashboardShowSubscriptionHealth: false,
      dashboardShowFocusToday: false,
      dashboardShowSubscriptionsDue: false,
      dashboardShowSubscriptionsOverdue: false,
      dashboardShowSmartInsights: false,
      dashboardShowForecast: false,
      dashboardShowInsightsBase: false,
      dashboardShowTop5: false,
      dashboardShowBudgetAlerts: false,
      dashboardShowActions: false,
      dashboardShowBirthdays: false
    }));
    setMessage({ text: 'Layout dashboard ripristinato ai default', type: 'success' });
  };

  const handleDragStart = (index, event) => {
    const section = orderedDashboardSections[index];
    if (!section || section.required) return;
    setDragIndex(index);
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
    }
  };

  const handleDrop = (index) => {
    const source = orderedDashboardSections[dragIndex];
    const target = orderedDashboardSections[index];
    if (!source || !target || source.required || target.required) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    if (dragIndex == null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const next = [...normalizeDashboardOrder(settings.dashboardOrder)];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    setDragIndex(null);
    setDragOverIndex(null);
    handleChange('dashboardOrder', next);
  };

  const moveDashboardSection = (index, direction) => {
    const source = orderedDashboardSections[index];
    if (!source || source.required) return;
    const step = direction === 'up' ? -1 : 1;
    let targetIndex = index + step;
    while (targetIndex >= 0 && targetIndex < orderedDashboardSections.length) {
      const target = orderedDashboardSections[targetIndex];
      if (target && !target.required) break;
      targetIndex += step;
    }
    if (targetIndex < 0 || targetIndex >= orderedDashboardSections.length || targetIndex === index) return;
    const target = orderedDashboardSections[targetIndex];
    if (!target || target.required) return;

    const next = [...normalizeDashboardOrder(settings.dashboardOrder)];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    handleChange('dashboardOrder', next);
  };

  const serializeValue = (value) => {
    if (value && typeof value.toDate === 'function') {
      return value.toDate().toISOString();
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (Array.isArray(value)) {
      return value.map(serializeValue);
    }
    if (value && typeof value === 'object') {
      const out = {};
      Object.entries(value).forEach(([k, v]) => {
        out[k] = serializeValue(v);
      });
      return out;
    }
    return value;
  };

  const handleExportBackup = async (profile = 'full') => {
    if (!user?.uid || exporting) return;
    setExporting(true);
    try {
      const { db } = await import('../../services/firebase');
      const { collection, getDocs, query, where, doc, getDoc } = await import('firebase/firestore');

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? serializeValue(userDoc.data()) : {};

      const collections = getBackupCollections(profile);

      const payload = {
        exportedAt: new Date().toISOString(),
        userId: user.uid,
        profile,
        user: userData,
        data: {}
      };

      for (const colName of collections) {
        const q = query(collection(db, colName), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        payload.data[colName] = snap.docs.map((d) => ({
          id: d.id,
          ...serializeValue(d.data())
        }));
      }

      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `aurora-backup-${profile}-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Errore export backup:', error);
      alert("Errore durante l'esportazione del backup.");
    } finally {
      setExporting(false);
    }
  };

  const handleBackupFileSelected = async (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseBackupJson(text);
      const summary = summarizeBackupPayload(parsed, restoreProfile);
      setRestorePayload(parsed);
      setRestoreSummary(summary);
      setRestorePlan(null);
      setMessage({ text: `Backup caricato: ${summary.total} record trovati`, type: 'success' });
    } catch (error) {
      console.error('Errore parsing backup:', error);
      setRestorePayload(null);
      setRestoreSummary(null);
      setRestorePlan(null);
      setMessage({ text: 'File backup non valido', type: 'error' });
    }
  };

  const handleAnalyzeRestorePlan = async () => {
    if (!user?.uid || !restorePayload || restoreDryRunBusy) return;
    setRestoreDryRunBusy(true);
    try {
      const { db } = await import('../../services/firebase');
      const { doc, getDoc } = await import('firebase/firestore');
      const collections = getBackupCollections(restoreProfile);
      let toCreate = 0;
      let toUpdate = 0;
      let conflicts = 0;
      let skipped = 0;
      const byCollection = [];

      for (const colName of collections) {
        const rows = Array.isArray(restorePayload?.data?.[colName]) ? restorePayload.data[colName] : [];
        let colCreate = 0;
        let colUpdate = 0;
        let colConflicts = 0;
        let colSkipped = 0;

        for (const row of rows) {
          const rowId = row?.id;
          if (!rowId) {
            if (restoreMode === 'merge' || restoreMode === 'createOnly') {
              colCreate += 1;
            } else {
              colSkipped += 1;
            }
            continue;
          }
          const snap = await getDoc(doc(db, colName, String(rowId)));
          if (!snap.exists()) {
            if (restoreMode === 'merge' || restoreMode === 'createOnly') {
              colCreate += 1;
            } else {
              colSkipped += 1;
            }
            continue;
          }
          if (restoreMode === 'createOnly') {
            colSkipped += 1;
            continue;
          }
          const { id, ...dataOnly } = row || {};
          const incoming = reviveBackupValue(dataOnly);
          incoming.userId = user.uid;
          const conflict = hasBackupConflict(snap.data(), incoming);
          if (restoreMode === 'conflictsOnly' && !conflict) {
            colSkipped += 1;
            continue;
          }
          colUpdate += 1;
          if (conflict) {
            colConflicts += 1;
          }
        }

        toCreate += colCreate;
        toUpdate += colUpdate;
        conflicts += colConflicts;
        skipped += colSkipped;
        byCollection.push({
          collection: colName,
          toCreate: colCreate,
          toUpdate: colUpdate,
          conflicts: colConflicts,
          skipped: colSkipped,
          count: rows.length
        });
      }

      setRestorePlan({
        total: toCreate + toUpdate + skipped,
        toCreate,
        toUpdate,
        conflicts,
        skipped,
        byCollection
      });
      setMessage({
        text: `Analisi completata: ${toCreate} nuovi, ${toUpdate} aggiornamenti, ${skipped} saltati`,
        type: 'success'
      });
    } catch (error) {
      console.error('Errore analisi restore plan:', error);
      setMessage({ text: `Errore analisi: ${error.message}`, type: 'error' });
      setRestorePlan(null);
    } finally {
      setRestoreDryRunBusy(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!user?.uid || !restorePayload || restoring) return;
    if (!restorePlan) {
      setMessage({ text: 'Esegui prima Analizza conflitti', type: 'error' });
      return;
    }
    const summary = summarizeBackupPayload(restorePayload, restoreProfile);
    if (summary.total === 0) {
      setMessage({ text: 'Nessun dato da ripristinare per il profilo selezionato', type: 'error' });
      return;
    }
    const proceed = window.confirm(
      `Ripristino profilo "${restoreProfile}" con ${summary.total} record.\n` +
      `Nuovi: ${restorePlan.toCreate} | Aggiornamenti: ${restorePlan.toUpdate} | Conflitti: ${restorePlan.conflicts} | Saltati: ${restorePlan.skipped}\n` +
      `Modalita: ${
        restoreMode === 'createOnly'
          ? 'Solo nuovi (no overwrite)'
          : restoreMode === 'conflictsOnly'
            ? 'Aggiorna solo conflitti'
            : 'Merge (upsert)'
      }\n` +
      'Confermi il ripristino?'
    );
    if (!proceed) return;

    setRestoring(true);
    try {
      const { db } = await import('../../services/firebase');
      const { doc, getDoc, setDoc } = await import('firebase/firestore');

      const collections = getBackupCollections(restoreProfile);
      let written = 0;
      const snapshotEntries = [];
      for (const colName of collections) {
        const rows = Array.isArray(restorePayload?.data?.[colName]) ? restorePayload.data[colName] : [];
        for (const row of rows) {
          const rowId = row?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const docRef = doc(db, colName, String(rowId));
          const existing = await getDoc(docRef);
          if (row?.id) {
            if (restoreMode === 'createOnly' && existing.exists()) continue;
            if (restoreMode === 'conflictsOnly') {
              if (!existing.exists()) continue;
              const { id, ...dataOnly } = row || {};
              const incoming = reviveBackupValue(dataOnly);
              incoming.userId = user.uid;
              if (!hasBackupConflict(existing.data(), incoming)) continue;
            }
          } else if (restoreMode === 'conflictsOnly') {
            continue;
          }
          const { id, ...dataOnly } = row || {};
          const revived = reviveBackupValue(dataOnly);
          revived.userId = user.uid;
          snapshotEntries.push({
            collection: colName,
            id: String(rowId),
            existed: existing.exists(),
            previousData: existing.exists() ? serializeValue(existing.data()) : null
          });
          await setDoc(docRef, revived, { merge: true });
          written += 1;
        }
      }
      const snapshot = {
        at: new Date().toISOString(),
        mode: restoreMode,
        profile: restoreProfile,
        written,
        entries: snapshotEntries
      };
      setLastRestoreSnapshot(snapshot);
      if (restoreSnapshotStorageKey) {
        localStorage.setItem(restoreSnapshotStorageKey, JSON.stringify(snapshot));
      }
      setMessage({ text: `Ripristino completato: ${written} record aggiornati`, type: 'success' });
    } catch (error) {
      console.error('Errore ripristino backup:', error);
      setMessage({ text: `Errore ripristino: ${error.message}`, type: 'error' });
    } finally {
      setRestoring(false);
    }
  };

  const handleUndoLastRestore = async () => {
    if (!user?.uid || !lastRestoreSnapshot?.entries?.length || undoingRestore) return;
    const proceed = window.confirm(
      `Annullare ultimo ripristino del ${new Date(lastRestoreSnapshot.at).toLocaleString('it-IT')}?\n` +
      `Record coinvolti: ${lastRestoreSnapshot.entries.length}`
    );
    if (!proceed) return;
    setUndoingRestore(true);
    try {
      const { db } = await import('../../services/firebase');
      const { doc, deleteDoc, setDoc } = await import('firebase/firestore');
      let reverted = 0;
      for (let i = lastRestoreSnapshot.entries.length - 1; i >= 0; i -= 1) {
        const item = lastRestoreSnapshot.entries[i];
        const ref = doc(db, item.collection, item.id);
        if (item.existed) {
          const restored = reviveBackupValue(item.previousData || {});
          restored.userId = user.uid;
          await setDoc(ref, restored);
        } else {
          await deleteDoc(ref);
        }
        reverted += 1;
      }
      setMessage({ text: `Rollback completato: ${reverted} record ripristinati`, type: 'success' });
      setLastRestoreSnapshot(null);
      if (restoreSnapshotStorageKey) {
        localStorage.removeItem(restoreSnapshotStorageKey);
      }
    } catch (error) {
      console.error('Errore rollback restore:', error);
      setMessage({ text: `Errore rollback: ${error.message}`, type: 'error' });
    } finally {
      setUndoingRestore(false);
    }
  };

  useEffect(() => {
    if (!restorePayload) return;
    setRestoreSummary(summarizeBackupPayload(restorePayload, restoreProfile));
    setRestorePlan(null);
  }, [restoreMode, restorePayload, restoreProfile]);

  const handleExportRuntimeLogs = () => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        total: getRuntimeIssues().length,
        logs: getRuntimeIssues()
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `aurora-runtime-logs-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Errore export log runtime:', error);
    }
  };

  const handleClearRuntimeLogs = () => {
    clearRuntimeIssues();
    setRuntimeIssueCount(0);
    setMessage({ text: 'Log runtime puliti', type: 'success' });
  };

  if (loading) {
    return (
      <div className="content-page">
        <div className="aurora-background">
          <div className="aurora-layer-1"></div>
          <div className="aurora-layer-2"></div>
          <div className="aurora-layer-3"></div>
        </div>
        <div className="dashboard-content">
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div className="spinner"></div>
            <p>Caricamento impostazioni...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-page">
      <div className="aurora-background">
        <div className="aurora-layer-1"></div>
        <div className="aurora-layer-2"></div>
        <div className="aurora-layer-3"></div>
      </div>

      <div className="dashboard-content">
        <PageHeader
          className="page-header"
          title="Impostazioni"
          subtitle="Personalizza Aurora 4.0 secondo le tue preferenze"
        />

        {message.text && (
          <div
            style={{
              padding: '1rem',
              borderRadius: '12px',
              marginBottom: '1.5rem',
              background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border:
                message.type === 'success'
                  ? '1px solid rgba(34, 197, 94, 0.3)'
                  : '1px solid rgba(239, 68, 68, 0.3)',
              color: 'white',
              textAlign: 'center'
            }}
          >
            {message.text}
          </div>
        )}

        <div className="settings-grid">
          <div className="setting-section">
            <h3>Profilo Utente</h3>
            <div className="user-profile-info">
              <div className="profile-avatar">
                {user?.photoURL ? <img src={user.photoURL} alt="Avatar" className="avatar-img" /> : <FiUser size={40} />}
              </div>
              <div className="profile-details">
                <h4>{user?.displayName || 'Utente'}</h4>
                <p>{user?.email}</p>
                <span className="profile-badge">{isAdmin ? 'Admin' : 'Account Attivo'}</span>
                {userApprovalStatus?.status && (
                  <div style={{ marginTop: 6, opacity: 0.8, fontSize: 12 }}>
                    Stato: {userApprovalStatus.status}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="setting-section">
            <h3>Notifiche Compleanni</h3>
            <p className="section-description">
              Ricevi promemoria via email per non dimenticare mai un compleanno importante
            </p>

            <div className="setting-form">
              <div className="form-group">
                <label htmlFor="reminderEmail">
                  <FiMail style={{ marginRight: '8px' }} />
                  Email per Notifiche
                </label>
                <input
                  id="reminderEmail"
                  type="email"
                  value={settings.reminderEmail}
                  onChange={(e) => handleChange('reminderEmail', e.target.value)}
                  placeholder="tuaemail@esempio.com"
                  className="settings-input"
                />
                <small>L'email dove riceverai i promemoria dei compleanni</small>
              </div>

              <div className="form-group">
                <label htmlFor="reminderDaysBefore">
                  <FiBell style={{ marginRight: '8px' }} />
                  Anticipo Notifica
                </label>
                <select
                  id="reminderDaysBefore"
                  value={settings.reminderDaysBefore}
                  onChange={(e) => handleChange('reminderDaysBefore', parseInt(e.target.value))}
                  className="settings-select"
                >
                  <option value={1}>1 giorno prima</option>
                  <option value={2}>2 giorni prima</option>
                  <option value={3}>3 giorni prima</option>
                  <option value={5}>5 giorni prima</option>
                  <option value={7}>1 settimana prima</option>
                </select>
                <small>Quando vuoi ricevere il promemoria prima del compleanno</small>
              </div>

              <div className="reminder-preview">
                <div className="preview-icon">i</div>
                <div className="preview-text">
                  <strong>Anteprima:</strong> Riceverai un'email a <strong>{settings.reminderEmail}</strong>{' '}
                  <strong>
                    {settings.reminderDaysBefore} {settings.reminderDaysBefore === 1 ? 'giorno' : 'giorni'}
                  </strong>{' '}
                  prima di ogni compleanno alle ore 9:00.
                </div>
              </div>
            </div>
          </div>

          <div className="setting-section">
            <h3>Notifiche Abbonamenti</h3>
            <p className="section-description">
              Attiva o disattiva le notifiche push per rinnovi imminenti e aumenti di prezzo.
            </p>

            <div className="setting-form">
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.subscriptionsNotificationsEnabled}
                  onChange={(e) => handleChange('subscriptionsNotificationsEnabled', e.target.checked)}
                />
                <span>Notifiche push abbonamenti</span>
              </label>
              <div className="form-group">
                <label>Anticipo rinnovi (selezione multipla)</label>
                <div style={{ display: 'grid', gap: 8 }}>
                  {SUBSCRIPTION_NOTIFICATION_OPTIONS.map((day) => (
                    <label className="settings-toggle" key={day}>
                      <input
                        type="checkbox"
                        checked={normalizeSubscriptionNotificationOffsets(settings.subscriptionsNotificationOffsets).includes(day)}
                        onChange={() => toggleSubscriptionNotificationOffset(day)}
                      />
                      <span>{day} {day === 1 ? 'giorno prima' : 'giorni prima'}</span>
                    </label>
                  ))}
                </div>
                <small>Promemoria automatico a 7/3/1 giorni (o i valori che lasci attivi).</small>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.subscriptionsNotificationsPriceAlert}
                  onChange={(e) => handleChange('subscriptionsNotificationsPriceAlert', e.target.checked)}
                />
                <span>Avvisa per aumento prezzo</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.subscriptionsAutoCreateTransactionOnRenew !== false}
                  onChange={(e) => handleChange('subscriptionsAutoCreateTransactionOnRenew', e.target.checked)}
                />
                <span>Crea transazione automatica da rinnovo</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.subscriptionsRecurringEnabled !== false}
                  onChange={(e) => handleChange('subscriptionsRecurringEnabled', e.target.checked)}
                />
                <span>Mostra ricorrenti mensili</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.subscriptionsFixedEnabled !== false}
                  onChange={(e) => handleChange('subscriptionsFixedEnabled', e.target.checked)}
                />
                <span>Mostra rinnovi a scadenza fissa</span>
              </label>
              <small>Le notifiche vengono mostrate nel browser quando apri l'app.</small>
            </div>
          </div>

          <div className="setting-section">
            <h3>Campanella In-App</h3>
            <p className="section-description">
              Scegli quali promemoria mostrare nel centro notifiche della campanella.
            </p>
            <div className="setting-form">
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.bellShowBirthdays !== false}
                  onChange={(e) => handleChange('bellShowBirthdays', e.target.checked)}
                />
                <span>Mostra compleanni</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.bellShowSubscriptions !== false}
                  onChange={(e) => handleChange('bellShowSubscriptions', e.target.checked)}
                />
                <span>Mostra abbonamenti in scadenza</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.bellShowUpcoming7Days !== false}
                  onChange={(e) => handleChange('bellShowUpcoming7Days', e.target.checked)}
                />
                <span>Mostra prossimi giorni</span>
              </label>
              <div className="form-group">
                <label htmlFor="bellSubscriptionReminderDays">Finestra promemoria campanella</label>
                <select
                  id="bellSubscriptionReminderDays"
                  value={Number(settings.bellSubscriptionReminderDays) || 7}
                  onChange={(e) => handleChange('bellSubscriptionReminderDays', Number(e.target.value) || 7)}
                  className="settings-select"
                >
                  <option value={3}>3 giorni</option>
                  <option value={7}>7 giorni</option>
                  <option value={14}>14 giorni</option>
                  <option value={30}>30 giorni</option>
                </select>
                <small>Controlla quanti giorni futuri mostrare nella campanella (abbonamenti e compleanni).</small>
              </div>
            </div>
          </div>

          <div className="setting-section">
            <h3>Modalità Famiglia/Team</h3>
            <p className="section-description">
              Attiva le funzionalità multi‑utente. Le opzioni extra sono opzionali per utenti single.
            </p>
            <div className="setting-form">
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.familyModeEnabled}
                  onChange={(e) => handleChange('familyModeEnabled', e.target.checked)}
                />
                <span>Abilita modalità famiglia/team</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.familyBudgetsEnabled}
                  onChange={(e) => handleChange('familyBudgetsEnabled', e.target.checked)}
                />
                <span>Budget condivisi</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.familyCommentsEnabled}
                  onChange={(e) => handleChange('familyCommentsEnabled', e.target.checked)}
                />
                <span>Commenti sulle transazioni</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.familyApprovalsEnabled}
                  onChange={(e) => handleChange('familyApprovalsEnabled', e.target.checked)}
                />
                <span>Approvazioni interne al team</span>
              </label>
              <div className="form-group">
                <label htmlFor="familyRolePreview">Anteprima ruolo</label>
                <select
                  id="familyRolePreview"
                  className="settings-select"
                  value={familyRolePreview}
                  onChange={(e) => setFamilyRolePreview(e.target.value)}
                >
                  <option value="owner">Owner</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="family-permission-preview">
                <span className={`family-perm-chip ${familyPermissionsPreview.canEditTransactions ? 'on' : 'off'}`}>
                  Modifica transazioni: {familyPermissionsPreview.canEditTransactions ? 'SI' : 'NO'}
                </span>
                <span className={`family-perm-chip ${familyPermissionsPreview.canApprove ? 'on' : 'off'}`}>
                  Approvazioni: {familyPermissionsPreview.canApprove ? 'SI' : 'NO'}
                </span>
                <span className={`family-perm-chip ${familyPermissionsPreview.canComment ? 'on' : 'off'}`}>
                  Commenti: {familyPermissionsPreview.canComment ? 'SI' : 'NO'}
                </span>
                <span className={`family-perm-chip ${familyPermissionsPreview.canManageBudgets ? 'on' : 'off'}`}>
                  Budget condivisi: {familyPermissionsPreview.canManageBudgets ? 'SI' : 'NO'}
                </span>
              </div>
              <small>Puoi attivare queste opzioni solo se ti servono.</small>
            </div>
          </div>

          <div className="setting-section">
            <h3>Widget Meteo</h3>
            <p className="section-description">Scegli la Citta per il widget meteo nella sidebar</p>
            <div className="setting-form">
              <div className="form-group">
                <label htmlFor="weatherCity">Citta per il Meteo</label>
                <input
                  id="weatherCity"
                  type="text"
                  value={settings.weatherCity}
                  onChange={(e) => handleChange('weatherCity', e.target.value)}
                  placeholder="Es. Roma, Milano, Napoli..."
                  className="settings-input"
                />
                <small>Il nome della citta di cui visualizzare il meteo nella sidebar</small>
              </div>
            </div>
          </div>

          <div className="setting-section">
            <h3>Valuta</h3>
            <p className="section-description">Scegli la valuta da visualizzare in tutta l'app</p>
            <div className="setting-form">
              <div className="form-group">
                <label htmlFor="currency">Valuta Predefinita</label>
                <select
                  id="currency"
                  value={settings.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  className="settings-select"
                >
                  <option value="EUR">EUR (EUR)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (GBP)</option>
                  <option value="CHF">CHF (CHF)</option>
                  <option value="JPY">JPY (JPY)</option>
                  <option value="CAD">CAD (C$)</option>
                  <option value="AUD">AUD (A$)</option>
                  <option value="SEK">SEK (kr)</option>
                  <option value="NOK">NOK (kr)</option>
                  <option value="PLN">PLN (PLN)</option>
                  <option value="BRL">BRL (R$)</option>
                  <option value="INR">INR (INR)</option>
                </select>
                <small>Il simbolo verra usato in tutta l'app</small>
              </div>
            </div>
          </div>

          <div className="setting-section">
            <h3>Obiettivo Risparmio</h3>
            <p className="section-description">Imposta un obiettivo che viene mostrato nella Story del mese.</p>
            <div className="setting-form">
              <div className="form-group">
                <label htmlFor="savingsTargetType">Tipo obiettivo</label>
                <select
                  id="savingsTargetType"
                  value={settings.savingsTargetType}
                  onChange={(e) => handleChange('savingsTargetType', e.target.value)}
                  className="settings-select"
                >
                  <option value="percent">Percentuale delle entrate</option>
                  <option value="amount">Importo fisso mensile</option>
                </select>
                <small>Usato per il progresso risparmio nella dashboard</small>
              </div>

              {settings.savingsTargetType === 'percent' ? (
                <div className="form-group">
                  <label htmlFor="savingsTargetPercent">Percentuale risparmio</label>
                  <input
                    id="savingsTargetPercent"
                    type="number"
                    min="1"
                    max="90"
                    step="1"
                    value={settings.savingsTargetPercent}
                    onChange={(e) => handleChange('savingsTargetPercent', e.target.value)}
                    className="settings-input"
                  />
                  <small>Consigliato 10% - 30%</small>
                </div>
              ) : (
                <div className="form-group">
                  <label htmlFor="savingsTargetAmount">Importo obiettivo</label>
                  <input
                    id="savingsTargetAmount"
                    type="number"
                    min="0"
                    step="1"
                    value={settings.savingsTargetAmount}
                    onChange={(e) => handleChange('savingsTargetAmount', e.target.value)}
                    className="settings-input"
                  />
                  <small>Importo mensile da raggiungere</small>
                </div>
              )}
            </div>
          </div>

          <div className="setting-section">
            <h3>Dashboard Mobile</h3>
            <p className="section-description">Scegli la Modalita della dashboard su schermi piccoli.</p>
            <div className="setting-form">
              <div className="form-group">
                <label htmlFor="dashboardMobileMode">Modalita mobile</label>
                <select
                  id="dashboardMobileMode"
                  value={settings.dashboardMobileMode}
                  onChange={(e) => handleChange('dashboardMobileMode', e.target.value)}
                  className="settings-select"
                >
                  <option value="normal">Completa</option>
                  <option value="compact">Semplificata (solo numeri)</option>
                </select>
                <small>La modalita semplificata riduce sezioni e spazio.</small>
              </div>
            </div>
          </div>

          <div className="setting-section">
            <h3>Dashboard Personalizzata</h3>
            <p className="section-description">
              Scegli quali sezioni opzionali mostrare nella dashboard. Le sezioni base restano sempre visibili
              (Buongiorno, Saldo/Cash Flow, Story del mese).
            </p>
            <div className="setting-form">
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-save-settings"
                  onClick={handleResetDashboardDefaults}
                  style={{ padding: '8px 14px', fontSize: 13 }}
                >
                  Ripristina default dashboard
                </button>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowMonthClose}
                  onChange={(e) => handleChange('dashboardShowMonthClose', e.target.checked)}
                />
                <span>Assistente chiusura mese</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowAnomalies}
                  onChange={(e) => handleChange('dashboardShowAnomalies', e.target.checked)}
                />
                <span>Anomalie transazioni</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowLiquidityRadar}
                  onChange={(e) => handleChange('dashboardShowLiquidityRadar', e.target.checked)}
                />
                <span>Radar liquidita</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowWeeklyPulse}
                  onChange={(e) => handleChange('dashboardShowWeeklyPulse', e.target.checked)}
                />
                <span>Pulse settimanale</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowAgenda14}
                  onChange={(e) => handleChange('dashboardShowAgenda14', e.target.checked)}
                />
                <span>Agenda 14 giorni</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowMonthEndStress}
                  onChange={(e) => handleChange('dashboardShowMonthEndStress', e.target.checked)}
                />
                <span>Stress test fine mese</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowGoalsPriority}
                  onChange={(e) => handleChange('dashboardShowGoalsPriority', e.target.checked)}
                />
                <span>Obiettivo prioritario</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowDataQuality}
                  onChange={(e) => handleChange('dashboardShowDataQuality', e.target.checked)}
                />
                <span>Qualita dati</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowAccountRisk}
                  onChange={(e) => handleChange('dashboardShowAccountRisk', e.target.checked)}
                />
                <span>Conti a rischio</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowDailyPace}
                  onChange={(e) => handleChange('dashboardShowDailyPace', e.target.checked)}
                />
                <span>Pace giornaliero spese</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowIncomeRunRate}
                  onChange={(e) => handleChange('dashboardShowIncomeRunRate', e.target.checked)}
                />
                <span>Stato entrate</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowTrend14}
                  onChange={(e) => handleChange('dashboardShowTrend14', e.target.checked)}
                />
                <span>Trend 14 giorni</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowTopCategories7}
                  onChange={(e) => handleChange('dashboardShowTopCategories7', e.target.checked)}
                />
                <span>Top categorie 7 giorni</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowWeekendSpend}
                  onChange={(e) => handleChange('dashboardShowWeekendSpend', e.target.checked)}
                />
                <span>Weekend spend alert</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowSubscriptionBurden}
                  onChange={(e) => handleChange('dashboardShowSubscriptionBurden', e.target.checked)}
                />
                <span>Peso abbonamenti</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowNoSpend}
                  onChange={(e) => handleChange('dashboardShowNoSpend', e.target.checked)}
                />
                <span>No-spend streak</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowBurnRate7}
                  onChange={(e) => handleChange('dashboardShowBurnRate7', e.target.checked)}
                />
                <span>Burn rate 7 giorni</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowWeeklyMissions}
                  onChange={(e) => handleChange('dashboardShowWeeklyMissions', e.target.checked)}
                />
                <span>Missioni settimanali</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowIncomeConcentration}
                  onChange={(e) => handleChange('dashboardShowIncomeConcentration', e.target.checked)}
                />
                <span>Concentrazione entrate</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowCashCrunch14}
                  onChange={(e) => handleChange('dashboardShowCashCrunch14', e.target.checked)}
                />
                <span>Rischio cassa 14 giorni</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowExpenseVolatility}
                  onChange={(e) => handleChange('dashboardShowExpenseVolatility', e.target.checked)}
                />
                <span>Variabilita spese 30g</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowSavingsTarget}
                  onChange={(e) => handleChange('dashboardShowSavingsTarget', e.target.checked)}
                />
                <span>Obiettivo risparmio mese</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowCommitments30}
                  onChange={(e) => handleChange('dashboardShowCommitments30', e.target.checked)}
                />
                <span>Impegni 30 giorni</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowDailySpike}
                  onChange={(e) => handleChange('dashboardShowDailySpike', e.target.checked)}
                />
                <span>Picco spesa giornaliera</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowRolling30}
                  onChange={(e) => handleChange('dashboardShowRolling30', e.target.checked)}
                />
                <span>Confronto 30g vs 30g</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowEmergencyFund}
                  onChange={(e) => handleChange('dashboardShowEmergencyFund', e.target.checked)}
                />
                <span>Copertura fondo emergenza</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowCategorizationScore}
                  onChange={(e) => handleChange('dashboardShowCategorizationScore', e.target.checked)}
                />
                <span>Indice categorizzazione 30g</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowSpendingMomentum}
                  onChange={(e) => handleChange('dashboardShowSpendingMomentum', e.target.checked)}
                />
                <span>Momentum spese 7g</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowSubscriptionHealth}
                  onChange={(e) => handleChange('dashboardShowSubscriptionHealth', e.target.checked)}
                />
                <span>Salute abbonamenti</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowFocusToday}
                  onChange={(e) => handleChange('dashboardShowFocusToday', e.target.checked)}
                />
                <span>Focus Oggi</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowSubscriptionsDue}
                  onChange={(e) => handleChange('dashboardShowSubscriptionsDue', e.target.checked)}
                />
                <span>Abbonamenti in scadenza</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowSubscriptionsOverdue}
                  onChange={(e) => handleChange('dashboardShowSubscriptionsOverdue', e.target.checked)}
                />
                <span>Abbonamenti scaduti</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowSmartInsights}
                  onChange={(e) => handleChange('dashboardShowSmartInsights', e.target.checked)}
                />
                <span>Insights intelligenti</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowForecast}
                  onChange={(e) => handleChange('dashboardShowForecast', e.target.checked)}
                />
                <span>Forecast 30/60/90 giorni</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowInsightsBase}
                  onChange={(e) => handleChange('dashboardShowInsightsBase', e.target.checked)}
                />
                <span>Insights (card standard)</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowTop5}
                  onChange={(e) => handleChange('dashboardShowTop5', e.target.checked)}
                />
                <span>Top 5 spese & entrate</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowBudgetAlerts}
                  onChange={(e) => handleChange('dashboardShowBudgetAlerts', e.target.checked)}
                />
                <span>Alert Budget</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowActions}
                  onChange={(e) => handleChange('dashboardShowActions', e.target.checked)}
                />
                <span>Azioni consigliate oggi</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowBirthdays}
                  onChange={(e) => handleChange('dashboardShowBirthdays', e.target.checked)}
                />
                <span>Prossimi compleanni</span>
              </label>
              <div className="dashboard-order">
                <div className="dashboard-order-title">Ordine sezioni</div>
                <div className="dashboard-order-list">
                  {orderedDashboardSections.map((section, index) => (
                    <div
                      key={section.id}
                      className={`dashboard-order-item ${section.required ? 'locked' : ''} ${dragIndex === index ? 'dragging' : ''}`}
                      draggable={!section.required && !isMobileSettings}
                      onDragStart={(e) => handleDragStart(index, e)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverIndex(index);
                      }}
                      onDragLeave={() => setDragOverIndex(null)}
                      onDrop={() => handleDrop(index)}
                      onDragEnd={() => {
                        setDragIndex(null);
                        setDragOverIndex(null);
                      }}
                      data-drag-over={dragOverIndex === index ? 'true' : 'false'}
                    >
                      <span className="drag-handle">↕</span>
                      <span className="order-label">{section.label}</span>
                      {section.required ? (
                        <span className="order-badge">Sempre visibile</span>
                      ) : (
                        <div className="order-mobile-actions">
                          <button
                            type="button"
                            className="order-move-btn"
                            onClick={() => moveDashboardSection(index, 'up')}
                            aria-label={`Sposta su ${section.label}`}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="order-move-btn"
                            onClick={() => moveDashboardSection(index, 'down')}
                            aria-label={`Sposta giu ${section.label}`}
                          >
                            ↓
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <small>
                  {isMobileSettings
                    ? 'Su mobile usa i pulsanti su/giu per cambiare ordine.'
                    : 'Trascina le sezioni per cambiare l’ordine nella dashboard.'}
                </small>
              </div>
              <div className="dashboard-order">
                <div className="dashboard-order-title">Anteprima live ordine</div>
                <div className="dashboard-order-list">
                  <div className="dashboard-order-item locked">
                    <span className="drag-handle">D</span>
                    <span className="order-label">
                      Desktop: {previewOrder.desktop.map((id) => getSectionLabel(id)).join(' > ')}
                    </span>
                  </div>
                  <div className="dashboard-order-item locked">
                    <span className="drag-handle">M</span>
                    <span className="order-label">
                      Mobile: {previewOrder.mobile.map((id) => getSectionLabel(id)).join(' > ')}
                    </span>
                  </div>
                </div>
              </div>
              <small>Puoi modificare queste opzioni in qualsiasi momento.</small>
            </div>
          </div>

          <div className="setting-section">
            <h3>Informazioni Sistema</h3>
            <div className="system-info">
              <div className="info-row">
                <span className="info-label">Versione App:</span>
                <span className="info-value">Aurora 4.0</span>
              </div>
              <div className="info-row">
                <span className="info-label">Ultimo Aggiornamento:</span>
                <span className="info-value">Febbraio 2026</span>
              </div>
              <div className="info-row">
                <span className="info-label">ID Utente:</span>
                <span className="info-value" style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                  {user?.uid?.substring(0, 20)}...
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Log runtime locali:</span>
                <span className="info-value">{runtimeIssueCount}</span>
              </div>
              <div className="settings-inline-actions">
                <button type="button" className="btn-secondary-settings" onClick={handleExportRuntimeLogs}>
                  Esporta log runtime
                </button>
                <button type="button" className="btn-secondary-settings" onClick={handleClearRuntimeLogs}>
                  Pulisci log runtime
                </button>
              </div>
            </div>
          </div>

          <div className="setting-section">
            <h3>Onboarding</h3>
            <p className="section-description">
              Gestisci la guida rapida mostrata alla prima apertura.
            </p>
            <div className="setting-form">
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!settings.onboardingDisabled}
                  onChange={(e) => handleChange('onboardingDisabled', !e.target.checked)}
                />
                <span>Mostra guida rapida iniziale</span>
              </label>
              <div className="settings-inline-actions">
                <button type="button" className="btn-secondary-settings" onClick={handleReopenOnboarding}>
                  Rivedi guida adesso
                </button>
              </div>
            </div>
          </div>

          <div className="setting-section">
            <h3>Backup Dati</h3>
            <p className="section-description">Esporta backup completo o selettivo in JSON.</p>
            <div className="setting-form">
              <div className="settings-inline-actions">
                <button onClick={() => handleExportBackup('full')} disabled={exporting} className="btn-save-settings" type="button">
                  {exporting ? 'Esportazione...' : 'Backup completo'}
                </button>
                <button onClick={() => handleExportBackup('finance')} disabled={exporting} className="btn-secondary-settings" type="button">
                  Solo finanza
                </button>
                <button onClick={() => handleExportBackup('planner')} disabled={exporting} className="btn-secondary-settings" type="button">
                  Solo planner
                </button>
              </div>
              <hr style={{ borderColor: 'rgba(148,163,184,0.2)', margin: '12px 0' }} />
              <div className="form-group">
                <label htmlFor="restoreProfile">Profilo ripristino</label>
                <select
                  id="restoreProfile"
                  value={restoreProfile}
                  onChange={(e) => {
                    setRestoreProfile(e.target.value);
                    setRestorePlan(null);
                  }}
                  className="settings-select"
                >
                  <option value="full">Completo</option>
                  <option value="finance">Solo finanza</option>
                  <option value="planner">Solo planner</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="restoreMode">Modalita ripristino</label>
                <select
                  id="restoreMode"
                  value={restoreMode}
                  onChange={(e) => {
                    setRestoreMode(e.target.value);
                    setRestorePlan(null);
                  }}
                  className="settings-select"
                >
                  <option value="merge">Merge (aggiorna esistenti)</option>
                  <option value="createOnly">Solo nuovi (non sovrascrive)</option>
                  <option value="conflictsOnly">Aggiorna solo conflitti</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="restoreBackupFile">Importa backup JSON</label>
                <input
                  id="restoreBackupFile"
                  type="file"
                  accept=".json,application/json"
                  onChange={handleBackupFileSelected}
                  className="settings-input"
                />
              </div>
              {restoreSummary && (
                <div className="dashboard-order">
                  <div className="dashboard-order-title">Anteprima ripristino ({restoreSummary.total})</div>
                  <div className="dashboard-order-list">
                    {restoreSummary.collections.map((item) => (
                      <div key={item.collection} className="dashboard-order-item locked">
                        <span className="order-label">{item.collection}</span>
                        <span className="order-badge">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="settings-inline-actions">
                <button
                  onClick={handleAnalyzeRestorePlan}
                  disabled={restoreDryRunBusy || !restorePayload}
                  className="btn-secondary-settings"
                  type="button"
                >
                  {restoreDryRunBusy ? 'Analisi...' : 'Analizza conflitti'}
                </button>
                <button
                  onClick={handleRestoreBackup}
                  disabled={restoring || !restorePayload || !restorePlan}
                  className="btn-secondary-settings"
                  type="button"
                >
                  {restoring ? 'Ripristino...' : 'Ripristina ora'}
                </button>
                <button
                  onClick={handleUndoLastRestore}
                  disabled={undoingRestore || !lastRestoreSnapshot}
                  className="btn-secondary-settings"
                  type="button"
                >
                  {undoingRestore ? 'Rollback...' : 'Annulla ultimo ripristino'}
                </button>
              </div>
              {lastRestoreSnapshot && (
                <small>
                  Ultimo restore: {new Date(lastRestoreSnapshot.at).toLocaleString('it-IT')} - {lastRestoreSnapshot.written} record
                </small>
              )}
              {restorePlan && (
                <div className="dashboard-order">
                  <div className="dashboard-order-title">
                    Dry-run: nuovi {restorePlan.toCreate}, aggiornamenti {restorePlan.toUpdate}, conflitti {restorePlan.conflicts}, saltati {restorePlan.skipped}
                  </div>
                  <div className="restore-plan-chips">
                    <span className="restore-plan-chip create">+ Nuovi: {restorePlan.toCreate}</span>
                    <span className="restore-plan-chip update">~ Aggiornamenti: {restorePlan.toUpdate}</span>
                    <span className={`restore-plan-chip ${restorePlan.conflicts > 0 ? 'conflict' : 'safe'}`}>
                      ! Conflitti: {restorePlan.conflicts}
                    </span>
                    <span className="restore-plan-chip skip">- Saltati: {restorePlan.skipped}</span>
                  </div>
                  {restorePlan.conflicts >= 5 && (
                    <div className="restore-plan-alert danger">
                      Attenzione: conflitti elevati ({restorePlan.conflicts}). Valuta prima modalita "Solo nuovi" o "Solo conflitti".
                    </div>
                  )}
                  {restorePlan.conflicts > 0 && restorePlan.conflicts < 5 && (
                    <div className="restore-plan-alert warn">
                      Conflitti rilevati: controlla i dettagli per collezione prima del ripristino.
                    </div>
                  )}
                  <div className="dashboard-order-list">
                    {restorePlan.byCollection.map((row) => (
                      <div key={`${row.collection}-plan`} className="dashboard-order-item locked">
                        <span className="order-label">
                          {row.collection}: +{row.toCreate} / ~{row.toUpdate} / !{row.conflicts} / -{row.skipped}
                        </span>
                        <span className="order-badge">{row.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="settings-actions">
          <button onClick={handleSave} disabled={saving} className="btn-save-settings" type="button">
            {saving ? (
              <>
                <div className="loading-spinner"></div>
                Salvataggio...
              </>
            ) : (
              <>
                <FiCheck style={{ marginRight: '8px' }} />
                Salva Impostazioni
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsContent;
