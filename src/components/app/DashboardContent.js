import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFinancial } from '../../contexts/FinancialContext';
import { getCurrencySymbol } from '../../utils/currency';
import { getBudgetsByMonth } from '../../services/budgetsService';
import { getBirthdays, getDaysUntilBirthday, calculateAge } from '../../services/birthdaysService';
import { getSubscriptions } from '../../services/subscriptionsService';
import { getSavingsGoals } from '../../services/savingsGoalsService';
import LiveClock from './LiveClock';
import { formatNumber } from '../../utils/format';
import { formatEntityLabel } from '../../utils/text';
import { normalizeDashboardOrder } from '../../utils/dashboardLayout';
import { computeFinancialHealth } from '../../utils/financialHealth';
import { buildMonthCloseChecklist, buildMonthCloseSnapshot } from '../../utils/monthClose';
import { computeTransactionAnomalies } from '../../utils/transactionAnomalies';
import { computeLiquidityRadar } from '../../utils/liquidityRadar';
import { computeWeeklyPulse } from '../../utils/weeklyPulse';
import { buildAgendaTimeline } from '../../utils/agendaTimeline';
import { computeMonthEndStress } from '../../utils/monthEndStress';
import { computePriorityGoal } from '../../utils/goalsPriority';
import { analyzeDataQuality } from '../../utils/dataQuality';
import { computeAccountRiskRadar } from '../../utils/accountRiskRadar';
import { computeDailyPace } from '../../utils/dailyPace';
import { computeIncomeRunRate } from '../../utils/incomeRunRate';
import { buildTrend14Days } from '../../utils/trend14Days';
import { computeTopCategories7Days } from '../../utils/topCategories7Days';
import { computeWeekendSpend } from '../../utils/weekendSpend';
import { computeSubscriptionBurden } from '../../utils/subscriptionBurden';
import { computeNoSpendStreak } from '../../utils/noSpendStreak';
import { computeBurnRate7Days } from '../../utils/burnRate7Days';
import { buildWeeklyMissions } from '../../utils/weeklyMissions';
import { computeIncomeConcentration } from '../../utils/incomeConcentration';
import { computeCashCrunch14 } from '../../utils/cashCrunch14';
import { computeExpenseVolatility30 } from '../../utils/expenseVolatility30';
import { computeSavingsTargetTracker } from '../../utils/savingsTargetTracker';
import { computeUpcomingCommitments30 } from '../../utils/upcomingCommitments30';
import { computeDailySpike30 } from '../../utils/dailySpike30';
import { computeRolling30Comparison } from '../../utils/rolling30Comparison';
import { computeEmergencyFundCoverage } from '../../utils/emergencyFundCoverage';
import { computeCategorizationScore30 } from '../../utils/categorizationScore30';
import { computeSpendingMomentum7 } from '../../utils/spendingMomentum7';
import { computeSubscriptionHealth } from '../../utils/subscriptionHealth';
import {
  getMaxSubscriptionNotificationDays,
  normalizeSubscriptionNotificationOffsets
} from '../../utils/subscriptionsNotifications';

const InsightsSection = React.lazy(() => import('./InsightsSection'));

function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getMonthPeriodKey(year, monthIndex) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

const DashboardContent = React.memo(function DashboardContent({ setActiveMenu, setPendingFilter }) {
  const { user, userSettings } = useAuth();
  const { transactions = [], accounts = [], categories = [] } = useFinancial();
  const cs = getCurrencySymbol(userSettings?.currency);
  const isCompactMobile = userSettings?.dashboardMobileMode === 'compact';

  const currentMonthIndex = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentMonthNumber = currentMonthIndex + 1;
  const currentMonthLabel = new Date(currentYear, currentMonthIndex, 1).toLocaleDateString('it-IT', { month: 'long' });
  const prevMonthDate = useMemo(() => {
    const d = new Date(currentYear, currentMonthIndex, 1);
    d.setMonth(d.getMonth() - 1);
    return d;
  }, [currentYear, currentMonthIndex]);
  const prevMonthIndex = prevMonthDate.getMonth();
  const prevMonthYear = prevMonthDate.getFullYear();
  const prevMonthLabel = prevMonthDate.toLocaleDateString('it-IT', { month: 'long' });
  const prevMonthPeriodKey = useMemo(
    () => getMonthPeriodKey(prevMonthYear, prevMonthIndex),
    [prevMonthYear, prevMonthIndex]
  );

  const [budgets, setBudgets] = useState([]);
  const [budgetsLoading, setBudgetsLoading] = useState(false);
  const [budgetsError, setBudgetsError] = useState('');
  const [dismissedFocusIds, setDismissedFocusIds] = useState([]);
  const [storyCollapsed, setStoryCollapsed] = useState(false);
  const [monthCloseMessage, setMonthCloseMessage] = useState('');
  const [monthCloseHistory, setMonthCloseHistory] = useState(null);
  const [prevMonthSnapshot, setPrevMonthSnapshot] = useState(null);
  const [now, setNow] = useState(() => new Date());

  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const greetingLabel = useMemo(() => {
    const hour = now.getHours();
    return hour >= 14 || hour < 2 ? 'Buonasera' : 'Buongiorno';
  }, [now]);
  useEffect(() => {
    let mounted = true;
    async function loadBirthdays() {
      if (!user?.uid) return;
      try {
        const all = await getBirthdays(user.uid);
        const sorted = all
          .map((b) => ({ ...b, daysUntil: getDaysUntilBirthday(b.date) }))
          .filter((b) => b.daysUntil != null)
          .sort((a, b) => a.daysUntil - b.daysUntil)
          .slice(0, 2);
        if (mounted) setUpcomingBirthdays(sorted);
      } catch (e) {
        console.error('Errore caricamento compleanni:', e);
      }
    }
    loadBirthdays();
    return () => {
      mounted = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    let mounted = true;
    async function loadSubscriptions() {
      if (!user?.uid) return;
      try {
        const data = await getSubscriptions(user.uid);
        if (mounted) setSubscriptions(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Errore caricamento abbonamenti dashboard:', e);
      }
    }
    loadSubscriptions();
    return () => {
      mounted = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    let mounted = true;
    async function loadSavingsGoals() {
      if (!user?.uid) return;
      try {
        const data = await getSavingsGoals(user.uid);
        if (mounted) setSavingsGoals(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Errore caricamento obiettivi dashboard:', e);
      }
    }
    loadSavingsGoals();
    return () => {
      mounted = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    let mounted = true;

    async function loadBudgets() {
      if (!user?.uid) return;

      setBudgetsLoading(true);
      setBudgetsError('');
      try {
        const data = await getBudgetsByMonth(user.uid, currentYear, currentMonthNumber);
        if (mounted) setBudgets(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Errore budgets:', e);
        if (mounted) setBudgetsError(e?.message || 'Errore caricamento budgets');
      } finally {
        if (mounted) setBudgetsLoading(false);
      }
    }

    loadBudgets();
    return () => {
      mounted = false;
    };
  }, [user?.uid, currentYear, currentMonthNumber]);

  const parseDate = useCallback((date) => {
    if (!date) return new Date();
    if (date && typeof date === 'object' && typeof date.toDate === 'function') return date.toDate();
    if (date instanceof Date) return date;
    return new Date(date);
  }, []);

  const getAmount = useCallback((t) => {
    const n = Number(t?.amount);
    return Number.isFinite(n) ? n : 0;
  }, []);

  const getType = useCallback((t) => {
    if (t?.type === 'income' || t?.type === 'expense' || t?.type === 'transfer') return t.type;
    return getAmount(t) >= 0 ? 'income' : 'expense';
  }, [getAmount]);

  const getAccountName = useCallback((t) => {
    const acc = accounts.find((a) => a.id === t?.accountId);
    return acc?.name || 'Conto';
  }, [accounts]);

  const looksLikeInternalId = useCallback((value) => {
    const v = String(value || '').trim();
    if (!v) return false;
    if (v.includes('_') && /\d/.test(v)) return true;
    if (!v.includes(' ') && /^[A-Za-z0-9_-]{16,}$/.test(v)) return true;
    return false;
  }, []);

  const getCategoryName = useCallback((t) => {
    const subCandidates = [t?.subCategoryId, t?.subCategory, t?.subcategory]
      .map((v) => String(v || '').trim())
      .filter(Boolean);
    const candidates = [
      t?.categoryId,
      t?.category,
      t?.categoryName
    ].map((v) => String(v || '').trim()).filter(Boolean);

    for (const raw of candidates) {
      const foundById = categories.find((c) => c.id === raw);
      if (foundById?.name) return foundById.name;

      const foundByName = categories.find((c) => String(c?.name || '').trim().toLowerCase() === raw.toLowerCase());
      if (foundByName?.name) return foundByName.name;

      const inferredFromTx = transactions.find((tx) => {
        const sameCategory = String(tx?.categoryId || tx?.category || '').trim() === raw;
        const txName = String(tx?.categoryName || '').trim();
        return sameCategory && txName && !looksLikeInternalId(txName);
      });
      if (inferredFromTx?.categoryName) return String(inferredFromTx.categoryName).trim();

      if (!looksLikeInternalId(raw)) return raw;
    }

    for (const subRaw of subCandidates) {
      const inferredFromSubTx = transactions.find((tx) => {
        const sameSub =
          String(tx?.subCategoryId || '').trim() === subRaw ||
          String(tx?.subCategory || '').trim() === subRaw ||
          String(tx?.subcategory || '').trim() === subRaw;
        const txCatName = String(tx?.categoryName || '').trim();
        return sameSub && txCatName && !looksLikeInternalId(txCatName);
      });
      if (inferredFromSubTx?.categoryName) return String(inferredFromSubTx.categoryName).trim();
    }

    return 'Senza categoria';
  }, [categories, transactions, looksLikeInternalId]);

  const getSubCategoryName = useCallback((t) => {
    const categoryCandidates = [t?.categoryId, t?.category, t?.categoryName]
      .map((v) => String(v || '').trim())
      .filter(Boolean);
    const subCandidates = [t?.subCategoryId, t?.subCategory, t?.subcategory, t?.subCategoryName]
      .map((v) => String(v || '').trim())
      .filter(Boolean);
    if (!subCandidates.length) return '';

    let catObj = null;
    for (const catRaw of categoryCandidates) {
      catObj =
        categories.find((c) => c.id === catRaw) ||
        categories.find((c) => String(c?.name || '').trim().toLowerCase() === catRaw.toLowerCase()) ||
        null;
      if (catObj) break;
    }

    const catSubs = catObj ? (catObj.subCategories || catObj.subcategories || catObj.children || []) : [];

    for (const raw of subCandidates) {
      const inCategory =
        catSubs.find((s) => s?.id === raw) ||
        catSubs.find((s) => String(s?.name || '').trim().toLowerCase() === raw.toLowerCase());
      if (inCategory?.name) return inCategory.name;

      for (const c of categories) {
        const subs = c?.subCategories || c?.subcategories || c?.children || [];
        const foundGlobal =
          subs.find((s) => s?.id === raw) ||
          subs.find((s) => String(s?.name || '').trim().toLowerCase() === raw.toLowerCase());
        if (foundGlobal?.name) return foundGlobal.name;
      }

      const inferredFromTx = transactions.find((tx) => {
        const sameSub =
          String(tx?.subCategoryId || '').trim() === raw ||
          String(tx?.subCategory || '').trim() === raw ||
          String(tx?.subcategory || '').trim() === raw;
        const txSubName = String(tx?.subCategoryName || '').trim();
        return sameSub && txSubName && !looksLikeInternalId(txSubName);
      });
      if (inferredFromTx?.subCategoryName) return String(inferredFromTx.subCategoryName).trim();

      if (!looksLikeInternalId(raw)) return raw;
    }
    return '';
  }, [categories, transactions, looksLikeInternalId]);

  const toTitleCase = useCallback((value) => formatEntityLabel(value), []);

  const monthlyTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const d = parseDate(t.date);
      return d.getMonth() === currentMonthIndex && d.getFullYear() === currentYear;
    });
  }, [transactions, currentMonthIndex, currentYear, parseDate]);

  const prevMonthTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const d = parseDate(t.date);
      return d.getMonth() === prevMonthIndex && d.getFullYear() === prevMonthYear;
    });
  }, [transactions, prevMonthIndex, prevMonthYear, parseDate]);

  const monthlyIncome = useMemo(() => {
    return monthlyTransactions
      .filter((t) => getType(t) === 'income')
      .reduce((sum, t) => sum + Math.abs(getAmount(t)), 0);
  }, [monthlyTransactions, getType, getAmount]);

  const monthlyExpenses = useMemo(() => {
    return monthlyTransactions
      .filter((t) => getType(t) === 'expense')
      .reduce((sum, t) => sum + Math.abs(getAmount(t)), 0);
  }, [monthlyTransactions, getType, getAmount]);

  const prevMonthIncome = useMemo(() => {
    return prevMonthTransactions
      .filter((t) => getType(t) === 'income')
      .reduce((sum, t) => sum + Math.abs(getAmount(t)), 0);
  }, [prevMonthTransactions, getType, getAmount]);

  const prevMonthExpenses = useMemo(() => {
    return prevMonthTransactions
      .filter((t) => getType(t) === 'expense')
      .reduce((sum, t) => sum + Math.abs(getAmount(t)), 0);
  }, [prevMonthTransactions, getType, getAmount]);

  const monthlySavings = useMemo(() => monthlyIncome - monthlyExpenses, [monthlyIncome, monthlyExpenses]);
  const prevMonthReferenceIncome = prevMonthSnapshot?.income ?? prevMonthIncome;
  const prevMonthReferenceExpenses = prevMonthSnapshot?.expenses ?? prevMonthExpenses;
  const prevMonthReferenceSavings = useMemo(
    () => prevMonthReferenceIncome - prevMonthReferenceExpenses,
    [prevMonthReferenceIncome, prevMonthReferenceExpenses]
  );
  const savingsDelta = useMemo(
    () => monthlySavings - prevMonthReferenceSavings,
    [monthlySavings, prevMonthReferenceSavings]
  );
  const totalBalance = useMemo(
    () => accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0),
    [accounts]
  );

  const topMonthlyExpenses = useMemo(() => {
    return monthlyTransactions
      .filter((t) => getType(t) === 'expense')
      .map((t) => ({
        id: t.id,
        description: t.description || getCategoryName(t),
        category: getCategoryName(t),
        account: getAccountName(t),
        amount: Math.abs(getAmount(t)),
        date: parseDate(t.date)
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [monthlyTransactions, getAmount, getType, getCategoryName, getAccountName, parseDate]);

  const topMonthlyIncomes = useMemo(() => {
    return monthlyTransactions
      .filter((t) => getType(t) === 'income')
      .map((t) => ({
        id: t.id,
        description: t.description || getCategoryName(t),
        category: getCategoryName(t),
        account: getAccountName(t),
        amount: Math.abs(getAmount(t)),
        date: parseDate(t.date)
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [monthlyTransactions, getAmount, getType, getCategoryName, getAccountName, parseDate]);

  const monthlyExpenseByCategoryKey = useMemo(() => {
    return monthlyTransactions
      .filter((t) => getType(t) === 'expense')
      .reduce((acc, t) => {
        const key = t?.categoryId || t?.categoryName || t?.category || 'Senza categoria';
        acc[key] = (acc[key] || 0) + Math.abs(getAmount(t));
        return acc;
      }, {});
  }, [monthlyTransactions, getType, getAmount]);

  const monthlyExpenseByCategoryName = useMemo(() => {
    return monthlyTransactions
      .filter((t) => getType(t) === 'expense')
      .reduce((acc, t) => {
        const rawName = t?.categoryName || t?.category || '';
        const name = String(rawName).trim().toLowerCase();
        if (!name) return acc;
        acc[name] = (acc[name] || 0) + Math.abs(getAmount(t));
        return acc;
      }, {});
  }, [monthlyTransactions, getType, getAmount]);

  const budgetByCategoryId = useMemo(() => {
    return (budgets || []).reduce((acc, b) => {
      if (!b?.categoryId) return acc;
      acc[b.categoryId] = b;
      return acc;
    }, {});
  }, [budgets]);

  const budgetByCategoryName = useMemo(() => {
    return (budgets || []).reduce((acc, b) => {
      const name = String(b?.categoryName || '').trim().toLowerCase();
      if (!name) return acc;
      acc[name] = b;
      return acc;
    }, {});
  }, [budgets]);

  const budgetAlerts = useMemo(() => {
    return categories
      .filter((c) => c?.type === 'expense')
      .map((c) => {
        const byName = budgetByCategoryName[String(c?.name || '').trim().toLowerCase()];
        const b = budgetByCategoryId[c.id] || byName;
        if (!b) return null;

        const key = c.id;
        const label = toTitleCase(c.name || b?.categoryName || 'Categoria');
        const budget = Number(b?.amount ?? b?.budget ?? 0) || 0;
        const spent =
          monthlyExpenseByCategoryKey[key] ||
          monthlyExpenseByCategoryName[String(c?.name || '').trim().toLowerCase()] ||
          0;
        const pct = budget > 0 ? spent / budget : 0;

        let level = 'ok';
        if (budget > 0 && pct >= 1) level = 'over';
        else if (budget > 0 && pct >= 0.9) level = 'danger';
        else if (budget > 0 && pct >= 0.75) level = 'warn';
        else if (budget > 0 && pct >= 0.5) level = 'watch';

        return { key, label, budget, spent, pct, level };
      })
      .filter(Boolean)
      .sort((a, b) => b.pct - a.pct);
  }, [
    categories,
    budgetByCategoryId,
    budgetByCategoryName,
    monthlyExpenseByCategoryKey,
    monthlyExpenseByCategoryName,
    toTitleCase
  ]);

  const monthlyUncategorizedCount = useMemo(() => {
    return monthlyTransactions.filter((t) => {
      const cat = t?.categoryId || t?.category;
      const isTransfer = !!(t?.isTransfer || t?.transferId || t?.type === 'transfer');
      return !cat && !isTransfer;
    }).length;
  }, [monthlyTransactions]);

  const topExpenseBreakdown = useMemo(() => {
    const pickBestLabel = (...values) => {
      for (const v of values) {
        const txt = String(v || '').trim();
        if (!txt) continue;
        if (looksLikeInternalId(txt)) continue;
        if (['uscite', 'entrate', 'senza categoria'].includes(txt.toLowerCase())) continue;
        return txt;
      }
      return '';
    };

    const categoriesMap = new Map();
    monthlyTransactions
      .filter((t) => getType(t) === 'expense')
      .forEach((t) => {
        const categoryId = t?.categoryId || null;
        const categoryName = String(getCategoryName(t) || 'Senza categoria').trim();
        const rawSubCategory = String(getSubCategoryName(t) || '').trim();
        const bestCategoryLabel = pickBestLabel(
          t?.categoryName,
          t?.category,
          categoryName
        );
        const bestSubCategoryLabel = pickBestLabel(
          t?.subCategoryName,
          t?.subCategory,
          t?.subcategory,
          rawSubCategory
        );
        const amount = Math.abs(getAmount(t));
        const categoryKey = categoryId || categoryName;

        const currentCategory = categoriesMap.get(categoryKey) || {
          id: categoryId,
          name: bestCategoryLabel || categoryName,
          amount: 0,
          subMap: new Map()
        };
        if (
          currentCategory.name === 'Senza categoria' &&
          bestCategoryLabel
        ) {
          currentCategory.name = bestCategoryLabel;
        }
        currentCategory.amount += amount;
        if (bestSubCategoryLabel) {
          currentCategory.subMap.set(bestSubCategoryLabel, (currentCategory.subMap.get(bestSubCategoryLabel) || 0) + amount);
        }
        categoriesMap.set(categoryKey, currentCategory);
      });

    let topCategory = null;
    for (const item of categoriesMap.values()) {
      if (!topCategory || item.amount > topCategory.amount) topCategory = item;
    }
    if (!topCategory) return null;

    let topSubCategoryName = '';
    let topSubCategoryAmount = 0;
    for (const [name, amount] of topCategory.subMap.entries()) {
      if (amount > topSubCategoryAmount) {
        topSubCategoryName = name;
        topSubCategoryAmount = amount;
      }
    }

    return {
      id: topCategory.id,
      categoryName: topCategory.name,
      categoryAmount: topCategory.amount,
      subCategoryName: topSubCategoryName,
      subCategoryAmount: topSubCategoryAmount,
      hasRealSubCategory: topSubCategoryName.length > 0
    };
  }, [monthlyTransactions, getType, getCategoryName, getSubCategoryName, getAmount, looksLikeInternalId]);

  const biggestExpense = useMemo(() => {
    const out = monthlyTransactions
      .filter((t) => getType(t) === 'expense')
      .map((t) => ({
        id: t.id,
        description: t.description || getCategoryName(t),
        amount: Math.abs(getAmount(t))
      }))
      .sort((a, b) => b.amount - a.amount)[0];
    return out || null;
  }, [monthlyTransactions, getType, getCategoryName, getAmount]);

  const savingsTarget = useMemo(() => {
    const type = userSettings?.savingsTargetType || 'percent';
    const pct = Number(userSettings?.savingsTargetPercent ?? 20);
    const amount = Number(userSettings?.savingsTargetAmount ?? 0);
    if (type === 'amount' && amount > 0) return amount;
    if (monthlyIncome > 0) return Math.max(100, monthlyIncome * (pct / 100));
    if (monthlyExpenses > 0) return Math.max(50, monthlyExpenses * 0.1);
    return 0;
  }, [monthlyIncome, monthlyExpenses, userSettings?.savingsTargetType, userSettings?.savingsTargetPercent, userSettings?.savingsTargetAmount]);

  const savingsProgress = useMemo(() => {
    if (!savingsTarget) return 0;
    return Math.min(Math.max(monthlySavings / savingsTarget, 0), 1);
  }, [monthlySavings, savingsTarget]);

  const smartInsights = useMemo(() => {
    const items = [];

    if (topExpenseBreakdown) {
      const rawCategoryLabel = String(topExpenseBreakdown.categoryName || '').trim();
      const categoryLabel =
        !rawCategoryLabel || looksLikeInternalId(rawCategoryLabel) || ['uscite', 'entrate'].includes(rawCategoryLabel.toLowerCase())
          ? 'Senza categoria'
          : rawCategoryLabel;
      const rawSubCategoryLabel = String(topExpenseBreakdown.subCategoryName || '').trim();
      const subCategoryLabel = looksLikeInternalId(rawSubCategoryLabel) ? '' : rawSubCategoryLabel;
      const hasVisibleSubCategory = topExpenseBreakdown.hasRealSubCategory && !!subCategoryLabel;
      const detail = hasVisibleSubCategory
        ? `${categoryLabel}: ${cs} ${formatNumber(topExpenseBreakdown.categoryAmount)} | ${subCategoryLabel}: ${cs} ${formatNumber(topExpenseBreakdown.subCategoryAmount)}`
        : `${categoryLabel}: ${cs} ${formatNumber(topExpenseBreakdown.categoryAmount)} | nessuna sottocategoria assegnata`;
      items.push({
        id: 'top-category-subcategory',
        title: 'Categoria e sottocategoria piu costose',
        detail,
        cta: 'Vedi Transazioni',
        menu: 'transactions',
        filter: {
          type: 'search',
          value: hasVisibleSubCategory ? subCategoryLabel : categoryLabel
        },
        tone: 'info'
      });
    }

    if (biggestExpense) {
      items.push({
        id: 'biggest-expense',
        title: 'Spesa Piu Alta Del Mese',
        detail: `${biggestExpense.description} - ${cs} ${formatNumber(biggestExpense.amount)}`,
        cta: 'Vedi Transazioni',
        menu: 'transactions',
        filter: { type: 'search', value: biggestExpense.description },
        tone: 'warn'
      });
    }

    if (monthlyUncategorizedCount > 0) {
      items.push({
        id: 'uncategorized',
        title: 'Transazioni senza categoria',
        detail: `${monthlyUncategorizedCount} movimenti da sistemare`,
        cta: 'Sistema Ora',
        menu: 'transactions',
        filter: 'uncategorized',
        tone: 'danger'
      });
    }

    if (!items.length) {
      items.push({
        id: 'ok',
        title: 'Tutto in ordine',
        detail: 'Le tue categorie e spese sono ben allineate al mese.',
        cta: 'Apri Report',
        menu: 'reports',
        tone: 'ok'
      });
    }

    return items.slice(0, 3);
  }, [topExpenseBreakdown, biggestExpense, monthlyUncategorizedCount, cs, looksLikeInternalId]);

  const lastMonths = useMemo(() => {
    const out = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonthIndex - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      let income = 0;
      let expense = 0;
      for (const t of transactions) {
        const td = parseDate(t.date);
        if (td.getFullYear() !== year || td.getMonth() !== month) continue;
        const type = getType(t);
        const amt = Math.abs(getAmount(t));
        if (type === 'income') income += amt;
        if (type === 'expense') expense += amt;
      }
      const net = income - expense;
      out.push({
        key: `${year}-${month}`,
        label: d.toLocaleDateString('it-IT', { month: 'short' }),
        net
      });
    }
    return out;
  }, [transactions, parseDate, getType, getAmount, currentYear, currentMonthIndex]);

  const maxNetAbs = useMemo(() => {
    const max = Math.max(1, ...lastMonths.map((m) => Math.abs(m.net)));
    return max;
  }, [lastMonths]);

  const subscriptionNotificationOffsets = useMemo(
    () =>
      normalizeSubscriptionNotificationOffsets(
        userSettings?.subscriptionsNotificationOffsets ?? userSettings?.subscriptionsNotificationsDays
      ),
    [userSettings?.subscriptionsNotificationOffsets, userSettings?.subscriptionsNotificationsDays]
  );
  const subscriptionsReminderDays = getMaxSubscriptionNotificationDays(subscriptionNotificationOffsets);
  const includeRecurringSubscriptions = userSettings?.subscriptionsRecurringEnabled !== false;
  const includeFixedSubscriptions = userSettings?.subscriptionsFixedEnabled !== false;

  const dueSubscriptions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (subscriptions || [])
      .filter((s) => s?.active !== false)
      .filter((s) => {
        if (s?.kind === 'fixed' && !includeFixedSubscriptions) return false;
        if (s?.kind !== 'fixed' && !includeRecurringSubscriptions) return false;
        return true;
      })
      .map((s) => {
        const dueDate = s?.nextDueDate ? new Date(s.nextDueDate) : null;
        if (!dueDate || Number.isNaN(dueDate.getTime())) return null;
        dueDate.setHours(0, 0, 0, 0);
        const daysTo = Math.round((dueDate.getTime() - today.getTime()) / 86400000);
        return { ...s, dueDate, daysTo };
      })
      .filter(Boolean)
      .sort((a, b) => a.daysTo - b.daysTo);
  }, [subscriptions, includeFixedSubscriptions, includeRecurringSubscriptions]);

  const dueSubscriptionsSoon = useMemo(
    () => dueSubscriptions.filter((s) => s.daysTo <= subscriptionsReminderDays),
    [dueSubscriptions, subscriptionsReminderDays]
  );
  const overdueSubscriptions = useMemo(
    () => dueSubscriptions.filter((s) => s.daysTo < 0),
    [dueSubscriptions]
  );

  useEffect(() => {
    if (!user?.uid) return;
    if (userSettings?.subscriptionsNotificationsEnabled !== true) return;

    const targetOffsets = new Set([0, ...subscriptionNotificationOffsets]);
    const matched = dueSubscriptions.filter((s) => targetOffsets.has(s.daysTo));
    const severeOverdue = dueSubscriptions.filter((s) => s.daysTo <= -7);
    if (matched.length === 0 && severeOverdue.length === 0) return;

    const storageKey = `aurora_subs_notified_v1_${user.uid}`;
    let sent = {};
    try {
      sent = JSON.parse(localStorage.getItem(storageKey) || '{}') || {};
    } catch {
      sent = {};
    }

    const toNotify = [];
    matched.forEach((s) => {
      const dueIso = s?.dueDate instanceof Date ? s.dueDate.toISOString().slice(0, 10) : 'na';
      const dedupeKey = `${s.id}|${dueIso}|${s.daysTo}`;
      if (sent[dedupeKey]) return;
      sent[dedupeKey] = Date.now();
      toNotify.push(s);
    });
    severeOverdue.forEach((s) => {
      const dueIso = s?.dueDate instanceof Date ? s.dueDate.toISOString().slice(0, 10) : 'na';
      const dedupeKey = `${s.id}|${dueIso}|overdue7`;
      if (sent[dedupeKey]) return;
      sent[dedupeKey] = Date.now();
      toNotify.push({ ...s, _severeOverdue: true });
    });

    if (toNotify.length === 0) return;

    const entries = Object.entries(sent);
    if (entries.length > 300) {
      entries
        .sort((a, b) => Number(a[1]) - Number(b[1]))
        .slice(0, entries.length - 300)
        .forEach(([k]) => {
          delete sent[k];
        });
    }
    localStorage.setItem(storageKey, JSON.stringify(sent));

    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const makeBody = (s) => {
      if (s?._severeOverdue) {
        return `${s.name} (${s.ownerName || 'tu'}) - Scaduto da oltre 7 giorni`;
      }
      const dueLabel =
        s.daysTo < 0
          ? `Scaduto da ${Math.abs(s.daysTo)} giorni`
          : s.daysTo === 0
          ? 'Scade oggi'
          : s.daysTo === 1
          ? 'Scade domani'
          : `Scade tra ${s.daysTo} giorni`;
      return `${s.name} (${s.ownerName || 'tu'}) - ${dueLabel}`;
    };

    const sendBrowserNotifications = () => {
      toNotify.forEach((s) => {
        try {
          const title = s?._severeOverdue ? 'Abbonamento molto scaduto' : 'Promemoria abbonamento';
          new Notification(title, { body: makeBody(s) });
        } catch (e) {
          console.error('Errore notifica browser abbonamenti:', e);
        }
      });
    };

    if (Notification.permission === 'granted') {
      sendBrowserNotifications();
      return;
    }
    if (Notification.permission === 'default') {
      Notification.requestPermission()
        .then((permission) => {
          if (permission === 'granted') sendBrowserNotifications();
        })
        .catch((e) => console.error('Errore richiesta permessi notifiche:', e));
    }
  }, [
    dueSubscriptions,
    subscriptionNotificationOffsets,
    user?.uid,
    userSettings?.subscriptionsNotificationsEnabled
  ]);

  const todayActions = useMemo(() => {
    const items = [];

    const notifySubs = userSettings?.subscriptionsNotificationsEnabled === true;
    const notifyPriceIncrease = userSettings?.subscriptionsNotificationsPriceAlert === true;

    if (notifySubs && dueSubscriptionsSoon.length > 0) {
      const s = dueSubscriptionsSoon[0];
      const dueLabel =
        s.daysTo < 0 ? `${Math.abs(s.daysTo)} gg fa` : s.daysTo === 0 ? 'oggi' : s.daysTo === 1 ? 'domani' : `tra ${s.daysTo} gg`;
      const subPriority = s.daysTo < 0 ? 390 : s.daysTo === 0 ? 360 : s.daysTo <= 2 ? 300 : 240;
      items.push({
        id: 'subscription-due',
        title: 'Abbonamento in scadenza',
        detail: `${s.name} (${s.ownerName || 'tu'}) ${dueLabel}`,
        cta: 'Apri Abbonamenti',
        menu: 'subscriptions',
        level: s.daysTo < 0 ? 'danger' : s.daysTo <= 2 ? 'warn' : 'info',
        priority: subPriority
      });
    }

    if (notifyPriceIncrease) {
      const now = new Date();
      const increased = (subscriptions || [])
        .filter((s) => s?.active !== false)
        .filter((s) => {
          const increasedAt = s?.priceIncreasedAt ? new Date(s.priceIncreasedAt) : null;
          if (!increasedAt || Number.isNaN(increasedAt.getTime())) return false;
          const deltaDays = Math.round((now.getTime() - increasedAt.getTime()) / 86400000);
          return deltaDays >= 0 && deltaDays <= 30 && Number(s?.priceIncreaseDelta) > 0;
        })
        .sort((a, b) => {
          const ad = a?.priceIncreasedAt ? new Date(a.priceIncreasedAt).getTime() : 0;
          const bd = b?.priceIncreasedAt ? new Date(b.priceIncreasedAt).getTime() : 0;
          return bd - ad;
        });

      if (increased.length > 0) {
        const s = increased[0];
        const delta = Number(s?.priceIncreaseDelta) || 0;
        const pct = Number(s?.priceIncreasePercent) || 0;
        items.push({
          id: 'subscription-price-up',
          title: 'Aumento prezzo abbonamento',
          detail: `${s.name} +${cs} ${formatNumber(delta)} (${formatNumber(pct)}%)`,
          cta: 'Controlla Abbonamenti',
          menu: 'subscriptions',
          level: pct >= 15 ? 'danger' : 'warn',
          priority: pct >= 15 ? 280 : 220
        });
      }
    }

    if (monthlyIncome > 0 && monthlyExpenses > monthlyIncome) {
      items.push({
        id: 'cashflow',
        title: 'Spese mese superiori alle entrate',
        detail: `Uscite ${cs} ${formatNumber(monthlyExpenses)} vs entrate ${cs} ${formatNumber(monthlyIncome)}`,
        cta: 'Apri Reports',
        menu: 'reports',
        level: 'danger',
        priority: 380
      });
    }

    if (monthlyUncategorizedCount > 0) {
      items.push({
        id: 'uncategorized',
        title: 'Transazioni da categorizzare',
        detail: `${monthlyUncategorizedCount} movimenti del mese senza categoria`,
        cta: 'Apri Transazioni',
        menu: 'transactions',
        filter: 'uncategorized',
        level: 'warn',
        priority: 230
      });
    }

    const criticalBudget = budgetAlerts.find((a) => a.level === 'over' || a.level === 'danger' || a.level === 'warn');
    if (criticalBudget) {
      items.push({
        id: 'budget',
        title: 'Budget da monitorare',
        detail: `${criticalBudget.label}: ${Math.round((criticalBudget.pct || 0) * 100)}% utilizzato`,
        cta: 'Apri Budget',
        menu: 'budgets',
        level: criticalBudget.level === 'over' ? 'danger' : 'warn',
        priority: criticalBudget.level === 'over' ? 370 : 300
      });
    }

    const nearBirthday = upcomingBirthdays.find((b) => (b.daysUntil ?? 999) <= 7);
    if (nearBirthday) {
      items.push({
        id: 'birthday',
        title: 'Compleanno imminente',
        detail: `${nearBirthday.name} ${nearBirthday.daysUntil === 0 ? 'oggi' : `tra ${nearBirthday.daysUntil} giorni`}`,
        cta: 'Apri Compleanni',
        menu: 'birthdays',
        level: 'info',
        priority: 180
      });
    }

    if (items.length === 0) {
      items.push({
        id: 'ok',
        title: 'Situazione sotto controllo',
        detail: 'Nessuna urgenza: puoi registrare nuove operazioni o controllare i report.',
        cta: 'Aggiungi Transazione',
        menu: 'transactions',
        level: 'ok',
        priority: 50
      });
    }

    return items
      .sort((a, b) => {
        const p = (Number(b?.priority) || 0) - (Number(a?.priority) || 0);
        if (p !== 0) return p;
        const levelRank = { danger: 4, warn: 3, info: 2, ok: 1 };
        return (levelRank[b?.level] || 0) - (levelRank[a?.level] || 0);
      })
      .slice(0, 4);
  }, [
    monthlyIncome,
    monthlyExpenses,
    monthlyUncategorizedCount,
    budgetAlerts,
    upcomingBirthdays,
    cs,
    dueSubscriptionsSoon,
    subscriptions,
    userSettings?.subscriptionsNotificationsEnabled,
    userSettings?.subscriptionsNotificationsPriceAlert
  ]);

  const forecastData = useMemo(() => {
    const horizons = [30, 60, 90];
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 90);
    const totalCurrentBalance = accounts.reduce((sum, acc) => sum + (Number(acc?.balance) || 0), 0);

    const recentTx = (transactions || []).filter((t) => {
      const d = parseDate(t?.date);
      return d >= start && d <= now;
    });

    const totalNet90 = recentTx.reduce((sum, t) => sum + (Number(t?.amount) || 0), 0);
    const totalDailyNet = totalNet90 / 90;

    const cards = horizons.map((days) => {
      const projected = totalCurrentBalance + totalDailyNet * days;
      return {
        days,
        projected,
        level: projected < 0 ? 'danger' : projected < totalCurrentBalance * 0.85 ? 'warn' : 'ok'
      };
    });

    const riskyAccounts = (accounts || [])
      .map((acc) => {
        const current = Number(acc?.balance) || 0;
        const accNet90 = recentTx
          .filter((t) => t?.accountId === acc.id)
          .reduce((sum, t) => sum + (Number(t?.amount) || 0), 0);
        const daily = accNet90 / 90;
        const p30 = current + daily * 30;
        const p60 = current + daily * 60;
        const p90 = current + daily * 90;
        const riskHorizon = p30 < 0 ? 30 : p60 < 0 ? 60 : p90 < 0 ? 90 : null;
        return {
          id: acc.id,
          name: acc.name || 'Conto',
          current,
          p30,
          p60,
          p90,
          riskHorizon
        };
      })
      .filter((a) => a.riskHorizon !== null)
      .sort((a, b) => a.riskHorizon - b.riskHorizon)
      .slice(0, 3);

    return { cards, riskyAccounts };
  }, [accounts, transactions, parseDate]);

  const dailyBrief = useMemo(() => {
    const topActions = todayActions.slice(0, 3);
    const criticalBudget = budgetAlerts.find((a) => a.level === 'over' || a.level === 'danger' || a.level === 'warn');
    const monthProgress = new Date().getDate();
    const monthlyDeficit = Math.max(0, monthlyExpenses - monthlyIncome);
    const disposableEstimate = Math.max(monthlyExpenses * 0.35, 0);

    let decision = {
      id: 'review-reports',
      title: 'Rivedi il cashflow settimanale',
      detail: 'Fai un check rapido dei movimenti recenti per confermare il ritmo del mese.',
      impactLabel: `Impatto stimato: +${cs} ${formatNumber(Math.max(monthlyIncome * 0.02, 15))} di margine entro fine mese`,
      cta: 'Apri Reports',
      menu: 'reports'
    };

    if (criticalBudget) {
      const suggestedCut = Math.max((criticalBudget.spent || 0) * 0.1, 10);
      decision = {
        id: 'budget-cut',
        title: `Riduci la categoria "${criticalBudget.label}" per 7 giorni`,
        detail: `La categoria e al ${Math.round((criticalBudget.pct || 0) * 100)}%: piccolo taglio tattico per rientrare.`,
        impactLabel: `Impatto stimato: +${cs} ${formatNumber(suggestedCut)} questo mese`,
        cta: 'Apri Budget',
        menu: 'budgets'
      };
    } else if (monthlyDeficit > 0) {
      const recoverable = Math.min(monthlyDeficit, disposableEstimate * 0.2);
      decision = {
        id: 'deficit-recovery',
        title: 'Blocca le spese non essenziali fino a fine settimana',
        detail: `Hai un delta negativo di ${cs} ${formatNumber(monthlyDeficit)} tra entrate e uscite.`,
        impactLabel: `Impatto stimato: +${cs} ${formatNumber(Math.max(recoverable, 20))} di recupero`,
        cta: 'Apri Transazioni',
        menu: 'transactions'
      };
    } else if (monthlyUncategorizedCount > 0) {
      decision = {
        id: 'categorize-fast',
        title: 'Completa la categorizzazione in sospeso',
        detail: `${monthlyUncategorizedCount} movimenti non categorizzati limitano la precisione degli insight.`,
        impactLabel: 'Impatto stimato: priorita piu accurate nelle prossime 24h',
        cta: 'Apri Transazioni',
        menu: 'transactions',
        filter: 'uncategorized'
      };
    }

    const winText =
      monthlySavings >= 0
        ? `Vittoria del mese: risparmio attuale ${cs} ${formatNumber(monthlySavings)}.`
        : `Vittoria del mese: hai gia registrato ${transactions.length} movimenti, base dati affidabile.`;

    const riskText =
      monthlyDeficit > 0
        ? 'Attenzione alta'
        : criticalBudget
        ? 'Attenzione media'
        : 'Sotto controllo';

    return {
      riskText,
      progressText: `${currentMonthLabel} - giorno ${monthProgress}`,
      winText,
      topActions,
      decision
    };
  }, [
    todayActions,
    budgetAlerts,
    monthlyExpenses,
    monthlyIncome,
    monthlyUncategorizedCount,
    monthlySavings,
    transactions.length,
    currentMonthLabel,
    cs
  ]);

  const showSmartInsights = userSettings?.dashboardShowSmartInsights === true;
  const showDailyBrief = userSettings?.dashboardShowDailyBrief === true;
  const showDecisionEngine = userSettings?.dashboardShowDecisionEngine === true;
  const showForecast = false;
  const showInsightsBase = false;
  const showTop5 = userSettings?.dashboardShowTop5 === true;
  const showBudgetAlerts = userSettings?.dashboardShowBudgetAlerts === true;
  const showActions = userSettings?.dashboardShowActions === true;
  const showBirthdays = userSettings?.dashboardShowBirthdays === true;
  const showFocusToday = userSettings?.dashboardShowFocusToday === true;
  const showMonthClose = userSettings?.dashboardShowMonthClose !== false;
  const showAnomalies = userSettings?.dashboardShowAnomalies === true;
  const showLiquidityRadar = userSettings?.dashboardShowLiquidityRadar === true;
  const showWeeklyPulse = false;
  const showAgenda14 = userSettings?.dashboardShowAgenda14 === true;
  const showMonthEndStress = userSettings?.dashboardShowMonthEndStress === true;
  const showGoalsPriority = false;
  const showDataQuality = userSettings?.dashboardShowDataQuality === true;
  const showAccountRisk = userSettings?.dashboardShowAccountRisk === true;
  const showDailyPace = false;
  const showIncomeRunRate = userSettings?.dashboardShowIncomeRunRate === true;
  const showTrend14 = false;
  const showTopCategories7 = false;
  const showWeekendSpend = userSettings?.dashboardShowWeekendSpend === true;
  const showSubscriptionBurden = userSettings?.dashboardShowSubscriptionBurden === true;
  const showNoSpend = false;
  const showBurnRate7 = false;
  const showWeeklyMissions = false;
  const showIncomeConcentration = userSettings?.dashboardShowIncomeConcentration === true;
  const showCashCrunch14 = false;
  const showExpenseVolatility = userSettings?.dashboardShowExpenseVolatility === true;
  const showSavingsTarget = userSettings?.dashboardShowSavingsTarget === true;
  const showCommitments30 = false;
  const showDailySpike = false;
  const showRolling30 = userSettings?.dashboardShowRolling30 === true;
  const showEmergencyFund = userSettings?.dashboardShowEmergencyFund === true;
  const showCategorizationScore = userSettings?.dashboardShowCategorizationScore === true;
  const showSpendingMomentum = false;
  const showSubscriptionHealth = false;
  const showSubscriptionsDue = userSettings?.dashboardShowSubscriptionsDue === true;
  const showSubscriptionsOverdue = false;
  const focusTodayItems = todayActions.slice(0, 3);
  const visibleFocusTodayItems = focusTodayItems.filter((a) => !dismissedFocusIds.includes(a.id));
  const monthCloseStorageKey = useMemo(
    () => (user?.uid ? `aurora_month_close_history_v1_${user.uid}` : ''),
    [user?.uid]
  );
  const monthlySnapshotStorageKey = useMemo(
    () => (user?.uid ? `aurora_monthly_snapshots_v1_${user.uid}` : ''),
    [user?.uid]
  );

  const getPriorityLabel = (priority) => {
    const p = Number(priority) || 0;
    if (p >= 300) return 'Alta';
    if (p >= 180) return 'Media';
    return 'Bassa';
  };

  useEffect(() => {
    if (!user?.uid) {
      setDismissedFocusIds([]);
      return;
    }
    try {
      const raw = localStorage.getItem(`aurora_focus_today_dismissed_${user.uid}_${getTodayKey()}`);
      const parsed = JSON.parse(raw || '[]');
      setDismissedFocusIds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setDismissedFocusIds([]);
    }
  }, [user?.uid]);

  const dismissFocusItem = useCallback(
    (id) => {
      if (!id || !user?.uid) return;
      setDismissedFocusIds((prev) => {
        const next = Array.from(new Set([...prev, id]));
        try {
          localStorage.setItem(
            `aurora_focus_today_dismissed_${user.uid}_${getTodayKey()}`,
            JSON.stringify(next)
          );
        } catch {
          // ignore localStorage errors
        }
        return next;
      });
    },
    [user?.uid]
  );

  const resetDismissedFocus = useCallback(() => {
    if (!user?.uid) return;
    setDismissedFocusIds([]);
    try {
      localStorage.removeItem(`aurora_focus_today_dismissed_${user.uid}_${getTodayKey()}`);
    } catch {
      // ignore localStorage errors
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!monthCloseStorageKey) {
      setMonthCloseHistory(null);
      return;
    }
    try {
      const raw = localStorage.getItem(monthCloseStorageKey);
      const parsed = JSON.parse(raw || '[]');
      const first = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
      setMonthCloseHistory(first);
    } catch {
      setMonthCloseHistory(null);
    }
  }, [monthCloseStorageKey]);

  useEffect(() => {
    if (!monthlySnapshotStorageKey) {
      setPrevMonthSnapshot(null);
      return;
    }
    try {
      const raw = localStorage.getItem(monthlySnapshotStorageKey);
      const parsed = JSON.parse(raw || '[]');
      const list = Array.isArray(parsed) ? parsed : [];
      const existing = list.find((item) => item?.period === prevMonthPeriodKey) || null;
      if (existing) {
        setPrevMonthSnapshot(existing);
        return;
      }

      const expenseByCategory = {};
      for (const tx of prevMonthTransactions) {
        if (getType(tx) !== 'expense') continue;
        const key = getCategoryName(tx);
        expenseByCategory[key] = (expenseByCategory[key] || 0) + Math.abs(getAmount(tx));
      }
      const topExpenseCategories = Object.entries(expenseByCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, amount]) => ({ name, amount }));

      const snapshot = {
        period: prevMonthPeriodKey,
        income: prevMonthIncome,
        expenses: prevMonthExpenses,
        savings: prevMonthIncome - prevMonthExpenses,
        totalBalance,
        topExpenseCategories,
        generatedAt: new Date().toISOString()
      };
      const next = [snapshot, ...list].slice(0, 24);
      localStorage.setItem(monthlySnapshotStorageKey, JSON.stringify(next));
      setPrevMonthSnapshot(snapshot);
    } catch {
      setPrevMonthSnapshot(null);
    }
  }, [
    monthlySnapshotStorageKey,
    prevMonthPeriodKey,
    prevMonthTransactions,
    prevMonthIncome,
    prevMonthExpenses,
    totalBalance,
    getType,
    getCategoryName,
    getAmount
  ]);

  const optionalSectionOrder = useMemo(() => {
    const ids = normalizeDashboardOrder(userSettings?.dashboardOrder)
      .filter((id) => !['header', 'financial', 'story'].includes(id));
    const out = {};
    ids.forEach((id, idx) => {
      out[id] = 5 + idx;
    });
    return out;
  }, [userSettings?.dashboardOrder]);

  const healthScore = useMemo(
    () =>
      computeFinancialHealth({
        monthlyIncome,
        monthlyExpenses,
        monthlyUncategorizedCount,
        totalBalance,
        savingsProgress,
        budgetAlerts,
        dueSubscriptionsSoon,
        overdueSubscriptions
      }),
    [
      monthlyIncome,
      monthlyExpenses,
      monthlyUncategorizedCount,
      totalBalance,
      savingsProgress,
      budgetAlerts,
      dueSubscriptionsSoon,
      overdueSubscriptions
    ]
  );

  const monthCloseChecklist = useMemo(
    () =>
      buildMonthCloseChecklist({
        monthlyIncome,
        monthlyExpenses,
        monthlySavings,
        monthlyUncategorizedCount,
        budgetAlerts,
        dueSubscriptionsSoon,
        overdueSubscriptions
      }),
    [
      monthlyIncome,
      monthlyExpenses,
      monthlySavings,
      monthlyUncategorizedCount,
      budgetAlerts,
      dueSubscriptionsSoon,
      overdueSubscriptions
    ]
  );

  const anomalies = useMemo(
    () =>
      computeTransactionAnomalies({
        transactions: monthlyTransactions,
        parseDate: (v) => parseDate(v),
        getAmount: (t) => getAmount(t),
        getType: (t) => getType(t),
        getCategoryName: (t) => getCategoryName(t),
        getAccountName: (t) => getAccountName(t)
      }),
    [monthlyTransactions, parseDate, getAmount, getType, getCategoryName, getAccountName]
  );

  const liquidityRadar = useMemo(
    () =>
      computeLiquidityRadar({
        totalBalance,
        monthlyExpenses,
        monthlyIncome,
        dueSubscriptionsSoon,
        overdueSubscriptions,
        accounts
      }),
    [
      totalBalance,
      monthlyExpenses,
      monthlyIncome,
      dueSubscriptionsSoon,
      overdueSubscriptions,
      accounts
    ]
  );

  const weeklyPulse = useMemo(
    () =>
      computeWeeklyPulse({
        transactions: monthlyTransactions,
        parseDate: (v) => parseDate(v),
        getAmount: (t) => getAmount(t),
        getType: (t) => getType(t)
      }),
    [monthlyTransactions, parseDate, getAmount, getType]
  );

  const agenda14 = useMemo(
    () =>
      buildAgendaTimeline({
        upcomingBirthdays,
        dueSubscriptions,
        maxDays: 14
      }),
    [upcomingBirthdays, dueSubscriptions]
  );

  const monthEndStress = useMemo(
    () =>
      computeMonthEndStress({
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        now
      }),
    [totalBalance, monthlyIncome, monthlyExpenses, now]
  );

  const goalsPriority = useMemo(
    () =>
      computePriorityGoal({
        goals: savingsGoals,
        monthlySavings
      }),
    [savingsGoals, monthlySavings]
  );

  const dataQuality = useMemo(
    () =>
      analyzeDataQuality(monthlyTransactions, {
        isTransferTx: (tx) => !!(tx?.isTransfer || tx?.transferId || tx?.type === 'transfer'),
        dateKey: (d) => {
          const dt = parseDate(d);
          if (!(dt instanceof Date) || Number.isNaN(dt.getTime())) return '';
          return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        },
        normalizeDescKey: (v) => String(v || '').trim().toLowerCase()
      }),
    [monthlyTransactions, parseDate]
  );

  const accountRisk = useMemo(
    () =>
      computeAccountRiskRadar({
        accounts,
        transactions,
        parseDate: (v) => parseDate(v),
        getAmount: (t) => getAmount(t)
      }),
    [accounts, transactions, parseDate, getAmount]
  );

  const dailyPace = useMemo(
    () =>
      computeDailyPace({
        monthlyIncome,
        monthlyExpenses,
        targetSavingsRate: (Number(userSettings?.savingsTargetPercent ?? 20) || 20) / 100,
        now
      }),
    [monthlyIncome, monthlyExpenses, userSettings?.savingsTargetPercent, now]
  );

  const incomeRunRate = useMemo(
    () =>
      computeIncomeRunRate({
        monthlyIncome,
        targetIncome:
          userSettings?.savingsTargetType === 'percent'
            ? monthlyIncome
            : Math.max(0, Number(userSettings?.savingsTargetAmount || 0)) * 5,
        now
      }),
    [
      monthlyIncome,
      userSettings?.savingsTargetType,
      userSettings?.savingsTargetAmount,
      now
    ]
  );

  const trend14 = useMemo(
    () =>
      buildTrend14Days({
        transactions,
        parseDate: (v) => parseDate(v),
        getAmount: (t) => getAmount(t),
        getType: (t) => getType(t)
      }),
    [transactions, parseDate, getAmount, getType]
  );

  const topCategories7 = useMemo(
    () =>
      computeTopCategories7Days({
        transactions,
        parseDate: (v) => parseDate(v),
        getAmount: (t) => getAmount(t),
        getType: (t) => getType(t),
        getCategoryName: (t) => getCategoryName(t)
      }),
    [transactions, parseDate, getAmount, getType, getCategoryName]
  );

  const weekendSpend = useMemo(
    () =>
      computeWeekendSpend({
        transactions,
        parseDate: (v) => parseDate(v),
        getAmount: (t) => getAmount(t),
        getType: (t) => getType(t)
      }),
    [transactions, parseDate, getAmount, getType]
  );

  const subscriptionBurden = useMemo(
    () =>
      computeSubscriptionBurden({
        subscriptions,
        monthlyIncome
      }),
    [subscriptions, monthlyIncome]
  );

  const noSpendStreak = useMemo(
    () =>
      computeNoSpendStreak({
        transactions,
        parseDate: (v) => parseDate(v),
        getAmount: (t) => getAmount(t),
        getType: (t) => getType(t)
      }),
    [transactions, parseDate, getAmount, getType]
  );

  const burnRate7 = useMemo(
    () =>
      computeBurnRate7Days({
        transactions,
        parseDate: (v) => parseDate(v),
        getAmount: (t) => getAmount(t),
        getType: (t) => getType(t)
      }),
    [transactions, parseDate, getAmount, getType]
  );

  const weeklyMissions = useMemo(
    () =>
      buildWeeklyMissions({
        monthlyUncategorizedCount,
        overdueSubscriptions,
        dueSubscriptionsSoon,
        burnRateDaily: burnRate7.dailyNet,
        budgetAlerts
      }),
    [
      monthlyUncategorizedCount,
      overdueSubscriptions,
      dueSubscriptionsSoon,
      burnRate7.dailyNet,
      budgetAlerts
    ]
  );

  const incomeConcentration = useMemo(
    () =>
      computeIncomeConcentration({
        transactions,
        parseDate: (v) => parseDate(v),
        getAmount: (t) => getAmount(t),
        getType: (t) => getType(t),
        getSourceLabel: (t) => getCategoryName(t)
      }),
    [transactions, parseDate, getAmount, getType, getCategoryName]
  );

  const cashCrunch14 = useMemo(
    () =>
      computeCashCrunch14({
        totalBalance,
        burnRateDaily: burnRate7.dailyNet,
        dueSubscriptionsSoon
      }),
    [totalBalance, burnRate7.dailyNet, dueSubscriptionsSoon]
  );

  const expenseVolatility = useMemo(
    () =>
      computeExpenseVolatility30({
        transactions,
        parseDate: (v) => parseDate(v),
        getAmount: (t) => getAmount(t),
        getType: (t) => getType(t)
      }),
    [transactions, parseDate, getAmount, getType]
  );

  const savingsTargetTracker = useMemo(
    () =>
      computeSavingsTargetTracker({
        monthlyIncome,
        monthlyExpenses,
        savingsTargetType: userSettings?.savingsTargetType || 'percent',
        savingsTargetPercent: Number(userSettings?.savingsTargetPercent ?? 20),
        savingsTargetAmount: Number(userSettings?.savingsTargetAmount ?? 0),
        now
      }),
    [
      monthlyIncome,
      monthlyExpenses,
      userSettings?.savingsTargetType,
      userSettings?.savingsTargetPercent,
      userSettings?.savingsTargetAmount,
      now
    ]
  );

  const commitments30 = useMemo(
    () =>
      computeUpcomingCommitments30({
        dueSubscriptions
      }),
    [dueSubscriptions]
  );

  const dailySpike = useMemo(
    () =>
      computeDailySpike30({
        transactions,
        parseDate: (v) => parseDate(v),
        getAmount: (t) => getAmount(t),
        getType: (t) => getType(t)
      }),
    [transactions, parseDate, getAmount, getType]
  );

  const rolling30 = useMemo(
    () =>
      computeRolling30Comparison({
        transactions,
        parseDate: (v) => parseDate(v),
        getAmount: (t) => getAmount(t),
        getType: (t) => getType(t)
      }),
    [transactions, parseDate, getAmount, getType]
  );

  const emergencyFund = useMemo(
    () =>
      computeEmergencyFundCoverage({
        totalBalance,
        monthlyExpenses
      }),
    [totalBalance, monthlyExpenses]
  );

  const categorizationScore = useMemo(
    () =>
      computeCategorizationScore30({
        transactions,
        parseDate: (v) => parseDate(v)
      }),
    [transactions, parseDate]
  );

  const spendingMomentum = useMemo(
    () =>
      computeSpendingMomentum7({
        transactions,
        parseDate: (v) => parseDate(v),
        getAmount: (t) => getAmount(t),
        getType: (t) => getType(t)
      }),
    [transactions, parseDate, getAmount, getType]
  );

  const subscriptionHealth = useMemo(
    () =>
      computeSubscriptionHealth({
        subscriptions,
        dueSubscriptionsSoon,
        overdueSubscriptions
      }),
    [subscriptions, dueSubscriptionsSoon, overdueSubscriptions]
  );

  const handleRunMonthClose = useCallback(() => {
    const snapshot = buildMonthCloseSnapshot({
      userId: user?.uid,
      currency: userSettings?.currency || 'EUR',
      year: currentYear,
      month: currentMonthNumber,
      monthlyIncome,
      monthlyExpenses,
      monthlySavings,
      monthlyUncategorizedCount,
      budgetAlerts,
      dueSubscriptionsSoon,
      overdueSubscriptions
    });

    try {
      const json = JSON.stringify(snapshot, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `aurora-month-close-${snapshot.period}.json`;
      link.click();
      URL.revokeObjectURL(url);

      if (monthCloseStorageKey) {
        let history = [];
        try {
          history = JSON.parse(localStorage.getItem(monthCloseStorageKey) || '[]');
          if (!Array.isArray(history)) history = [];
        } catch {
          history = [];
        }
        const nextHistory = [snapshot, ...history].slice(0, 5);
        localStorage.setItem(monthCloseStorageKey, JSON.stringify(nextHistory));
        setMonthCloseHistory(nextHistory[0]);
      }

      setMonthCloseMessage(`Chiusura ${snapshot.period} esportata con successo.`);
    } catch (e) {
      console.error('Errore export chiusura mese:', e);
      setMonthCloseMessage('Errore durante export chiusura mese.');
    }
  }, [
    user?.uid,
    userSettings?.currency,
    currentYear,
    currentMonthNumber,
    monthlyIncome,
    monthlyExpenses,
    monthlySavings,
    monthlyUncategorizedCount,
    budgetAlerts,
    dueSubscriptionsSoon,
    overdueSubscriptions,
    monthCloseStorageKey
  ]);

  return (
    <div className="content-page">
      <div className="aurora-background">
        <div className="aurora-layer-1"></div>
        <div className="aurora-layer-2"></div>
        <div className="aurora-layer-3"></div>
      </div>

      <div className={`dashboard-content dashboard-content-home ${isCompactMobile ? 'compact-mobile' : ''}`}>
        <div className="dashboard-header" style={{ order: 0 }}>
          <div className="header-main">
            <h1>{greetingLabel}, {user?.displayName?.split(' ')[0] || 'Utente'}!</h1>
            <LiveClock />
          </div>
        </div>

        {showDailyBrief && (
        <div className="section" style={{ order: optionalSectionOrder.dailyBrief ?? 999 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <h2 className="section-title" style={{ marginBottom: 0 }}>Daily Brief</h2>
            <div style={{ opacity: 0.8, fontSize: 13 }}>{dailyBrief.progressText}</div>
          </div>
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            <div style={{ fontWeight: 600 }}>Rischio oggi: <span style={{ opacity: 0.9 }}>{dailyBrief.riskText}</span></div>
            <div style={{ opacity: 0.92 }}>{dailyBrief.winText}</div>
          </div>
          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            {dailyBrief.topActions.map((action, index) => (
              <button
                key={action.id}
                type="button"
                className="today-action-btn"
                style={{ textAlign: 'left', width: '100%' }}
                onClick={() => {
                  if (action.filter) setPendingFilter(action.filter);
                  setActiveMenu(action.menu);
                }}
              >
                {index + 1}. {action.title}
              </button>
            ))}
          </div>
        </div>
        )}

        {showDecisionEngine && (
        <div className="section" style={{ order: optionalSectionOrder.decisionEngine ?? 999 }}>
          <h2 className="section-title">Motore decisionale</h2>
          <div style={{ border: '1px solid rgba(255,255,255,0.14)', borderRadius: 12, padding: 12, background: 'rgba(255,255,255,0.04)' }}>
            <div style={{ fontWeight: 700 }}>{dailyBrief.decision.title}</div>
            <div style={{ opacity: 0.9, marginTop: 4 }}>{dailyBrief.decision.detail}</div>
            <div style={{ marginTop: 6, fontWeight: 600, color: '#93c5fd' }}>{dailyBrief.decision.impactLabel}</div>
            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                className="today-action-btn"
                onClick={() => {
                  if (dailyBrief.decision.filter) setPendingFilter(dailyBrief.decision.filter);
                  setActiveMenu(dailyBrief.decision.menu);
                }}
              >
                {dailyBrief.decision.cta}
              </button>
            </div>
          </div>
        </div>
        )}

        {!isCompactMobile && showSmartInsights && (
        <div className="section smart-insights" style={{ order: optionalSectionOrder.smartInsights ?? 999 }}>
          <h2 className="section-title">Insights intelligenti</h2>
          <div className="smart-insights-grid">
            {smartInsights.map((insight) => (
              <div key={insight.id} className={`smart-card ${insight.tone}`}>
                <div>
                  <div className="smart-title">{insight.title}</div>
                  <div className="smart-detail">{insight.detail}</div>
                </div>
                <button
                  type="button"
                  className="smart-cta"
                  onClick={() => {
                    if (insight.filter) setPendingFilter(insight.filter);
                    setActiveMenu(insight.menu);
                  }}
                >
                  {insight.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
        )}

        <div className="financial-overview" style={{ order: 1 }}>
          <div className="finance-card total-balance">
            <div className="card-content">
              <h3>Saldo Totale</h3>
              <div className="amount">
                {cs} {formatNumber(totalBalance)}
              </div>
              <div className="trend positive">{accounts.length} conti attivi</div>
            </div>
          </div>

          <div className="finance-card cash-flow">
            <div className="card-content">
              <h3>Cash Flow Mensile</h3>
              <div className="amount" style={{ color: monthlySavings >= 0 ? '#10b981' : '#ef4444' }}>
                {monthlySavings < 0 ? '-' : ''}{cs} {formatNumber(monthlySavings)}
              </div>
              <div className="cashflow-detail">
                <span className="cf-income">
                  +{cs} {formatNumber(monthlyIncome)}
                </span>
                <span className="cf-expense">
                  -{cs} {formatNumber(monthlyExpenses)}
                </span>
              </div>
            </div>
          </div>

        </div>

        <div className="section mobile-monthly-stats-section" style={{ order: 2 }}>
          <div className="header-stats mobile-only-stats">
            <div className="mini-stat">
              <div className="mini-value mini-value-income">
                {cs} {formatNumber(monthlyIncome)}
              </div>
              <div className="mini-label">Entrate Mese</div>
            </div>
            <div className="mini-stat">
              <div className="mini-value mini-value-expense">
                {cs} {formatNumber(monthlyExpenses)}
              </div>
              <div className="mini-label">Uscite Mese</div>
            </div>
          </div>
        </div>

        <div className="section hero-story" style={{ order: 3 }}>
          <div className="hero-story-main">
            <div className="hero-story-head">
              <div className="hero-story-badge">Story del mese</div>
              <button
                type="button"
                className="hero-story-toggle"
                onClick={() => setStoryCollapsed((prev) => !prev)}
              >
                {storyCollapsed ? 'Mostra' : 'Riduci'}
              </button>
            </div>
            <h2 className="hero-story-title">
              {monthlySavings >= 0 ? 'Hai risparmiato' : 'Sei in deficit di'} {cs} {formatNumber(Math.abs(monthlySavings))}
            </h2>
            {!storyCollapsed && (
              <>
                <p className="hero-story-subtitle">
                  {monthlySavings >= 0 ? 'Ottimo ritmo! ' : 'Serve un piccolo aggiustamento. '}
                  Rispetto a {prevMonthLabel}{prevMonthSnapshot ? ' (snapshot)' : ''} {savingsDelta >= 0 ? 'sei sopra di' : 'sei sotto di'} {cs}{' '}
                  {formatNumber(Math.abs(savingsDelta))}.
                </p>
                <div className="hero-mini-chart">
                  {lastMonths.map((m) => {
                    const heightPct = Math.round((Math.abs(m.net) / maxNetAbs) * 100);
                    return (
                      <div key={m.key} className="hero-mini-col">
                        <div className="hero-mini-bar">
                          <div
                            className={`hero-mini-fill ${m.net >= 0 ? 'positive' : 'negative'}`}
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                        <span>{m.label}</span>
                      </div>
                    );
                  })}
                </div>
                {savingsTarget > 0 && (
                  <div className="hero-story-progress">
                    <div className="hero-progress-head">
                      <span>
                        Obiettivo risparmio {userSettings?.savingsTargetType === 'amount'
                          ? '(fisso)'
                          : `(${Number(userSettings?.savingsTargetPercent ?? 20)}% entrate)`}
                      </span>
                      <strong>{cs} {formatNumber(savingsTarget)}</strong>
                    </div>
                    <div className="hero-progress-bar">
                      <div
                        className={`hero-progress-fill ${monthlySavings >= 0 ? 'positive' : 'negative'}`}
                        style={{ width: `${Math.round(savingsProgress * 100)}%` }}
                      />
                    </div>
                    <div className="hero-progress-meta">
                      <span>{Math.round(savingsProgress * 100)}% raggiunto</span>
                      <span>
                        {currentMonthLabel} {currentYear}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="hero-story-actions">
            <button
              type="button"
              className="hero-action primary"
              onClick={() => setActiveMenu('reports')}
            >
              Apri Report
            </button>
            <button
              type="button"
              className="hero-action ghost"
              onClick={() => setActiveMenu('transactions')}
            >
              Aggiungi Transazione
            </button>
          </div>
        </div>

        <div className={`section section-health-score ${healthScore.level}`} style={{ order: 4 }}>
          <div className="health-score-head">
            <h2 className="section-title">Health Score Finanziario</h2>
            <div className="health-score-pill">{healthScore.label}</div>
          </div>
          <div className="health-score-grid">
            <div className="health-score-main">
              <div className="health-score-value">{healthScore.score}</div>
              <div className="health-score-sub">
                Tasso risparmio mese: {healthScore.savingsRatePct >= 0 ? '+' : ''}
                {formatNumber(healthScore.savingsRatePct, 1)}%
              </div>
              <div className="health-score-sub">Rischi aperti: {healthScore.riskCount}</div>
            </div>
            <div className="health-score-missions">
              {healthScore.missions.map((m) => (
                <div key={m.id} className="health-mission-card">
                  <div className="health-mission-title">{m.title}</div>
                  <div className="health-mission-detail">{m.detail}</div>
                  <button
                    type="button"
                    className="today-action-btn"
                    onClick={() => {
                      if (m.filter) setPendingFilter(m.filter);
                      setActiveMenu(m.menu);
                    }}
                  >
                    {m.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {showMonthClose && (
        <div className={`section section-month-close ${monthCloseChecklist.overall}`} style={{ order: optionalSectionOrder.monthClose ?? 999 }}>
          <div className="month-close-head">
            <h2 className="section-title">Assistente Chiusura Mese</h2>
            <span className="month-close-pill">{currentMonthLabel} {currentYear}</span>
          </div>
          <div className="month-close-checks">
            {monthCloseChecklist.checks.map((item) => (
              <div key={item.id} className={`month-close-item ${item.status}`}>
                <div className="month-close-item-title">{item.title}</div>
                <div className="month-close-item-detail">{item.detail}</div>
              </div>
            ))}
          </div>
          <div className="month-close-actions">
            <button type="button" className="today-action-btn" onClick={handleRunMonthClose}>
              Esegui Chiusura Mese
            </button>
            <button type="button" className="today-action-btn" onClick={() => setActiveMenu('reports')}>
              Apri Report
            </button>
          </div>
          {monthCloseHistory && (
            <div className="month-close-meta">
              Ultimo export: {new Date(monthCloseHistory.generatedAt).toLocaleString('it-IT')} ({monthCloseHistory.period})
            </div>
          )}
          {monthCloseMessage && <div className="month-close-meta">{monthCloseMessage}</div>}
        </div>
        )}

        {showAnomalies && (
        <div className="section section-anomalies" style={{ order: optionalSectionOrder.anomalies ?? 999 }}>
          <div className="anomalies-head">
            <h2 className="section-title">Anomalie Transazioni</h2>
            <span className="anomalies-pill">
              {anomalies.total} trovate{anomalies.highCount > 0 ? ` (${anomalies.highCount} alte)` : ''}
            </span>
          </div>
          {anomalies.items.length === 0 ? (
            <div className="empty-state">
              <p>Nessuna anomalia rilevata per questo mese.</p>
            </div>
          ) : (
            <div className="anomalies-list">
              {anomalies.items.map((item, idx) => (
                <div key={`${item.kind}-${idx}`} className={`anomaly-card ${item.severity}`}>
                  <div className="anomaly-main">
                    <div className="anomaly-title">{item.title}</div>
                    <div className="anomaly-detail">{item.detail}</div>
                    <div className="anomaly-meta">
                      {item.category} - {item.account} - {cs} {formatNumber(item.amount)}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="today-action-btn"
                    onClick={() => {
                      setActiveMenu('transactions');
                    }}
                  >
                    Verifica
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {showLiquidityRadar && (
        <div className={`section section-liquidity-radar ${liquidityRadar.level}`} style={{ order: optionalSectionOrder.liquidityRadar ?? 999 }}>
          <div className="liquidity-head">
            <h2 className="section-title">Radar Liquidita</h2>
            <span className="liquidity-pill">Score {liquidityRadar.score}/100</span>
          </div>
          <div className="liquidity-grid">
            <div className="liquidity-kpi">
              <div className="liquidity-kpi-label">Copertura stimata</div>
              <div className="liquidity-kpi-value">{Math.max(0, Math.round(liquidityRadar.runwayDays))} giorni</div>
            </div>
            <div className="liquidity-kpi">
              <div className="liquidity-kpi-label">Spesa media giornaliera</div>
              <div className="liquidity-kpi-value">{cs} {formatNumber(liquidityRadar.avgDailyExpense)}</div>
            </div>
            <div className="liquidity-kpi">
              <div className="liquidity-kpi-label">Riserva target</div>
              <div className="liquidity-kpi-value">{cs} {formatNumber(liquidityRadar.reserveTarget)}</div>
            </div>
            <div className="liquidity-kpi">
              <div className="liquidity-kpi-label">Abbonamenti in arrivo</div>
              <div className="liquidity-kpi-value">{cs} {formatNumber(liquidityRadar.upcomingSubsCost + liquidityRadar.overdueSubsCost)}</div>
            </div>
          </div>
          <div className="liquidity-tips">
            {liquidityRadar.tips.map((tip) => (
              <div key={tip.id} className="liquidity-tip">
                <div>
                  <div className="liquidity-tip-title">{tip.title}</div>
                  <div className="liquidity-tip-detail">{tip.detail}</div>
                </div>
                <button type="button" className="today-action-btn" onClick={() => setActiveMenu(tip.menu)}>
                  {tip.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
        )}

        {showWeeklyPulse && (
        <div className={`section section-weekly-pulse ${weeklyPulse.level}`} style={{ order: optionalSectionOrder.weeklyPulse ?? 999 }}>
          <div className="weekly-pulse-head">
            <h2 className="section-title">Pulse Settimanale</h2>
            <span className="weekly-pulse-pill">{weeklyPulse.message}</span>
          </div>
          <div className="weekly-pulse-grid">
            <div className="weekly-pulse-col">
              <div className="weekly-pulse-col-title">Ultimi 7 giorni</div>
              <div className="weekly-pulse-row">Entrate: +{cs} {formatNumber(weeklyPulse.periods.last7.income)}</div>
              <div className="weekly-pulse-row">Uscite: -{cs} {formatNumber(weeklyPulse.periods.last7.expense)}</div>
              <div className="weekly-pulse-row">Netto: {weeklyPulse.periods.last7.net < 0 ? '-' : '+'}{cs} {formatNumber(Math.abs(weeklyPulse.periods.last7.net))}</div>
            </div>
            <div className="weekly-pulse-col">
              <div className="weekly-pulse-col-title">Variazione vs 7 giorni precedenti</div>
              <div className="weekly-pulse-row">Entrate: {weeklyPulse.delta.income < 0 ? '-' : '+'}{cs} {formatNumber(Math.abs(weeklyPulse.delta.income))}</div>
              <div className="weekly-pulse-row">Uscite: {weeklyPulse.delta.expense < 0 ? '-' : '+'}{cs} {formatNumber(Math.abs(weeklyPulse.delta.expense))}</div>
              <div className="weekly-pulse-row">Netto: {weeklyPulse.delta.net < 0 ? '-' : '+'}{cs} {formatNumber(Math.abs(weeklyPulse.delta.net))}</div>
            </div>
          </div>
          {weeklyPulse.topExpense && (
            <div className="weekly-pulse-highlight">
              Spesa top 7g: {weeklyPulse.topExpense.description} - {cs} {formatNumber(weeklyPulse.topExpense.amount)}
            </div>
          )}
        </div>
        )}

        {showAgenda14 && (
        <div className="section section-agenda14" style={{ order: optionalSectionOrder.agenda14 ?? 999 }}>
          <div className="agenda14-head">
            <h2 className="section-title">Agenda 14 Giorni</h2>
            <span className="agenda14-pill">
              {agenda14.total} eventi{agenda14.urgent > 0 ? `, ${agenda14.urgent} urgenti` : ''}
            </span>
          </div>
          {agenda14.items.length === 0 ? (
            <div className="empty-state">
              <p>Nessun evento nei prossimi 14 giorni.</p>
            </div>
          ) : (
            <div className="agenda14-list">
              {agenda14.items.map((event) => (
                <div key={event.id} className={`agenda14-item ${event.kind}`}>
                  <div className="agenda14-kind">{event.kind === 'birthday' ? 'Compleanno' : 'Abbonamento'}</div>
                  <div className="agenda14-main">
                    <div className="agenda14-title">{event.title}</div>
                    <div className="agenda14-detail">{event.detail}</div>
                  </div>
                  <button
                    type="button"
                    className="today-action-btn"
                    onClick={() => setActiveMenu(event.kind === 'birthday' ? 'birthdays' : 'subscriptions')}
                  >
                    Apri
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {showMonthEndStress && (
        <div className={`section section-month-end-stress ${monthEndStress.level}`} style={{ order: optionalSectionOrder.monthEndStress ?? 999 }}>
          <div className="month-end-stress-head">
            <h2 className="section-title">Stress Test Fine Mese</h2>
            <span className="month-end-stress-pill">{monthEndStress.message}</span>
          </div>
          <div className="month-end-stress-grid">
            <div className="month-end-stress-kpi">
              <div className="month-end-stress-label">Saldo stimato fine mese</div>
              <div className="month-end-stress-value">
                {monthEndStress.projectedEndBalance < 0 ? '-' : ''}{cs} {formatNumber(Math.abs(monthEndStress.projectedEndBalance))}
              </div>
            </div>
            <div className="month-end-stress-kpi">
              <div className="month-end-stress-label">Netto stimato giorni restanti</div>
              <div className="month-end-stress-value">
                {monthEndStress.projectedNetRemaining < 0 ? '-' : '+'}{cs} {formatNumber(Math.abs(monthEndStress.projectedNetRemaining))}
              </div>
            </div>
            <div className="month-end-stress-kpi">
              <div className="month-end-stress-label">Giorni rimanenti</div>
              <div className="month-end-stress-value">{monthEndStress.remainingDays}</div>
            </div>
            <div className="month-end-stress-kpi">
              <div className="month-end-stress-label">Confidenza stima</div>
              <div className="month-end-stress-value">{monthEndStress.confidence}%</div>
            </div>
          </div>
          <div className="month-end-stress-actions">
            <button type="button" className="today-action-btn" onClick={() => setActiveMenu('reports')}>
              Apri Report
            </button>
            <button type="button" className="today-action-btn" onClick={() => setActiveMenu('transactions')}>
              Aggiungi Transazione
            </button>
          </div>
        </div>
        )}

        {showGoalsPriority && (
        <div className={`section section-goals-priority ${goalsPriority.level}`} style={{ order: optionalSectionOrder.goalsPriority ?? 999 }}>
          <div className="goals-priority-head">
            <h2 className="section-title">Obiettivo Prioritario</h2>
            <span className="goals-priority-pill">{goalsPriority.message}</span>
          </div>
          {!goalsPriority.hasGoal || !goalsPriority.topGoal ? (
            <div className="empty-state">
              <p>Nessun obiettivo attivo al momento.</p>
              <button type="button" className="today-action-btn" onClick={() => setActiveMenu('savings')}>
                Crea obiettivo
              </button>
            </div>
          ) : (
            <div className="goals-priority-grid">
              <div className="goals-priority-kpi">
                <div className="goals-priority-label">Obiettivo</div>
                <div className="goals-priority-value">{goalsPriority.topGoal.name || 'Obiettivo'}</div>
              </div>
              <div className="goals-priority-kpi">
                <div className="goals-priority-label">Mancano</div>
                <div className="goals-priority-value">{cs} {formatNumber(goalsPriority.topGoal.remaining)}</div>
              </div>
              <div className="goals-priority-kpi">
                <div className="goals-priority-label">Rata consigliata/mese</div>
                <div className="goals-priority-value">{cs} {formatNumber(goalsPriority.suggestedMonthly)}</div>
              </div>
              <div className="goals-priority-kpi">
                <div className="goals-priority-label">Scadenza</div>
                <div className="goals-priority-value">
                  {goalsPriority.topGoal.daysLeft == null
                    ? 'Non impostata'
                    : goalsPriority.topGoal.daysLeft < 0
                    ? 'Scaduto'
                    : `${goalsPriority.topGoal.daysLeft} gg`}
                </div>
              </div>
              <div className="goals-priority-actions">
                <button type="button" className="today-action-btn" onClick={() => setActiveMenu('savings')}>
                  Apri Obiettivi
                </button>
                <button type="button" className="today-action-btn" onClick={() => setActiveMenu('transactions')}>
                  Registra Versamento
                </button>
              </div>
            </div>
          )}
        </div>
        )}

        {showDataQuality && (
        <div className={`section section-data-quality ${dataQuality.severity}`} style={{ order: optionalSectionOrder.dataQuality ?? 999 }}>
          <div className="data-quality-head">
            <h2 className="section-title">Qualita Dati</h2>
            <span className="data-quality-pill">
              {dataQuality.issueCount} issue{dataQuality.issueCount === 1 ? '' : 's'}
            </span>
          </div>
          <div className="data-quality-grid">
            <div className="data-quality-kpi">
              <div className="data-quality-label">Duplicati potenziali</div>
              <div className="data-quality-value">{dataQuality.duplicateCount}</div>
            </div>
            <div className="data-quality-kpi">
              <div className="data-quality-label">Senza categoria</div>
              <div className="data-quality-value">{dataQuality.missingCategory}</div>
            </div>
            <div className="data-quality-kpi">
              <div className="data-quality-label">Spese anomale</div>
              <div className="data-quality-value">{dataQuality.highExpenseCount}</div>
            </div>
            <div className="data-quality-kpi">
              <div className="data-quality-label">Media uscite</div>
              <div className="data-quality-value">{cs} {formatNumber(dataQuality.avgExpense)}</div>
            </div>
          </div>
          <div className="data-quality-actions">
            <button
              type="button"
              className="today-action-btn"
              onClick={() => {
                setPendingFilter('uncategorized');
                setActiveMenu('transactions');
              }}
            >
              Sistema Categorie
            </button>
            <button type="button" className="today-action-btn" onClick={() => setActiveMenu('reports')}>
              Controlla Report
            </button>
          </div>
        </div>
        )}

        {showAccountRisk && (
        <div className="section section-account-risk" style={{ order: optionalSectionOrder.accountRisk ?? 999 }}>
          <div className="account-risk-head">
            <h2 className="section-title">Conti a Rischio</h2>
            <span className="account-risk-pill">
              {accountRisk.total} conti{accountRisk.critical > 0 ? `, ${accountRisk.critical} critici` : ''}
            </span>
          </div>
          {accountRisk.items.length === 0 ? (
            <div className="empty-state">
              <p>Nessun conto a rischio nei prossimi 30 giorni.</p>
            </div>
          ) : (
            <div className="account-risk-list">
              {accountRisk.items.map((item) => (
                <div key={item.id} className={`account-risk-item ${item.level}`}>
                  <div className="account-risk-main">
                    <div className="account-risk-title">{item.name}</div>
                    <div className="account-risk-detail">
                      Saldo: {item.balance < 0 ? '-' : ''}{cs} {formatNumber(Math.abs(item.balance))} | Proiezione 30g:{' '}
                      {item.projected30 < 0 ? '-' : ''}{cs} {formatNumber(Math.abs(item.projected30))}
                    </div>
                    {item.daysToZero != null && item.daysToZero > 0 && (
                      <div className="account-risk-detail">Rosso stimato tra circa {item.daysToZero} giorni</div>
                    )}
                  </div>
                  <button type="button" className="today-action-btn" onClick={() => setActiveMenu('accounts')}>
                    Apri Conti
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {showDailyPace && (
        <div className={`section section-daily-pace ${dailyPace.level}`} style={{ order: optionalSectionOrder.dailyPace ?? 999 }}>
          <div className="daily-pace-head">
            <h2 className="section-title">Pace Giornaliero Spese</h2>
            <span className="daily-pace-pill">{dailyPace.message}</span>
          </div>
          <div className="daily-pace-grid">
            <div className="daily-pace-kpi">
              <div className="daily-pace-label">Spesa max al giorno (da oggi)</div>
              <div className="daily-pace-value">{cs} {formatNumber(dailyPace.allowedDailySpend)}</div>
            </div>
            <div className="daily-pace-kpi">
              <div className="daily-pace-label">Budget spesa rimanente</div>
              <div className="daily-pace-value">{cs} {formatNumber(dailyPace.remainingExpenseBudget)}</div>
            </div>
            <div className="daily-pace-kpi">
              <div className="daily-pace-label">Proiezione spese fine mese</div>
              <div className="daily-pace-value">{cs} {formatNumber(dailyPace.projectedExpense)}</div>
            </div>
            <div className="daily-pace-kpi">
              <div className="daily-pace-label">Giorni rimanenti</div>
              <div className="daily-pace-value">{dailyPace.remainingDays}</div>
            </div>
          </div>
          <div className="daily-pace-actions">
            <button type="button" className="today-action-btn" onClick={() => setActiveMenu('transactions')}>
              Aggiungi Transazione
            </button>
            <button type="button" className="today-action-btn" onClick={() => setActiveMenu('reports')}>
              Apri Report
            </button>
          </div>
        </div>
        )}

        {showIncomeRunRate && (
        <div className={`section section-income-runrate ${incomeRunRate.level}`} style={{ order: optionalSectionOrder.incomeRunRate ?? 999 }}>
          <div className="income-runrate-head">
            <h2 className="section-title">Stato Entrate</h2>
            <span className="income-runrate-pill">{incomeRunRate.message}</span>
          </div>
          <div className="income-runrate-grid">
            <div className="income-runrate-kpi">
              <div className="income-runrate-label">Entrate attuali mese</div>
              <div className="income-runrate-value">{cs} {formatNumber(monthlyIncome)}</div>
            </div>
            <div className="income-runrate-kpi">
              <div className="income-runrate-label">Run-rate proiettato</div>
              <div className="income-runrate-value">{cs} {formatNumber(incomeRunRate.projectedIncome)}</div>
            </div>
            <div className="income-runrate-kpi">
              <div className="income-runrate-label">Target entrate</div>
              <div className="income-runrate-value">{cs} {formatNumber(incomeRunRate.targetIncome)}</div>
            </div>
            <div className="income-runrate-kpi">
              <div className="income-runrate-label">Gap al target</div>
              <div className="income-runrate-value">
                {incomeRunRate.gapToTarget > 0 ? '-' : '+'}{cs} {formatNumber(Math.abs(incomeRunRate.gapToTarget))}
              </div>
            </div>
          </div>
          <div className="income-runrate-actions">
            <button type="button" className="today-action-btn" onClick={() => setActiveMenu('transactions')}>
              Registra Entrata
            </button>
            <button type="button" className="today-action-btn" onClick={() => setActiveMenu('reports')}>
              Apri Report
            </button>
          </div>
        </div>
        )}

        {showTrend14 && (
        <div className={`section section-trend14 ${trend14.level}`} style={{ order: optionalSectionOrder.trend14 ?? 999 }}>
          <div className="trend14-head">
            <h2 className="section-title">Trend 14 Giorni</h2>
            <span className="trend14-pill">Netto: {trend14.netSum < 0 ? '-' : '+'}{cs} {formatNumber(Math.abs(trend14.netSum))}</span>
          </div>
          <div className="trend14-chart">
            {trend14.items.map((d) => (
              <div key={d.key} className="trend14-col">
                <div className="trend14-bars">
                  <div className="trend14-bar trend14-income" style={{ height: `${Math.max(2, (d.income / trend14.maxValue) * 100)}%` }} />
                  <div className="trend14-bar trend14-expense" style={{ height: `${Math.max(2, (d.expense / trend14.maxValue) * 100)}%` }} />
                </div>
                <div className="trend14-label">{d.label}</div>
              </div>
            ))}
          </div>
          <div className="trend14-legend">
            <span className="trend14-dot income"></span> Entrate
            <span className="trend14-dot expense"></span> Uscite
          </div>
        </div>
        )}

        {showTopCategories7 && (
        <div className="section section-top-categories7" style={{ order: optionalSectionOrder.topCategories7 ?? 999 }}>
          <div className="top-categories7-head">
            <h2 className="section-title">Top Categorie 7 Giorni</h2>
            <span className="top-categories7-pill">Totale: {cs} {formatNumber(topCategories7.total)}</span>
          </div>
          {topCategories7.items.length === 0 ? (
            <div className="empty-state">
              <p>Nessuna spesa negli ultimi 7 giorni.</p>
            </div>
          ) : (
            <div className="top-categories7-list">
              {topCategories7.items.map((item, idx) => (
                <div key={`${item.category}-${idx}`} className="top-categories7-item">
                  <div className="top-categories7-rank">{idx + 1}</div>
                  <div className="top-categories7-main">
                    <div className="top-categories7-title">{item.category}</div>
                    <div className="top-categories7-bar">
                      <div
                        className="top-categories7-fill"
                        style={{ width: `${Math.max(8, (item.amount / Math.max(1, topCategories7.items[0].amount)) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="top-categories7-amount">-{cs} {formatNumber(item.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {showWeekendSpend && (
        <div className={`section section-weekend-spend ${weekendSpend.level}`} style={{ order: optionalSectionOrder.weekendSpend ?? 999 }}>
          <div className="weekend-spend-head">
            <h2 className="section-title">Weekend Spend Alert</h2>
            <span className="weekend-spend-pill">{weekendSpend.message}</span>
          </div>
          <div className="weekend-spend-grid">
            <div className="weekend-spend-kpi">
              <div className="weekend-spend-label">Spesa weekend (4 settimane)</div>
              <div className="weekend-spend-value">-{cs} {formatNumber(weekendSpend.weekendExpense)}</div>
            </div>
            <div className="weekend-spend-kpi">
              <div className="weekend-spend-label">Spesa feriale (4 settimane)</div>
              <div className="weekend-spend-value">-{cs} {formatNumber(weekendSpend.weekdayExpense)}</div>
            </div>
            <div className="weekend-spend-kpi">
              <div className="weekend-spend-label">Media weekend / giorno</div>
              <div className="weekend-spend-value">{cs} {formatNumber(weekendSpend.weekendAvg)}</div>
            </div>
            <div className="weekend-spend-kpi">
              <div className="weekend-spend-label">Rapporto vs feriale</div>
              <div className="weekend-spend-value">{formatNumber(weekendSpend.ratio, 2)}x</div>
            </div>
          </div>
        </div>
        )}

        {showSubscriptionBurden && (
        <div className={`section section-subscription-burden ${subscriptionBurden.level}`} style={{ order: optionalSectionOrder.subscriptionBurden ?? 999 }}>
          <div className="subscription-burden-head">
            <h2 className="section-title">Peso Abbonamenti</h2>
            <span className="subscription-burden-pill">{subscriptionBurden.message}</span>
          </div>
          <div className="subscription-burden-grid">
            <div className="subscription-burden-kpi">
              <div className="subscription-burden-label">Totale mensile abbonamenti</div>
              <div className="subscription-burden-value">-{cs} {formatNumber(subscriptionBurden.monthlyTotal)}</div>
            </div>
            <div className="subscription-burden-kpi">
              <div className="subscription-burden-label">Impatto su entrate mese</div>
              <div className="subscription-burden-value">{formatNumber(subscriptionBurden.burdenPct, 1)}%</div>
            </div>
            <div className="subscription-burden-kpi">
              <div className="subscription-burden-label">Abbonamenti attivi</div>
              <div className="subscription-burden-value">{subscriptionBurden.activeCount}</div>
            </div>
          </div>
          <div className="subscription-burden-actions">
            <button type="button" className="today-action-btn" onClick={() => setActiveMenu('subscriptions')}>
              Apri Abbonamenti
            </button>
          </div>
        </div>
        )}

        {showNoSpend && (
        <div className={`section section-no-spend ${noSpendStreak.level}`} style={{ order: optionalSectionOrder.noSpend ?? 999 }}>
          <div className="no-spend-head">
            <h2 className="section-title">No-Spend Streak</h2>
            <span className="no-spend-pill">{noSpendStreak.message}</span>
          </div>
          <div className="no-spend-grid">
            <div className="no-spend-kpi">
              <div className="no-spend-label">Serie attuale</div>
              <div className="no-spend-value">{noSpendStreak.streak} giorni</div>
            </div>
            <div className="no-spend-kpi">
              <div className="no-spend-label">Giorni no-spend nel mese</div>
              <div className="no-spend-value">{noSpendStreak.noSpendDaysMonth}</div>
            </div>
          </div>
        </div>
        )}

        {showBurnRate7 && (
        <div className={`section section-burn-rate7 ${burnRate7.level}`} style={{ order: optionalSectionOrder.burnRate7 ?? 999 }}>
          <div className="burn-rate7-head">
            <h2 className="section-title">Burn Rate 7 Giorni</h2>
            <span className="burn-rate7-pill">{burnRate7.message}</span>
          </div>
          <div className="burn-rate7-grid">
            <div className="burn-rate7-kpi">
              <div className="burn-rate7-label">Entrate 7g</div>
              <div className="burn-rate7-value">+{cs} {formatNumber(burnRate7.income)}</div>
            </div>
            <div className="burn-rate7-kpi">
              <div className="burn-rate7-label">Uscite 7g</div>
              <div className="burn-rate7-value">-{cs} {formatNumber(burnRate7.expense)}</div>
            </div>
            <div className="burn-rate7-kpi">
              <div className="burn-rate7-label">Netto medio/giorno</div>
              <div className="burn-rate7-value">{burnRate7.dailyNet < 0 ? '-' : '+'}{cs} {formatNumber(Math.abs(burnRate7.dailyNet))}</div>
            </div>
            <div className="burn-rate7-kpi">
              <div className="burn-rate7-label">Proiezione 30g</div>
              <div className="burn-rate7-value">{burnRate7.projected30 < 0 ? '-' : '+'}{cs} {formatNumber(Math.abs(burnRate7.projected30))}</div>
            </div>
          </div>
        </div>
        )}

        {showWeeklyMissions && (
        <div className="section section-weekly-missions" style={{ order: optionalSectionOrder.weeklyMissions ?? 999 }}>
          <div className="weekly-missions-head">
            <h2 className="section-title">Missioni Settimanali</h2>
            <span className="weekly-missions-pill">{weeklyMissions.length} priorita</span>
          </div>
          <div className="weekly-missions-list">
            {weeklyMissions.map((mission, idx) => (
              <div key={mission.id} className="weekly-mission-item">
                <div className="weekly-mission-rank">{idx + 1}</div>
                <div className="weekly-mission-main">
                  <div className="weekly-mission-title">{mission.title}</div>
                  <div className="weekly-mission-detail">{mission.detail}</div>
                </div>
                <button type="button" className="today-action-btn" onClick={() => setActiveMenu(mission.menu)}>
                  {mission.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
        )}

        {showIncomeConcentration && (
        <div className={`section section-income-concentration ${incomeConcentration.level}`} style={{ order: optionalSectionOrder.incomeConcentration ?? 999 }}>
          <div className="income-concentration-head">
            <h2 className="section-title">Concentrazione Entrate</h2>
            <span className="income-concentration-pill">{incomeConcentration.message}</span>
          </div>
          <div className="income-concentration-grid">
            <div className="income-concentration-kpi">
              <div className="income-concentration-label">Top fonte</div>
              <div className="income-concentration-value">{incomeConcentration.topSource?.label || 'N/D'}</div>
            </div>
            <div className="income-concentration-kpi">
              <div className="income-concentration-label">Quota top fonte</div>
              <div className="income-concentration-value">{formatNumber(incomeConcentration.topShare, 1)}%</div>
            </div>
            <div className="income-concentration-kpi">
              <div className="income-concentration-label">Entrate 30g</div>
              <div className="income-concentration-value">+{cs} {formatNumber(incomeConcentration.total)}</div>
            </div>
          </div>
          {incomeConcentration.items.length > 0 && (
            <div className="income-concentration-list">
              {incomeConcentration.items.map((item, idx) => (
                <div key={`${item.label}-${idx}`} className="income-concentration-item">
                  <div className="income-concentration-item-label">{item.label}</div>
                  <div className="income-concentration-item-amount">+{cs} {formatNumber(item.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {showCashCrunch14 && (
        <div className={`section section-cash-crunch14 ${cashCrunch14.level}`} style={{ order: optionalSectionOrder.cashCrunch14 ?? 999 }}>
          <div className="cash-crunch14-head">
            <h2 className="section-title">Rischio Cassa 14 Giorni</h2>
            <span className="cash-crunch14-pill">{cashCrunch14.message}</span>
          </div>
          <div className="cash-crunch14-grid">
            <div className="cash-crunch14-kpi">
              <div className="cash-crunch14-label">Saldo stimato a 14g</div>
              <div className="cash-crunch14-value">{cashCrunch14.projected < 0 ? '-' : ''}{cs} {formatNumber(Math.abs(cashCrunch14.projected))}</div>
            </div>
            <div className="cash-crunch14-kpi">
              <div className="cash-crunch14-label">Impatto abbonamenti (14g)</div>
              <div className="cash-crunch14-value">-{cs} {formatNumber(cashCrunch14.subs14)}</div>
            </div>
            <div className="cash-crunch14-kpi">
              <div className="cash-crunch14-label">Netto medio/giorno</div>
              <div className="cash-crunch14-value">{cashCrunch14.burnRateDaily < 0 ? '-' : '+'}{cs} {formatNumber(Math.abs(cashCrunch14.burnRateDaily))}</div>
            </div>
          </div>
        </div>
        )}

        {showExpenseVolatility && (
        <div className={`section section-expense-volatility ${expenseVolatility.level}`} style={{ order: optionalSectionOrder.expenseVolatility ?? 999 }}>
          <div className="expense-volatility-head">
            <h2 className="section-title">Variabilita Spese 30g</h2>
            <span className="expense-volatility-pill">{expenseVolatility.message}</span>
          </div>
          <div className="expense-volatility-grid">
            <div className="expense-volatility-kpi">
              <div className="expense-volatility-label">Media giornaliera</div>
              <div className="expense-volatility-value">{cs} {formatNumber(expenseVolatility.mean)}</div>
            </div>
            <div className="expense-volatility-kpi">
              <div className="expense-volatility-label">Deviazione standard</div>
              <div className="expense-volatility-value">{cs} {formatNumber(expenseVolatility.stdDev)}</div>
            </div>
            <div className="expense-volatility-kpi">
              <div className="expense-volatility-label">Indice variabilita (CV)</div>
              <div className="expense-volatility-value">{formatNumber(expenseVolatility.cv, 2)}</div>
            </div>
          </div>
        </div>
        )}

        {showSavingsTarget && (
        <div className={`section section-savings-target ${savingsTargetTracker.level}`} style={{ order: optionalSectionOrder.savingsTarget ?? 999 }}>
          <div className="savings-target-head">
            <h2 className="section-title">Obiettivo Risparmio Mese</h2>
            <span className="savings-target-pill">{savingsTargetTracker.message}</span>
          </div>
          <div className="savings-target-grid">
            <div className="savings-target-kpi">
              <div className="savings-target-label">Risparmio attuale</div>
              <div className="savings-target-value">{savingsTargetTracker.currentSavings < 0 ? '-' : ''}{cs} {formatNumber(Math.abs(savingsTargetTracker.currentSavings))}</div>
            </div>
            <div className="savings-target-kpi">
              <div className="savings-target-label">Target mese</div>
              <div className="savings-target-value">{cs} {formatNumber(savingsTargetTracker.targetSavings)}</div>
            </div>
            <div className="savings-target-kpi">
              <div className="savings-target-label">Progress</div>
              <div className="savings-target-value">{formatNumber(Math.max(0, savingsTargetTracker.progress * 100), 1)}%</div>
            </div>
            <div className="savings-target-kpi">
              <div className="savings-target-label">Ritmo richiesto / giorno</div>
              <div className="savings-target-value">{cs} {formatNumber(savingsTargetTracker.requiredDailySavings)}</div>
            </div>
          </div>
        </div>
        )}

        {showCommitments30 && (
        <div className={`section section-commitments30 ${commitments30.level}`} style={{ order: optionalSectionOrder.commitments30 ?? 999 }}>
          <div className="commitments30-head">
            <h2 className="section-title">Impegni 30 Giorni</h2>
            <span className="commitments30-pill">{commitments30.message}</span>
          </div>
          <div className="commitments30-grid">
            <div className="commitments30-kpi">
              <div className="commitments30-label">Totale previsto</div>
              <div className="commitments30-value">-{cs} {formatNumber(commitments30.total)}</div>
            </div>
            <div className="commitments30-kpi">
              <div className="commitments30-label">Urgenti ({'<=7g'})</div>
              <div className="commitments30-value">{commitments30.urgentCount}</div>
            </div>
            <div className="commitments30-kpi">
              <div className="commitments30-label">Scaduti</div>
              <div className="commitments30-value">{commitments30.overdueCount}</div>
            </div>
          </div>
          {commitments30.items.length > 0 && (
            <div className="commitments30-list">
              {commitments30.items.map((item) => (
                <div key={`${item.id}-${item.daysTo}`} className="commitments30-item">
                  <div className="commitments30-main">
                    <div className="commitments30-title">{item.name} <span className="commitments30-owner">{item.owner}</span></div>
                    <div className="commitments30-detail">
                      {item.daysTo < 0 ? `Scaduto da ${Math.abs(item.daysTo)}g` : item.daysTo === 0 ? 'Oggi' : `Tra ${item.daysTo}g`}
                    </div>
                  </div>
                  <div className="commitments30-amount">-{cs} {formatNumber(item.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {showDailySpike && (
        <div className={`section section-daily-spike ${dailySpike.level}`} style={{ order: optionalSectionOrder.dailySpike ?? 999 }}>
          <div className="daily-spike-head">
            <h2 className="section-title">Picco Spesa Giornaliera</h2>
            <span className="daily-spike-pill">{dailySpike.message}</span>
          </div>
          <div className="daily-spike-grid">
            <div className="daily-spike-kpi">
              <div className="daily-spike-label">Media giornaliera (30g)</div>
              <div className="daily-spike-value">{cs} {formatNumber(dailySpike.avg)}</div>
            </div>
            <div className="daily-spike-kpi">
              <div className="daily-spike-label">Picco massimo</div>
              <div className="daily-spike-value">{dailySpike.peak ? `${cs} ${formatNumber(dailySpike.peak.amount)}` : '--'}</div>
            </div>
            <div className="daily-spike-kpi">
              <div className="daily-spike-label">Data picco</div>
              <div className="daily-spike-value">{dailySpike.peak ? dailySpike.peak.date : '--'}</div>
            </div>
            <div className="daily-spike-kpi">
              <div className="daily-spike-label">Rapporto picco/media</div>
              <div className="daily-spike-value">{formatNumber(dailySpike.ratio, 2)}x</div>
            </div>
          </div>
        </div>
        )}

        {showRolling30 && (
        <div className={`section section-rolling30 ${rolling30.level}`} style={{ order: optionalSectionOrder.rolling30 ?? 999 }}>
          <div className="rolling30-head">
            <h2 className="section-title">Confronto 30g vs 30g</h2>
            <span className="rolling30-pill">{rolling30.message}</span>
          </div>
          <div className="rolling30-grid">
            <div className="rolling30-kpi">
              <div className="rolling30-label">Ultimi 30g netto</div>
              <div className="rolling30-value">{rolling30.last.net < 0 ? '-' : '+'}{cs} {formatNumber(Math.abs(rolling30.last.net))}</div>
            </div>
            <div className="rolling30-kpi">
              <div className="rolling30-label">30g precedenti netto</div>
              <div className="rolling30-value">{rolling30.prev.net < 0 ? '-' : '+'}{cs} {formatNumber(Math.abs(rolling30.prev.net))}</div>
            </div>
            <div className="rolling30-kpi">
              <div className="rolling30-label">Delta netto</div>
              <div className="rolling30-value">{rolling30.delta.net < 0 ? '-' : '+'}{cs} {formatNumber(Math.abs(rolling30.delta.net))}</div>
            </div>
            <div className="rolling30-kpi">
              <div className="rolling30-label">Delta uscite</div>
              <div className="rolling30-value">{rolling30.delta.expense < 0 ? '-' : '+'}{cs} {formatNumber(Math.abs(rolling30.delta.expense))}</div>
            </div>
          </div>
        </div>
        )}

        {showEmergencyFund && (
        <div className={`section section-emergency-fund ${emergencyFund.level}`} style={{ order: optionalSectionOrder.emergencyFund ?? 999 }}>
          <div className="emergency-fund-head">
            <h2 className="section-title">Copertura Fondo Emergenza</h2>
            <span className="emergency-fund-pill">{emergencyFund.message}</span>
          </div>
          <div className="emergency-fund-grid">
            <div className="emergency-fund-kpi">
              <div className="emergency-fund-label">Mesi coperti</div>
              <div className="emergency-fund-value">{formatNumber(emergencyFund.monthsCovered, 1)}</div>
            </div>
            <div className="emergency-fund-kpi">
              <div className="emergency-fund-label">Target mesi</div>
              <div className="emergency-fund-value">{formatNumber(emergencyFund.targetMonths, 0)}</div>
            </div>
            <div className="emergency-fund-kpi">
              <div className="emergency-fund-label">Gap da colmare</div>
              <div className="emergency-fund-value">{formatNumber(emergencyFund.gapMonths, 1)}</div>
            </div>
          </div>
        </div>
        )}

        {showCategorizationScore && (
        <div className={`section section-categorization-score ${categorizationScore.level}`} style={{ order: optionalSectionOrder.categorizationScore ?? 999 }}>
          <div className="categorization-score-head">
            <h2 className="section-title">Indice Categorizzazione 30g</h2>
            <span className="categorization-score-pill">{categorizationScore.message}</span>
          </div>
          <div className="categorization-score-grid">
            <div className="categorization-score-kpi">
              <div className="categorization-score-label">Score</div>
              <div className="categorization-score-value">{formatNumber(categorizationScore.scorePct, 1)}%</div>
            </div>
            <div className="categorization-score-kpi">
              <div className="categorization-score-label">Totale transazioni</div>
              <div className="categorization-score-value">{categorizationScore.total}</div>
            </div>
            <div className="categorization-score-kpi">
              <div className="categorization-score-label">Senza categoria</div>
              <div className="categorization-score-value">{categorizationScore.uncategorized}</div>
            </div>
          </div>
          <div className="categorization-score-actions">
            <button
              type="button"
              className="today-action-btn"
              onClick={() => {
                setPendingFilter('uncategorized');
                setActiveMenu('transactions');
              }}
            >
              Sistema Ora
            </button>
          </div>
        </div>
        )}

        {showSpendingMomentum && (
        <div className={`section section-spending-momentum ${spendingMomentum.level}`} style={{ order: optionalSectionOrder.spendingMomentum ?? 999 }}>
          <div className="spending-momentum-head">
            <h2 className="section-title">Momentum Spese 7g</h2>
            <span className="spending-momentum-pill">{spendingMomentum.message}</span>
          </div>
          <div className="spending-momentum-grid">
            <div className="spending-momentum-kpi">
              <div className="spending-momentum-label">Settimana corrente</div>
              <div className="spending-momentum-value">-{cs} {formatNumber(spendingMomentum.currentExpense)}</div>
            </div>
            <div className="spending-momentum-kpi">
              <div className="spending-momentum-label">Settimana precedente</div>
              <div className="spending-momentum-value">-{cs} {formatNumber(spendingMomentum.prevExpense)}</div>
            </div>
            <div className="spending-momentum-kpi">
              <div className="spending-momentum-label">Delta</div>
              <div className="spending-momentum-value">{spendingMomentum.delta < 0 ? '-' : '+'}{cs} {formatNumber(Math.abs(spendingMomentum.delta))}</div>
            </div>
            <div className="spending-momentum-kpi">
              <div className="spending-momentum-label">Delta %</div>
              <div className="spending-momentum-value">{spendingMomentum.deltaPct < 0 ? '-' : '+'}{formatNumber(Math.abs(spendingMomentum.deltaPct), 1)}%</div>
            </div>
          </div>
        </div>
        )}

        {showSubscriptionHealth && (
        <div className={`section section-subscription-health ${subscriptionHealth.level}`} style={{ order: optionalSectionOrder.subscriptionHealth ?? 999 }}>
          <div className="subscription-health-head">
            <h2 className="section-title">Salute Abbonamenti</h2>
            <span className="subscription-health-pill">{subscriptionHealth.message}</span>
          </div>
          <div className="subscription-health-grid">
            <div className="subscription-health-kpi">
              <div className="subscription-health-label">Score</div>
              <div className="subscription-health-value">{subscriptionHealth.score}/100</div>
            </div>
            <div className="subscription-health-kpi">
              <div className="subscription-health-label">Attivi / In pausa</div>
              <div className="subscription-health-value">{subscriptionHealth.activeCount} / {subscriptionHealth.pausedCount}</div>
            </div>
            <div className="subscription-health-kpi">
              <div className="subscription-health-label">In scadenza / Scaduti</div>
              <div className="subscription-health-value">{subscriptionHealth.dueSoonCount} / {subscriptionHealth.overdueCount}</div>
            </div>
            <div className="subscription-health-kpi">
              <div className="subscription-health-label">Ricorrenti / Fissi</div>
              <div className="subscription-health-value">{subscriptionHealth.recurringCount} / {subscriptionHealth.fixedCount}</div>
            </div>
          </div>
        </div>
        )}

        {showFocusToday && (
        <div className="section section-focus-today" style={{ order: optionalSectionOrder.focusToday ?? 999 }} data-onboarding-target="focus">
          <div className="focus-today-head">
            <h2 className="section-title">Focus Oggi</h2>
            <span className="focus-today-badge">{visibleFocusTodayItems.length} priorita</span>
          </div>
          <div className="focus-today-list">
            {visibleFocusTodayItems.length === 0 ? (
              <div className="empty-state">
                <p>Hai completato tutte le priorita di oggi.</p>
                <button type="button" className="today-action-btn" onClick={resetDismissedFocus}>
                  Mostra di nuovo
                </button>
              </div>
            ) : visibleFocusTodayItems.map((a, idx) => (
              <div key={`focus-${a.id}`} className={`focus-today-item ${a.level}`}>
                <div className="focus-today-rank">{idx + 1}</div>
                <div className="focus-today-main">
                  <div className="focus-today-title">{a.title}</div>
                  <div className={`focus-today-priority ${getPriorityLabel(a.priority).toLowerCase()}`}>
                    Priorita {getPriorityLabel(a.priority)}
                  </div>
                  <div className="focus-today-detail">{a.detail}</div>
                </div>
                <div className="focus-today-actions">
                  <button
                    type="button"
                    className="today-action-btn"
                    onClick={() => {
                      if (a.filter) setPendingFilter(a.filter);
                      setActiveMenu(a.menu);
                    }}
                  >
                    {a.cta}
                  </button>
                  <button type="button" className="today-action-btn focus-dismiss-btn" onClick={() => dismissFocusItem(a.id)}>
                    Completa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {showForecast && (
        <div className="section forecast-3090" style={{ order: optionalSectionOrder.forecast ?? 999 }}>
          <h2 className="section-title">Forecast 30/60/90 giorni</h2>
          <div className="forecast-3090-grid">
            {forecastData.cards.map((f) => (
              <div key={f.days} className={`forecast-card ${f.level}`}>
                <div className="forecast-title">Tra {f.days} giorni</div>
                <div className="forecast-value">
                  {f.projected < 0 ? '-' : ''}{cs} {formatNumber(Math.abs(f.projected))}
                </div>
                <div className="forecast-sub">
                  {f.level === 'danger' ? 'Rischio rosso' : f.level === 'warn' ? 'Da monitorare' : 'In sicurezza'}
                </div>
              </div>
            ))}
          </div>
          {forecastData.riskyAccounts.length > 0 && (
            <div className="forecast-risk-list">
              <strong>Conti a rischio:</strong>{' '}
              {forecastData.riskyAccounts
                .map((a) => `${a.name} (rosso entro ${a.riskHorizon}g)`)
                .join(' - ')}
            </div>
          )}
        </div>
        )}

        {showSubscriptionsDue && (
        <div className="section section-subscriptions-due" style={{ order: optionalSectionOrder.subscriptionsDue ?? 999 }}>
          <h2 className="section-title">Abbonamenti in scadenza</h2>
          {dueSubscriptionsSoon.length === 0 ? (
            <div className="empty-state">
              <p>Nessun abbonamento in scadenza nei prossimi {subscriptionsReminderDays} giorni.</p>
              <button
                type="button"
                className="today-action-btn"
                style={{ marginTop: 10 }}
                onClick={() => setActiveMenu('subscriptions')}
              >
                Apri Abbonamenti
              </button>
            </div>
          ) : (
            <div className="subscriptions-due-list">
              {dueSubscriptionsSoon.slice(0, 6).map((s) => {
                const dueLabel =
                  s.daysTo < 0
                    ? `Scaduto da ${Math.abs(s.daysTo)} gg`
                    : s.daysTo === 0
                    ? 'Oggi'
                    : s.daysTo === 1
                    ? 'Domani'
                    : `Tra ${s.daysTo} gg`;
                const level = s.daysTo < 0 ? 'danger' : s.daysTo <= 2 ? 'warn' : 'info';
                return (
                  <div key={s.id} className="subscription-due-card" data-level={level}>
                    <div className="subscription-due-main">
                      <div className="subscription-due-title">
                        {s.name}
                        <span className="subscription-due-owner">{s.ownerName || 'tu'}</span>
                      </div>
                      <div className="subscription-due-meta">
                        {cs} {formatNumber(Math.abs(Number(s.amount) || 0))} - {s.dueDate?.toLocaleDateString('it-IT')}
                      </div>
                    </div>
                    <div className="subscription-due-badge">{dueLabel}</div>
                  </div>
                );
              })}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="today-action-btn" onClick={() => setActiveMenu('subscriptions')}>
                  Gestisci abbonamenti
                </button>
              </div>
            </div>
          )}
        </div>
        )}

        {showSubscriptionsOverdue && (
        <div className="section section-subscriptions-due" style={{ order: optionalSectionOrder.subscriptionsOverdue ?? 999 }}>
          <h2 className="section-title">Abbonamenti scaduti</h2>
          {overdueSubscriptions.length === 0 ? (
            <div className="empty-state">
              <p>Nessun abbonamento scaduto al momento.</p>
              <button
                type="button"
                className="today-action-btn"
                style={{ marginTop: 10 }}
                onClick={() => setActiveMenu('subscriptions')}
              >
                Apri Abbonamenti
              </button>
            </div>
          ) : (
            <div className="subscriptions-due-list">
              {overdueSubscriptions.slice(0, 6).map((s) => (
                <div key={s.id} className="subscription-due-card" data-level="danger">
                  <div className="subscription-due-main">
                    <div className="subscription-due-title">
                      {s.name}
                      <span className="subscription-due-owner">{s.ownerName || 'tu'}</span>
                    </div>
                    <div className="subscription-due-meta">
                      {cs} {formatNumber(Math.abs(Number(s.amount) || 0))} - {s.dueDate?.toLocaleDateString('it-IT')}
                    </div>
                  </div>
                  <div className="subscription-due-badge">Scaduto da {Math.abs(s.daysTo)} gg</div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="today-action-btn" onClick={() => setActiveMenu('subscriptions')}>
                  Gestisci abbonamenti
                </button>
              </div>
            </div>
          )}
        </div>
        )}

        {!isCompactMobile && showInsightsBase && (
        <div style={{ order: optionalSectionOrder.insightsBase ?? 999 }}>
        <Suspense
          fallback={
            <div className="section">
              <h2 className="section-title">Insights</h2>
              <div className="empty-state">
                <p>Caricamento insights...</p>
              </div>
            </div>
          }
        >
          <InsightsSection
            className="section-insights"
            transactions={transactions}
            categories={categories}
            accounts={accounts}
            monthlyIncome={monthlyIncome}
            monthlyExpenses={monthlyExpenses}
            currentMonthIndex={currentMonthIndex}
            currentYear={currentYear}
            cs={cs}
          />
        </Suspense>
        </div>
        )}

        {showTop5 && (
        <div className="section section-top5 hide-mobile" style={{ order: optionalSectionOrder.top5 ?? 999 }}>
          <h2 className="section-title">Top 5 Spese & Entrate del Mese</h2>
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Spese principali</div>
              {topMonthlyExpenses.length === 0 ? (
                <div style={{ opacity: 0.7 }}>Nessuna spesa questo mese.</div>
              ) : (
                topMonthlyExpenses.map((t, idx) => (
                  <div key={`${t.id}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.description}
                      </div>
                      <div style={{ opacity: 0.7, fontSize: 12 }}>
                        {t.category} - {t.account}
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, color: '#ef4444', whiteSpace: 'nowrap' }}>
                      -{cs} {formatNumber(t.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Entrate principali</div>
              {topMonthlyIncomes.length === 0 ? (
                <div style={{ opacity: 0.7 }}>Nessuna entrata questo mese.</div>
              ) : (
                topMonthlyIncomes.map((t, idx) => (
                  <div key={`${t.id}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.description}
                      </div>
                      <div style={{ opacity: 0.7, fontSize: 12 }}>
                        {t.category} - {t.account}
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, color: '#10b981', whiteSpace: 'nowrap' }}>
                      +{cs} {formatNumber(t.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        )}

        {!isCompactMobile && showActions && (
        <div className="section section-actions" style={{ order: optionalSectionOrder.actions ?? 999 }}>
          <h2 className="section-title">Azioni Consigliate Oggi</h2>
          <div className="today-actions-grid">
            {todayActions.map((a) => (
              <div key={a.id} className={`today-action-card ${a.level}`}>
                <div>
                  <div className="today-action-title">{a.title}</div>
                  <div className="today-action-detail">{a.detail}</div>
                </div>
                <button type="button" className="today-action-btn" onClick={() => { if (a.filter) setPendingFilter(a.filter); setActiveMenu(a.menu); }}>
                  {a.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
        )}

        {showBudgetAlerts && (
        <div className="section section-budget-alerts" style={{ order: optionalSectionOrder.budgetAlerts ?? 999 }}>
          <h2 className="section-title">Alert Budget</h2>

          {budgetsLoading ? (
            <div className="empty-state">
              <p>Caricamento budget...</p>
            </div>
          ) : budgetsError ? (
            <div className="empty-state">
              <p style={{ color: '#dc2626' }}>Errore: {budgetsError}</p>
            </div>
          ) : !budgets?.length ? (
            <div className="empty-state">
              <p>Nessun budget impostato per questo mese.</p>
              <p style={{ opacity: 0.8, marginTop: 6 }}>Vai su "Budget" per aggiungerne uno.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {budgetAlerts.slice(0, 6).map((a) => {
                const badge =
                  a.level === 'over'
                    ? '100%+ SUPERATO'
                    : a.level === 'danger'
                    ? '90%+ ALTO'
                    : a.level === 'warn'
                    ? '75%+ ATTENZIONE'
                    : a.level === 'watch'
                    ? '50%+ MONITORA'
                    : 'OK';
                const border =
                  a.level === 'over'
                    ? '2px solid #ef4444'
                    : a.level === 'danger'
                    ? '2px solid #f97316'
                    : a.level === 'warn'
                    ? '2px solid #f59e0b'
                    : a.level === 'watch'
                    ? '2px solid #eab308'
                    : '2px solid #22c55e';

                return (
                  <div
                    key={a.key}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border,
                      borderRadius: 12,
                      padding: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontWeight: 700 }}>
                        {a.label}
                        <span style={{ marginLeft: 10, fontWeight: 600, opacity: 0.9 }}>{badge}</span>
                      </div>
                      <div style={{ opacity: 0.85, marginTop: 4 }}>
                        Speso: {cs} {formatNumber(a.spent)} / Budget: {cs} {formatNumber(a.budget)}
                      </div>
                    </div>

                    <div style={{ fontWeight: 800, fontSize: 16 }}>
                      {a.budget > 0 ? `${Math.round(a.pct * 100)}%` : '--'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        )}

        {!isCompactMobile && showBirthdays && upcomingBirthdays.length > 0 && (
          <div className="section section-birthdays" style={{ order: optionalSectionOrder.birthdays ?? 999 }}>
            <h2 className="section-title">Prossimi Compleanni</h2>
            <div style={{ display: 'grid', gap: 10 }}>
              {upcomingBirthdays.map((b) => {
                const age = b.birthYear ? calculateAge(b.date, b.birthYear) : null;
                const nextAge = age != null ? age + 1 : null;
                return (
                  <div
                    key={b.id}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: b.daysUntil <= 7 ? '2px solid #ec4899' : '2px solid #8b5cf6',
                      borderRadius: 12,
                      padding: 14,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: b.daysUntil <= 7 ? 'rgba(236,72,153,0.15)' : 'rgba(139,92,246,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                        flexShrink: 0
                      }}
                    >
                      {'🎂'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{b.name}</div>
                      <div style={{ opacity: 0.8, fontSize: 13, marginTop: 2 }}>
                        {b.date}
                        {nextAge != null ? ` - compie ${nextAge} anni` : ''}
                      </div>
                    </div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 14,
                        color: b.daysUntil <= 7 ? '#ec4899' : '#8b5cf6',
                        textAlign: 'right',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {b.daysUntil === 0 ? 'Oggi!' : b.daysUntil === 1 ? 'Domani' : `tra ${b.daysUntil} gg`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
});

export default DashboardContent;
