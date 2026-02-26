import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFinancial } from '../../contexts/FinancialContext';
import { getCurrencySymbol } from '../../utils/currency';
import { getBudgetsByMonth } from '../../services/budgetsService';
import { getBirthdays, getDaysUntilBirthday, calculateAge } from '../../services/birthdaysService';
import { processRecurring } from '../../services/recurringService';
import LiveClock from './LiveClock';
import { formatNumber } from '../../utils/format';
import { formatEntityLabel } from '../../utils/text';

const InsightsSection = React.lazy(() => import('./InsightsSection'));

const DashboardContent = React.memo(function DashboardContent({ setActiveMenu, setPendingFilter }) {
  const { user, userSettings } = useAuth();
  const { transactions = [], accounts = [], categories = [], createTransaction } = useFinancial();
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

  useEffect(() => {
    if (!user?.uid) return;
    const key = `aurora_recurring_processed_${new Date().toISOString().split('T')[0]}`;
    if (sessionStorage.getItem(key)) return;

    processRecurring(user.uid, createTransaction)
      .then((count) => {
        if (count > 0) console.log(`âœ… Generate ${count} transazioni ricorrenti`);
        sessionStorage.setItem(key, '1');
      })
      .catch((e) => console.error('Errore processing ricorrenti:', e));
  }, [user?.uid, createTransaction]);

  const [budgets, setBudgets] = useState([]);
  const [budgetsLoading, setBudgetsLoading] = useState(false);
  const [budgetsError, setBudgetsError] = useState('');
  const [storyCollapsed, setStoryCollapsed] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);

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
  const prevMonthSavings = useMemo(() => prevMonthIncome - prevMonthExpenses, [prevMonthIncome, prevMonthExpenses]);
  const savingsDelta = useMemo(() => monthlySavings - prevMonthSavings, [monthlySavings, prevMonthSavings]);
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
  }, [topExpenseBreakdown, biggestExpense, monthlyUncategorizedCount, cs, formatNumber, looksLikeInternalId]);

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

  const todayActions = useMemo(() => {
    const items = [];

    if (monthlyIncome > 0 && monthlyExpenses > monthlyIncome) {
      items.push({
        id: 'cashflow',
        title: 'Spese mese superiori alle entrate',
        detail: `Uscite ${cs} ${formatNumber(monthlyExpenses)} vs entrate ${cs} ${formatNumber(monthlyIncome)}`,
        cta: 'Apri Reports',
        menu: 'reports',
        level: 'danger'
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
        level: 'warn'
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
        level: criticalBudget.level === 'over' ? 'danger' : 'warn'
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
        level: 'info'
      });
    }

    if (items.length === 0) {
      items.push({
        id: 'ok',
        title: 'Situazione sotto controllo',
        detail: 'Nessuna urgenza: puoi registrare nuove operazioni o controllare i report.',
        cta: 'Aggiungi Transazione',
        menu: 'transactions',
        level: 'ok'
      });
    }

    return items.slice(0, 4);
  }, [
    monthlyIncome,
    monthlyExpenses,
    monthlyUncategorizedCount,
    budgetAlerts,
    upcomingBirthdays,
    cs
  ]);

  return (
    <div className="content-page">
      <div className="aurora-background">
        <div className="aurora-layer-1"></div>
        <div className="aurora-layer-2"></div>
        <div className="aurora-layer-3"></div>
      </div>

      <div className={`dashboard-content dashboard-content-home ${isCompactMobile ? 'compact-mobile' : ''}`}>
        <div className="dashboard-header">
          <div className="header-main">
            <h1>{greetingLabel}, {user?.displayName?.split(' ')[0] || 'Utente'}!</h1>
            <LiveClock />
          </div>
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

        <div className="section hero-story">
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
                  Rispetto a {prevMonthLabel} {savingsDelta >= 0 ? 'sei sopra di' : 'sei sotto di'} {cs}{' '}
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

        {!isCompactMobile && (
        <div className="section smart-insights">
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

        <div className="financial-overview">
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

        {!isCompactMobile && (
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
        )}

        <div className="section section-top5 hide-mobile">
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

        {!isCompactMobile && (
        <div className="section section-actions">
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

        <div className="section section-budget-alerts">
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

        {!isCompactMobile && upcomingBirthdays.length > 0 && (
          <div className="section section-birthdays">
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
