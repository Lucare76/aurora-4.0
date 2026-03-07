// src/pages/Reports.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/currency';
import './Reports.css';

import {
  FiCalendar,
  FiPieChart,
  FiTrendingUp,
  FiBarChart2,
  FiRefreshCw,
  FiFilter,
  FiDownload,
  FiPrinter,
  FiRepeat
} from 'react-icons/fi';

import MonthlyTrendChart from '../components/reports/MonthlyTrendChart';
import ExpenseDonutChart from '../components/reports/ExpenseDonutChart';
import YearOverYearChart from '../components/reports/YearOverYearChart';
import SpendingHeatmap from '../components/reports/SpendingHeatmap';
import InsightsPanel from '../components/reports/InsightsPanel';
import PageHeader from '../components/app/PageHeader';
import { formatEntityLabel } from '../utils/text';
import { projectScenario } from '../utils/scenarioForecast';
import { computeNextDueDate, getSubscriptions } from '../services/subscriptionsService';
import { createSubscriptionPayment, getSubscriptionPayments } from '../services/subscriptionPaymentsService';
import {
  createSubscriptionReconciliationLog,
  getSubscriptionReconciliationLogs
} from '../services/subscriptionReconciliationLogService';

function Reports() {
  const { transactions = [], accounts = [], categories = [], createTransaction } = useFinancial();
  const { user, userSettings } = useAuth();
  const currencyCode = userSettings?.currency || 'EUR';

  // -----------------------------
  // Helpers robusti
  // -----------------------------
  const parseDate = useCallback((date) => {
    if (!date) return new Date();
    if (typeof date === 'object' && date !== null && typeof date.toDate === 'function') {
      return date.toDate();
    }
    if (date instanceof Date) return date;
    const d = new Date(date);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }, []);

  const getAmountSigned = useCallback((t) => {
    const n = Number(t?.amount);
    return Number.isFinite(n) ? n : 0;
  }, []);

  const isTransferTx = useCallback((t) => !!(t?.isTransfer || t?.transferId), []);

  const getType = useCallback(
    (t) => {
      if (isTransferTx(t)) return 'transfer';
      const type = t?.type;
      if (type === 'income' || type === 'expense') return type;
      return getAmountSigned(t) >= 0 ? 'income' : 'expense';
    },
    [getAmountSigned, isTransferTx]
  );

  const getAccountName = useCallback(
    (accountId) => {
      const acc = accounts.find((a) => a.id === accountId);
      return acc?.name || 'Conto';
    },
    [accounts]
  );

  const getAccountNameFromTx = useCallback(
    (t) => {
      if (t?.accountName) return t.accountName;
      return getAccountName(t?.accountId);
    },
    [getAccountName]
  );

  const getCategoryNameFromTx = useCallback(
    (t) => {
      if (isTransferTx(t)) return 'Giroconto';
      if (t?.categoryName) return t.categoryName;

      const rawId = t?.categoryId;
      const rawName = t?.category;

      if (rawId) {
        const cat = categories.find((c) => c.id === rawId);
        if (cat?.name) return cat.name;
      }
      if (typeof rawName === 'string' && rawName.trim()) return rawName.trim();
      return 'Senza categoria';
    },
    [categories, isTransferTx]
  );

  const getSubCategoryNameFromTx = useCallback(
    (t) => {
      if (isTransferTx(t)) return '';
      if (t?.subCategoryName) return t.subCategoryName;

      const rawSubId = t?.subCategoryId;
      const rawSubName = t?.subCategory || t?.subcategory;

      if (!rawSubId && typeof rawSubName === 'string') return rawSubName;

      const catId = t?.categoryId;
      if (!catId || !rawSubId) return '';

      const cat = categories.find((c) => c.id === catId);
      const subs = cat?.subCategories || cat?.subcategories || cat?.children || [];
      const sub = subs.find((s) => s?.id === rawSubId);
      return sub?.name || '';
    },
    [categories, isTransferTx]
  );

  // -----------------------------
  // UI State (filtri + tab)
  // -----------------------------
  const todayISO = useMemo(() => new Date().toISOString().split('T')[0], []);

  const parseDateInput = useCallback((value) => {
    if (!value) return null;
    const [y, m, d] = String(value).split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }, []);

  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      start: firstDay.toISOString().split('T')[0],
      end: todayISO
    };
  });
  const [activePeriodPreset, setActivePeriodPreset] = useState('thisMonth');

  const [activeTab, setActiveTab] = useState('overview');
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [subscriptionPayments, setSubscriptionPayments] = useState([]);
  const [subscriptionReconciliationLogs, setSubscriptionReconciliationLogs] = useState([]);
  const [subscriptionsFilterStatus, setSubscriptionsFilterStatus] = useState('all');
  const [subscriptionsFilterKind, setSubscriptionsFilterKind] = useState('all');
  const [subscriptionsFilterPrice, setSubscriptionsFilterPrice] = useState('all');
  const [subscriptionsTrendMonths, setSubscriptionsTrendMonths] = useState(12);
  const [subscriptionsReconcileBusyId, setSubscriptionsReconcileBusyId] = useState('');
  const [subscriptionsReconcileMessage, setSubscriptionsReconcileMessage] = useState(null);
  const [reconcileLogStatusFilter, setReconcileLogStatusFilter] = useState('all');
  const [reconcileLogModeFilter, setReconcileLogModeFilter] = useState('all');
  const [reconcileLogRangeFilter, setReconcileLogRangeFilter] = useState('30d');

  const [filterType, setFilterType] = useState('all'); // all | income | expense | transfer
  const [filterAccount, setFilterAccount] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSubCategory, setFilterSubCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [scenarioExpenseShift, setScenarioExpenseShift] = useState(0);
  const tabsScrollRef = useRef(null);
  const tabBtnRefs = useRef({});
  const [presetName, setPresetName] = useState('');
  const [savedPresets, setSavedPresets] = useState(() => {
    try {
      const raw = localStorage.getItem('aurora_reports_filter_presets');
      const parsed = JSON.parse(raw || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const normalizeForSearch = useCallback(
    (value) =>
      String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim(),
    []
  );
  const toTitleCase = useCallback(
    (value) => formatEntityLabel(value),
    []
  );

  useEffect(() => {
    const container = tabsScrollRef.current;
    const btn = tabBtnRefs.current?.[activeTab];
    if (!container || !btn) return;
    btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeTab]);
  const formatEUR = useCallback((n) => {
    return formatCurrency(n, currencyCode, { decimals: 2 });
  }, [currencyCode]);
  const formatNumber = useCallback((n, decimals = 2) => {
    const value = Number(n) || 0;
    return value.toLocaleString('it-IT', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }, []);

  const loadSubscriptionsReport = useCallback(async () => {
    if (!user?.uid) return;
    setSubscriptionsLoading(true);
    try {
      const [subsRes, paymentsRes, logsRes] = await Promise.allSettled([
        getSubscriptions(user.uid),
        getSubscriptionPayments(user.uid),
        getSubscriptionReconciliationLogs(user.uid)
      ]);
      const subsData = subsRes.status === 'fulfilled' && Array.isArray(subsRes.value) ? subsRes.value : [];
      const paymentsData =
        paymentsRes.status === 'fulfilled' && Array.isArray(paymentsRes.value) ? paymentsRes.value : [];
      const logsData = logsRes.status === 'fulfilled' && Array.isArray(logsRes.value) ? logsRes.value : [];
      setSubscriptions(subsData);
      setSubscriptionPayments(paymentsData);
      setSubscriptionReconciliationLogs(logsData);

      if (logsRes.status === 'rejected') {
        console.warn('Log riconciliazione non disponibili, report caricato comunque:', logsRes.reason);
      }
    } catch (e) {
      console.error('Errore caricamento abbonamenti report:', e);
    } finally {
      setSubscriptionsLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadSubscriptionsReport();
  }, [loadSubscriptionsReport]);

  useEffect(() => {
    try {
      localStorage.setItem('aurora_reports_filter_presets', JSON.stringify(savedPresets));
    } catch {
      // ignore localStorage errors
    }
  }, [savedPresets]);

  // -----------------------------
  // Normalizzazione date
  // -----------------------------
  const normalizedStartDate = useMemo(() => {
    const d = parseDateInput(dateRange.start);
    if (!d) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  }, [dateRange.start, parseDateInput]);

  const normalizedEndDate = useMemo(() => {
    const d = parseDateInput(dateRange.end);
    if (!d) return null;
    d.setHours(23, 59, 59, 999);
    return d;
  }, [dateRange.end, parseDateInput]);

  // -----------------------------
  // Subcategories per select
  // -----------------------------
  const availableSubCategories = useMemo(() => {
    if (filterCategory === 'all') return [];
    const cat = categories.find((c) => c.id === filterCategory);
    const subs = cat?.subCategories || [];
    return Array.isArray(subs) ? subs : [];
  }, [categories, filterCategory]);

  React.useEffect(() => {
    if (filterCategory === 'all') {
      if (filterSubCategory !== 'all') setFilterSubCategory('all');
      return;
    }
    const ok = availableSubCategories.some((s) => s.id === filterSubCategory);
    if (!ok && filterSubCategory !== 'all') setFilterSubCategory('all');
  }, [availableSubCategories, filterCategory, filterSubCategory]);

  // -----------------------------
  // Collasso giroconti (in report)
  // -----------------------------
  const collapseTransfers = useCallback(
    (list) => {
      const out = [];
      const seen = new Set();

      for (const t of list) {
        const type = t.__type;
        if (type !== 'transfer') {
          out.push(t);
          continue;
        }

        const transferId = t.transferId || t.__transferKey;
        if (!transferId) {
          // fallback: se manca transferId, lo tratto come singolo
          out.push(t);
          continue;
        }

        if (seen.has(transferId)) continue;
        seen.add(transferId);

        // scegli rappresentante: se ho una gamba uscita (amount < 0) meglio
        const group = list.filter((x) => x.__type === 'transfer' && (x.transferId || x.__transferKey) === transferId);
        const rep = group.find((x) => (Number(x.__amountSigned) || 0) < 0) || group[0];

        const abs = Math.max(...group.map((x) => Math.abs(Number(x.__amountSigned) || 0)));

        // from/to: usando accountId + peerAccountId
        let fromId = rep.accountId || rep.fromAccountId || null;
        let toId = rep.transferPeerAccountId || rep.toAccountId || null;

        const signed = Number(rep.__amountSigned) || 0;
        if ((!fromId || !toId) && rep.transferPeerAccountId && rep.accountId) {
          if (signed < 0) {
            fromId = rep.accountId;
            toId = rep.transferPeerAccountId;
          } else if (signed > 0) {
            toId = rep.accountId;
            fromId = rep.transferPeerAccountId;
          }
        }

        const fromName = getAccountName(fromId);
        const toName = getAccountName(toId);

        out.push({
          ...rep,
          __isCollapsedTransfer: true,
          __amount: abs,
          __amountSigned: signed,
          __fromAccountId: fromId,
          __toAccountId: toId,
          __fromAccountName: fromName,
          __toAccountName: toName
        });
      }

      return out;
    },
    [getAccountName]
  );

  // -----------------------------
  // Filtraggio transazioni
  // -----------------------------
  const filteredTransactions = useMemo(() => {
    const base = transactions
      .map((t) => {
        const d = parseDate(t.date);
        const type = getType(t);
        const signed = getAmountSigned(t);
        return {
          ...t,
          __date: d,
          __type: type,
          __amountSigned: signed,
          __amount: Math.abs(signed),
          __transferKey: t.transferId || (t.isTransfer ? String(t.timestamp || d.getTime()) : null)
        };
      })
      .filter((t) => {
        // date
        if (normalizedStartDate && t.__date < normalizedStartDate) return false;
        if (normalizedEndDate && t.__date > normalizedEndDate) return false;

        // type
        if (filterType !== 'all' && t.__type !== filterType) return false;

        // account (transfer: matcha accountId di una delle gambe, quindi va bene)
        if (filterAccount !== 'all' && t.accountId !== filterAccount) {
          // se e transfer e ho peer id salvato, prova a matchare anche quello
          if (t.__type === 'transfer') {
            const peer = t.transferPeerAccountId;
            if (peer !== filterAccount) return false;
          } else return false;
        }

        // category/subcategory: solo non-transfer
        if (t.__type !== 'transfer') {
          if (filterCategory !== 'all' && t.categoryId !== filterCategory) return false;
          if (filterSubCategory !== 'all' && t.subCategoryId !== filterSubCategory) return false;
        } else {
          if (filterCategory !== 'all') return false;
          if (filterSubCategory !== 'all') return false;
        }

        const q = normalizeForSearch(searchTerm);
        if (q) {
          const accountLabel =
            t.__type === 'transfer'
              ? `${t.__fromAccountName || getAccountName(t.__fromAccountId)} ${t.__toAccountName || getAccountName(t.__toAccountId)}`
              : getAccountNameFromTx(t);
          const categoryLabel = getCategoryNameFromTx(t);
          const subCategoryLabel = getSubCategoryNameFromTx(t);
          const amountAbs = Math.abs(Number(t.__type === 'transfer' ? t.__amount : t.__amountSigned) || 0);
          const amountLabel = [
            formatEUR(amountAbs),
            amountAbs.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            amountAbs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            amountAbs.toFixed(2)
          ].join(' ');
          const transferText = t.__type === 'transfer' ? 'giroconto trasferimento transfer' : '';

          const haystack = [
            t.description || '',
            accountLabel,
            categoryLabel,
            subCategoryLabel,
            amountLabel,
            transferText
          ]
            .map((x) => normalizeForSearch(x))
            .join(' ');

          if (!haystack.includes(q)) return false;
        }

        return true;
      });

    // collassa i transfer per evitare doppio conteggio e doppie righe
    const collapsed = collapseTransfers(base);

    // sort
    const dir = sortDir === 'asc' ? 1 : -1;
    collapsed.sort((a, b) => {
      if (sortBy === 'amount') return (a.__amount - b.__amount) * dir;
      return (a.__date - b.__date) * dir;
    });

    return collapsed;
  }, [
    transactions,
    parseDate,
    getType,
    getAmountSigned,
    normalizedStartDate,
    normalizedEndDate,
    filterType,
    filterAccount,
    filterCategory,
    filterSubCategory,
    searchTerm,
    sortBy,
    sortDir,
    collapseTransfers,
    normalizeForSearch,
    getAccountName,
    getAccountNameFromTx,
    getCategoryNameFromTx,
    getSubCategoryNameFromTx,
    formatEUR
  ]);

  // -----------------------------
  // Stats principali (escludi transfer)
  // -----------------------------
  const stats = useMemo(() => {
    const onlyNormal = filteredTransactions.filter((t) => t.__type !== 'transfer');

    const income = onlyNormal
      .filter((t) => t.__type === 'income')
      .reduce((sum, t) => sum + Math.abs(t.__amountSigned), 0);

    const expenses = onlyNormal
      .filter((t) => t.__type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.__amountSigned), 0);

    const net = income - expenses;

    const transferCount = filteredTransactions.filter((t) => t.__type === 'transfer').length;

    return { income, expenses, net, count: filteredTransactions.length, transferCount };
  }, [filteredTransactions]);

  const getMonthlyEquivalent = useCallback((item) => {
    const amount = Math.abs(Number(item?.amount) || 0);
    const cycle = item?.billingCycle || 'monthly';
    if (cycle === 'weekly') return (amount * 52) / 12;
    if (cycle === 'yearly') return amount / 12;
    return amount;
  }, []);

  const subscriptionsWithDerived = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (subscriptions || []).map((s) => {
      const due = s?.nextDueDate ? new Date(s.nextDueDate) : null;
      const dueDate = due && !Number.isNaN(due.getTime()) ? due : null;
      if (dueDate) dueDate.setHours(0, 0, 0, 0);
      const daysToDue = dueDate ? Math.round((dueDate.getTime() - today.getTime()) / 86400000) : null;
      const monthlyEquivalent = getMonthlyEquivalent(s);
      const annualEquivalent = monthlyEquivalent * 12;
      const priceIncreaseDelta = Number(s?.priceIncreaseDelta) || 0;
      const priceIncreasePercent = Number(s?.priceIncreasePercent) || 0;
      const priceIncreasedAt = s?.priceIncreasedAt ? new Date(s.priceIncreasedAt) : null;
      const validPriceIncreaseDate = priceIncreasedAt && !Number.isNaN(priceIncreasedAt.getTime()) ? priceIncreasedAt : null;
      const daysFromPriceIncrease = validPriceIncreaseDate
        ? Math.round((today.getTime() - validPriceIncreaseDate.getTime()) / 86400000)
        : null;
      return {
        ...s,
        dueDate,
        daysToDue,
        monthlyEquivalent,
        annualEquivalent,
        priceIncreaseDelta,
        priceIncreasePercent,
        priceIncreasedAt: validPriceIncreaseDate,
        hasRecentPriceIncrease:
          priceIncreaseDelta > 0 && daysFromPriceIncrease != null && daysFromPriceIncrease >= 0 && daysFromPriceIncrease <= 30
      };
    });
  }, [subscriptions, getMonthlyEquivalent]);

  const subscriptionExpenseCategory = useMemo(() => {
    const expenseCategories = (categories || []).filter((c) => c?.type === 'expense');
    if (!expenseCategories.length) return null;
    const byName = expenseCategories.find((c) => String(c?.name || '').trim().toLowerCase() === 'abbonamenti');
    if (byName) return byName;
    const byBills = expenseCategories.find((c) => String(c?.name || '').trim().toLowerCase() === 'bollette');
    if (byBills) return byBills;
    return expenseCategories[0];
  }, [categories]);

  const filteredSubscriptions = useMemo(() => {
    return subscriptionsWithDerived
      .filter((s) => {
        if (subscriptionsFilterStatus === 'active') return s.active !== false;
        if (subscriptionsFilterStatus === 'paused') return s.active === false;
        if (subscriptionsFilterStatus === 'due30') {
          return s.active !== false && s.daysToDue != null && s.daysToDue >= 0 && s.daysToDue <= 30;
        }
        return true;
      })
      .filter((s) => {
        if (subscriptionsFilterKind === 'all') return true;
        return (s.kind || 'recurring') === subscriptionsFilterKind;
      })
      .filter((s) => {
        if (subscriptionsFilterPrice === 'all') return true;
        if (subscriptionsFilterPrice === 'recentIncrease') return s.hasRecentPriceIncrease;
        return true;
      })
      .sort((a, b) => {
        const ad = a.daysToDue == null ? Number.MAX_SAFE_INTEGER : a.daysToDue;
        const bd = b.daysToDue == null ? Number.MAX_SAFE_INTEGER : b.daysToDue;
        return ad - bd;
      });
  }, [subscriptionsWithDerived, subscriptionsFilterStatus, subscriptionsFilterKind, subscriptionsFilterPrice]);

  const subscriptionsStats = useMemo(() => {
    const active = subscriptionsWithDerived.filter((s) => s.active !== false);
    const paused = subscriptionsWithDerived.filter((s) => s.active === false);
    const due30 = active.filter((s) => s.daysToDue != null && s.daysToDue >= 0 && s.daysToDue <= 30).length;
    const monthlyTotal = active.reduce((sum, s) => sum + s.monthlyEquivalent, 0);
    const annualTotal = active.reduce((sum, s) => sum + s.annualEquivalent, 0);
    return {
      total: subscriptionsWithDerived.length,
      active: active.length,
      paused: paused.length,
      due30,
      monthlyTotal,
      annualTotal
    };
  }, [subscriptionsWithDerived]);

  const subscriptionsPaymentStats = useMemo(() => {
    const scopedIds = new Set(filteredSubscriptions.map((s) => s.id));
    const scopedPayments = (subscriptionPayments || []).filter((p) => scopedIds.has(p.subscriptionId));

    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const start30 = new Date(now);
    start30.setDate(start30.getDate() - 30);
    start30.setHours(0, 0, 0, 0);

    const start60 = new Date(start30);
    start60.setDate(start60.getDate() - 30);
    start60.setHours(0, 0, 0, 0);

    const start90 = new Date(now);
    start90.setDate(start90.getDate() - 90);
    start90.setHours(0, 0, 0, 0);

    const sumBetween = (from, to) =>
      scopedPayments
        .filter((p) => p.paidAt && p.paidAt >= from && p.paidAt <= to)
        .reduce((sum, p) => sum + Math.abs(Number(p.amount) || 0), 0);

    const last30 = sumBetween(start30, now);
    const prev30 = sumBetween(start60, new Date(start30.getTime() - 1));
    const last90 = sumBetween(start90, now);
    const delta30 = last30 - prev30;

    return { last30, prev30, last90, delta30 };
  }, [filteredSubscriptions, subscriptionPayments]);

  const subscriptionsReconciliation = useMemo(() => {
    const scopedIds = new Set(filteredSubscriptions.map((s) => s.id));
    const hasRange = Boolean(normalizedStartDate && normalizedEndDate);
    const inRange = (d) => {
      if (!d) return false;
      if (!hasRange) return true;
      return d >= normalizedStartDate && d <= normalizedEndDate;
    };

    const scopedPayments = (subscriptionPayments || [])
      .filter((p) => scopedIds.has(p.subscriptionId))
      .map((p) => ({
        ...p,
        amount: Math.abs(Number(p.amount) || 0),
        paidAt: p.paidAt instanceof Date ? p.paidAt : null
      }))
      .filter((p) => p.paidAt && inRange(p.paidAt))
      .sort((a, b) => (a.paidAt?.getTime() || 0) - (b.paidAt?.getTime() || 0));

    const scopedTransactions = (transactions || [])
      .filter((t) => t?.isSubscriptionPayment === true && scopedIds.has(t?.subscriptionId))
      .map((t) => {
        const d = parseDate(t?.date);
        return {
          ...t,
          __date: d,
          __amount: Math.abs(Number(t?.amount) || 0),
          __type: getType(t)
        };
      })
      .filter((t) => t.__type === 'expense' && t.__date && inRange(t.__date))
      .sort((a, b) => (a.__date?.getTime() || 0) - (b.__date?.getTime() || 0));

    const txPool = scopedTransactions.map((t) => ({ ...t, __matched: false }));
    const matchedPairs = [];
    const missingTransactions = [];

    for (const payment of scopedPayments) {
      let bestIdx = -1;
      let bestScore = Number.MAX_SAFE_INTEGER;

      for (let i = 0; i < txPool.length; i += 1) {
        const tx = txPool[i];
        if (tx.__matched) continue;
        if (tx.subscriptionId !== payment.subscriptionId) continue;

        const dayDiff = Math.abs((tx.__date.getTime() - payment.paidAt.getTime()) / 86400000);
        const amountDiff = Math.abs((tx.__amount || 0) - (payment.amount || 0));
        if (dayDiff > 7 || amountDiff > 0.51) continue;

        const score = dayDiff * 100 + amountDiff;
        if (score < bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }

      if (bestIdx === -1) {
        missingTransactions.push(payment);
        continue;
      }

      txPool[bestIdx].__matched = true;
      matchedPairs.push({
        payment,
        transaction: txPool[bestIdx]
      });
    }

    const transactionsWithoutPayment = txPool.filter((t) => !t.__matched);
    const paymentsTotal = scopedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const transactionsTotal = scopedTransactions.reduce((sum, t) => sum + (t.__amount || 0), 0);
    const matchedPaymentsTotal = matchedPairs.reduce((sum, pair) => sum + (pair.payment.amount || 0), 0);
    const matchedTransactionsTotal = matchedPairs.reduce((sum, pair) => sum + (pair.transaction.__amount || 0), 0);
    const paymentsCount = scopedPayments.length;
    const transactionsCount = scopedTransactions.length;
    const matchedCount = matchedPairs.length;

    return {
      paymentsCount,
      transactionsCount,
      matchedCount,
      missingTransactionsCount: missingTransactions.length,
      transactionsWithoutPaymentCount: transactionsWithoutPayment.length,
      paymentsTotal,
      transactionsTotal,
      deltaAmount: transactionsTotal - paymentsTotal,
      matchedPaymentsTotal,
      matchedTransactionsTotal,
      coveragePayments: paymentsCount > 0 ? (matchedCount / paymentsCount) * 100 : 100,
      coverageTransactions: transactionsCount > 0 ? (matchedCount / transactionsCount) * 100 : 100,
      missingTransactions: missingTransactions.sort((a, b) => (b.paidAt?.getTime() || 0) - (a.paidAt?.getTime() || 0)),
      transactionsWithoutPayment: transactionsWithoutPayment.sort(
        (a, b) => (b.__date?.getTime() || 0) - (a.__date?.getTime() || 0)
      )
    };
  }, [
    filteredSubscriptions,
    subscriptionPayments,
    transactions,
    parseDate,
    getType,
    normalizedStartDate,
    normalizedEndDate
  ]);

  const filteredReconciliationLogs = useMemo(() => {
    const scopedIds = new Set(filteredSubscriptions.map((s) => s.id));
    const now = new Date();
    const rangeStart = (() => {
      if (reconcileLogRangeFilter === '7d') {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        d.setHours(0, 0, 0, 0);
        return d;
      }
      if (reconcileLogRangeFilter === '30d') {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        d.setHours(0, 0, 0, 0);
        return d;
      }
      return null;
    })();

    return (subscriptionReconciliationLogs || [])
      .filter((l) => scopedIds.has(l.subscriptionId))
      .filter((l) => (reconcileLogStatusFilter === 'all' ? true : l.status === reconcileLogStatusFilter))
      .filter((l) => (reconcileLogModeFilter === 'all' ? true : l.mode === reconcileLogModeFilter))
      .filter((l) => {
        if (!rangeStart) return true;
        const refDate = l.createdAt || l.actionAt;
        return refDate instanceof Date && refDate >= rangeStart;
      })
      .slice(0, 30);
  }, [
    filteredSubscriptions,
    subscriptionReconciliationLogs,
    reconcileLogStatusFilter,
    reconcileLogModeFilter,
    reconcileLogRangeFilter
  ]);

  const writeReconciliationLog = useCallback(
    async (payload) => {
      if (!user?.uid) return;
      try {
        await createSubscriptionReconciliationLog(user.uid, payload);
      } catch (e) {
        console.error('Errore salvataggio log riconciliazione:', e);
      }
    },
    [user?.uid]
  );

  const handleCreateMissingSubscriptionTransaction = useCallback(
    async (payment) => {
      if (!payment?.id || subscriptionsReconcileBusyId) return;
      const busyToken = `payment-${payment.id}`;
      setSubscriptionsReconcileMessage(null);
      setSubscriptionsReconcileBusyId(busyToken);
      try {
        const relatedSub =
          subscriptionsWithDerived.find((s) => s.id === payment.subscriptionId) ||
          filteredSubscriptions.find((s) => s.id === payment.subscriptionId);
        const amount = Math.abs(Number(payment.amount) || 0);
        if (amount <= 0) {
          throw new Error('Importo pagamento non valido');
        }
        const accountId = relatedSub?.accountId || accounts[0]?.id || null;
        if (!accountId) {
          throw new Error('Nessun conto disponibile per creare la transazione');
        }

        const txPayload = {
          description: `Pagamento abbonamento: ${payment.subscriptionName || relatedSub?.name || 'Abbonamento'}`,
          amount,
          type: 'expense',
          accountId,
          date: payment.paidAt || new Date(),
          isSubscriptionPayment: true,
          subscriptionId: payment.subscriptionId || relatedSub?.id || '',
          subscriptionName: payment.subscriptionName || relatedSub?.name || '',
          ownerName: payment.ownerName || relatedSub?.ownerName || '',
          provider: payment.provider || relatedSub?.provider || ''
        };
        if (subscriptionExpenseCategory?.id) {
          txPayload.categoryId = subscriptionExpenseCategory.id;
        } else {
          txPayload.category = 'Abbonamenti';
        }

        await createTransaction(txPayload);
        await writeReconciliationLog({
          actionType: 'createTransaction',
          mode: 'single',
          status: 'success',
          subscriptionId: payment.subscriptionId || relatedSub?.id || '',
          subscriptionName: payment.subscriptionName || relatedSub?.name || '',
          sourceId: payment.id || '',
          amount,
          currency: payment.currency || userSettings?.currency || 'EUR',
          actionAt: payment.paidAt || new Date(),
          notes: 'Creata transazione da pagamento mancante'
        });
        setSubscriptionsReconcileMessage({
          type: 'success',
          text: `Transazione creata per "${payment.subscriptionName || 'abbonamento'}".`
        });
        await loadSubscriptionsReport();
      } catch (e) {
        await writeReconciliationLog({
          actionType: 'createTransaction',
          mode: 'single',
          status: 'error',
          subscriptionId: payment.subscriptionId || '',
          subscriptionName: payment.subscriptionName || '',
          sourceId: payment.id || '',
          amount: Math.abs(Number(payment.amount) || 0),
          currency: payment.currency || userSettings?.currency || 'EUR',
          actionAt: payment.paidAt || new Date(),
          errorMessage: e?.message || 'Errore creazione transazione',
          notes: 'Tentativo creazione transazione da pagamento mancante'
        });
        setSubscriptionsReconcileMessage({
          type: 'error',
          text: e?.message || 'Errore creazione transazione.'
        });
      } finally {
        setSubscriptionsReconcileBusyId('');
      }
    },
    [
      subscriptionsReconcileBusyId,
      subscriptionsWithDerived,
      filteredSubscriptions,
      accounts,
      subscriptionExpenseCategory?.id,
      createTransaction,
      loadSubscriptionsReport,
      userSettings?.currency,
      writeReconciliationLog
    ]
  );

  const handleCreateMissingSubscriptionPayment = useCallback(
    async (tx) => {
      if (!tx?.id || subscriptionsReconcileBusyId || !user?.uid) return;
      const busyToken = `tx-${tx.id}`;
      setSubscriptionsReconcileMessage(null);
      setSubscriptionsReconcileBusyId(busyToken);
      try {
        const amount = Math.abs(Number(tx.__amount || tx.amount) || 0);
        if (amount <= 0) {
          throw new Error('Importo transazione non valido');
        }
        await createSubscriptionPayment(user.uid, {
          subscriptionId: tx.subscriptionId || '',
          subscriptionName: tx.subscriptionName || '',
          ownerName: tx.ownerName || '',
          provider: tx.provider || '',
          amount,
          currency: userSettings?.currency || 'EUR',
          paidAt: tx.__date || tx.date || new Date(),
          method: 'reconciliation',
          notes: 'Pagamento creato da riconciliazione report'
        });
        await writeReconciliationLog({
          actionType: 'createPayment',
          mode: 'single',
          status: 'success',
          subscriptionId: tx.subscriptionId || '',
          subscriptionName: tx.subscriptionName || '',
          sourceId: tx.id || '',
          amount,
          currency: userSettings?.currency || 'EUR',
          actionAt: tx.__date || tx.date || new Date(),
          notes: 'Creato pagamento da transazione mancante'
        });
        setSubscriptionsReconcileMessage({
          type: 'success',
          text: `Pagamento creato per "${tx.subscriptionName || 'abbonamento'}".`
        });
        await loadSubscriptionsReport();
      } catch (e) {
        await writeReconciliationLog({
          actionType: 'createPayment',
          mode: 'single',
          status: 'error',
          subscriptionId: tx.subscriptionId || '',
          subscriptionName: tx.subscriptionName || '',
          sourceId: tx.id || '',
          amount: Math.abs(Number(tx.__amount || tx.amount) || 0),
          currency: userSettings?.currency || 'EUR',
          actionAt: tx.__date || tx.date || new Date(),
          errorMessage: e?.message || 'Errore creazione pagamento',
          notes: 'Tentativo creazione pagamento da transazione mancante'
        });
        setSubscriptionsReconcileMessage({
          type: 'error',
          text: e?.message || 'Errore creazione pagamento.'
        });
      } finally {
        setSubscriptionsReconcileBusyId('');
      }
    },
    [
      subscriptionsReconcileBusyId,
      user?.uid,
      userSettings?.currency,
      loadSubscriptionsReport,
      writeReconciliationLog
    ]
  );

  const handleCreateAllMissingSubscriptionTransactions = useCallback(async () => {
    if (subscriptionsReconcileBusyId) return;
    const pending = subscriptionsReconciliation.missingTransactions || [];
    if (!pending.length) return;
    const ok = window.confirm(`Creare ${pending.length} transazioni mancanti?`);
    if (!ok) return;

    setSubscriptionsReconcileMessage(null);
    setSubscriptionsReconcileBusyId('bulk-payment');
    let created = 0;
    let failed = 0;

    try {
      for (const payment of pending) {
        try {
          const relatedSub =
            subscriptionsWithDerived.find((s) => s.id === payment.subscriptionId) ||
            filteredSubscriptions.find((s) => s.id === payment.subscriptionId);
          const accountId = relatedSub?.accountId || accounts[0]?.id || null;
          const amount = Math.abs(Number(payment.amount) || 0);
          if (amount <= 0) {
            failed += 1;
            continue;
          }
          if (!accountId) {
            failed += 1;
            continue;
          }
          const txPayload = {
            description: `Pagamento abbonamento: ${payment.subscriptionName || relatedSub?.name || 'Abbonamento'}`,
            amount,
            type: 'expense',
            accountId,
            date: payment.paidAt || new Date(),
            isSubscriptionPayment: true,
            subscriptionId: payment.subscriptionId || relatedSub?.id || '',
            subscriptionName: payment.subscriptionName || relatedSub?.name || '',
            ownerName: payment.ownerName || relatedSub?.ownerName || '',
            provider: payment.provider || relatedSub?.provider || ''
          };
          if (subscriptionExpenseCategory?.id) {
            txPayload.categoryId = subscriptionExpenseCategory.id;
          } else {
            txPayload.category = 'Abbonamenti';
          }
          await createTransaction(txPayload);
          await writeReconciliationLog({
            actionType: 'createTransaction',
            mode: 'bulk',
            status: 'success',
            subscriptionId: payment.subscriptionId || relatedSub?.id || '',
            subscriptionName: payment.subscriptionName || relatedSub?.name || '',
            sourceId: payment.id || '',
            amount,
            currency: payment.currency || userSettings?.currency || 'EUR',
            actionAt: payment.paidAt || new Date(),
            notes: 'Bulk: creata transazione da pagamento mancante'
          });
          created += 1;
        } catch (e) {
          await writeReconciliationLog({
            actionType: 'createTransaction',
            mode: 'bulk',
            status: 'error',
            subscriptionId: payment.subscriptionId || '',
            subscriptionName: payment.subscriptionName || '',
            sourceId: payment.id || '',
            amount: Math.abs(Number(payment.amount) || 0),
            currency: payment.currency || userSettings?.currency || 'EUR',
            actionAt: payment.paidAt || new Date(),
            errorMessage: e?.message || 'Errore creazione transazione',
            notes: 'Bulk: tentativo creazione transazione da pagamento mancante'
          });
          failed += 1;
        }
      }
      setSubscriptionsReconcileMessage({
        type: failed === 0 ? 'success' : 'error',
        text:
          failed === 0
            ? `Create ${created} transazioni mancanti.`
            : `Create ${created} transazioni, ${failed} non riuscite.`
      });
      await loadSubscriptionsReport();
    } finally {
      setSubscriptionsReconcileBusyId('');
    }
  }, [
    subscriptionsReconcileBusyId,
    subscriptionsReconciliation.missingTransactions,
    subscriptionsWithDerived,
    filteredSubscriptions,
    accounts,
    subscriptionExpenseCategory?.id,
    createTransaction,
    loadSubscriptionsReport,
    userSettings?.currency,
    writeReconciliationLog
  ]);

  const handleCreateAllMissingSubscriptionPayments = useCallback(async () => {
    if (subscriptionsReconcileBusyId || !user?.uid) return;
    const pending = subscriptionsReconciliation.transactionsWithoutPayment || [];
    if (!pending.length) return;
    const ok = window.confirm(`Creare ${pending.length} pagamenti mancanti?`);
    if (!ok) return;

    setSubscriptionsReconcileMessage(null);
    setSubscriptionsReconcileBusyId('bulk-tx');
    let created = 0;
    let failed = 0;

    try {
      for (const tx of pending) {
        try {
          const amount = Math.abs(Number(tx.__amount || tx.amount) || 0);
          if (amount <= 0) {
            failed += 1;
            continue;
          }
          await createSubscriptionPayment(user.uid, {
            subscriptionId: tx.subscriptionId || '',
            subscriptionName: tx.subscriptionName || '',
            ownerName: tx.ownerName || '',
            provider: tx.provider || '',
            amount,
            currency: userSettings?.currency || 'EUR',
            paidAt: tx.__date || tx.date || new Date(),
            method: 'reconciliation',
            notes: 'Pagamento creato da riconciliazione report'
          });
          await writeReconciliationLog({
            actionType: 'createPayment',
            mode: 'bulk',
            status: 'success',
            subscriptionId: tx.subscriptionId || '',
            subscriptionName: tx.subscriptionName || '',
            sourceId: tx.id || '',
            amount,
            currency: userSettings?.currency || 'EUR',
            actionAt: tx.__date || tx.date || new Date(),
            notes: 'Bulk: creato pagamento da transazione mancante'
          });
          created += 1;
        } catch (e) {
          await writeReconciliationLog({
            actionType: 'createPayment',
            mode: 'bulk',
            status: 'error',
            subscriptionId: tx.subscriptionId || '',
            subscriptionName: tx.subscriptionName || '',
            sourceId: tx.id || '',
            amount: Math.abs(Number(tx.__amount || tx.amount) || 0),
            currency: userSettings?.currency || 'EUR',
            actionAt: tx.__date || tx.date || new Date(),
            errorMessage: e?.message || 'Errore creazione pagamento',
            notes: 'Bulk: tentativo creazione pagamento da transazione mancante'
          });
          failed += 1;
        }
      }
      setSubscriptionsReconcileMessage({
        type: failed === 0 ? 'success' : 'error',
        text:
          failed === 0
            ? `Creati ${created} pagamenti mancanti.`
            : `Creati ${created} pagamenti, ${failed} non riusciti.`
      });
      await loadSubscriptionsReport();
    } finally {
      setSubscriptionsReconcileBusyId('');
    }
  }, [
    subscriptionsReconcileBusyId,
    user?.uid,
    userSettings?.currency,
    subscriptionsReconciliation.transactionsWithoutPayment,
    loadSubscriptionsReport,
    writeReconciliationLog
  ]);

  const subscriptionsByOwner = useMemo(() => {
    const map = new Map();
    filteredSubscriptions.forEach((s) => {
      const key = String(s.ownerName || 'Tu').trim() || 'Tu';
      const prev = map.get(key) || { owner: key, count: 0, monthly: 0, annual: 0 };
      prev.count += 1;
      prev.monthly += s.monthlyEquivalent;
      prev.annual += s.annualEquivalent;
      map.set(key, prev);
    });
    return Array.from(map.values()).sort((a, b) => b.monthly - a.monthly);
  }, [filteredSubscriptions]);

  const subscriptionsByProvider = useMemo(() => {
    const map = new Map();
    filteredSubscriptions.forEach((s) => {
      const key = String(s.provider || 'Senza fornitore').trim() || 'Senza fornitore';
      const prev = map.get(key) || { provider: key, count: 0, monthly: 0, annual: 0 };
      prev.count += 1;
      prev.monthly += s.monthlyEquivalent;
      prev.annual += s.annualEquivalent;
      map.set(key, prev);
    });
    return Array.from(map.values()).sort((a, b) => b.monthly - a.monthly);
  }, [filteredSubscriptions]);

  const subscriptionsByKind = useMemo(() => {
    const map = new Map();
    filteredSubscriptions.forEach((s) => {
      const key = s.kind === 'fixed' ? 'Scadenza fissa' : 'Ricorrente';
      const prev = map.get(key) || { kind: key, count: 0, monthly: 0, annual: 0 };
      prev.count += 1;
      prev.monthly += s.monthlyEquivalent;
      prev.annual += s.annualEquivalent;
      map.set(key, prev);
    });
    return Array.from(map.values()).sort((a, b) => b.monthly - a.monthly);
  }, [filteredSubscriptions]);

  const subscriptionsMonthlyTrend = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const months = Array.from({ length: subscriptionsTrendMonths }).map((_, idx) => {
      const d = new Date(start.getFullYear(), start.getMonth() + idx, 1);
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleDateString('it-IT', { month: 'short' }),
        total: 0
      };
    });
    const monthMap = new Map(months.map((m) => [m.key, m]));

    const end = new Date(start.getFullYear(), start.getMonth() + subscriptionsTrendMonths, 0);
    const source = filteredSubscriptions.filter((s) => s.active !== false);

    source.forEach((s) => {
      const amount = Math.abs(Number(s.amount) || 0);
      if (!amount) return;

      const kind = s.kind || 'recurring';
      const cycle = s.billingCycle || 'monthly';
      const baseDue = s.dueDate instanceof Date ? new Date(s.dueDate) : null;
      if (!baseDue || Number.isNaN(baseDue.getTime())) return;
      baseDue.setHours(0, 0, 0, 0);

      if (kind === 'fixed') {
        if (baseDue >= start && baseDue <= end) {
          const key = `${baseDue.getFullYear()}-${String(baseDue.getMonth() + 1).padStart(2, '0')}`;
          const bucket = monthMap.get(key);
          if (bucket) bucket.total += amount;
        }
        return;
      }

      let due = new Date(baseDue);
      let guard = 0;
      while (due <= end && guard < 500) {
        if (due >= start) {
          const key = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}`;
          const bucket = monthMap.get(key);
          if (bucket) bucket.total += amount;
        }
        due = computeNextDueDate(due, cycle);
        due.setHours(0, 0, 0, 0);
        guard += 1;
      }
    });

    const max = Math.max(1, ...months.map((m) => m.total));
    return { months, max };
  }, [filteredSubscriptions, subscriptionsTrendMonths]);

  const periodComparison = useMemo(() => {
    if (!normalizedStartDate || !normalizedEndDate) return null;

    const msInDay = 24 * 60 * 60 * 1000;
    const currentStart = new Date(normalizedStartDate);
    const currentEnd = new Date(normalizedEndDate);
    const rangeDays = Math.max(1, Math.round((currentEnd - currentStart) / msInDay) + 1);

    const prevEnd = new Date(currentStart.getTime() - msInDay);
    const prevStart = new Date(prevEnd.getTime() - (rangeDays - 1) * msInDay);
    prevStart.setHours(0, 0, 0, 0);
    prevEnd.setHours(23, 59, 59, 999);

    const sumPeriod = (start, end) => {
      let income = 0;
      let expenses = 0;
      for (const t of transactions) {
        const d = parseDate(t?.date);
        if (!d || d < start || d > end) continue;
        const type = getType(t);
        if (type === 'transfer') continue;
        const abs = Math.abs(getAmountSigned(t));
        if (type === 'income') income += abs;
        if (type === 'expense') expenses += abs;
      }
      return { income, expenses, net: income - expenses };
    };

    const current = sumPeriod(currentStart, currentEnd);
    const previous = sumPeriod(prevStart, prevEnd);
    const pct = (curr, prev) => (!prev ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100);

    return {
      currentStart,
      currentEnd,
      prevStart,
      prevEnd,
      current,
      previous,
      deltaNet: current.net - previous.net,
      deltaIncome: current.income - previous.income,
      deltaExpenses: current.expenses - previous.expenses,
      pctNet: pct(current.net, previous.net),
      pctIncome: pct(current.income, previous.income),
      pctExpenses: pct(current.expenses, previous.expenses)
    };
  }, [normalizedStartDate, normalizedEndDate, transactions, parseDate, getType, getAmountSigned]);

  const setPeriodPreset = useCallback(
    (preset) => {
      const now = new Date();
      const toISO = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().split('T')[0];

      if (preset === 'thisMonth') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        setDateRange({ start: toISO(start), end: toISO(now) });
        setActivePeriodPreset('thisMonth');
        return;
      }

      if (preset === 'lastMonth') {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        setDateRange({ start: toISO(start), end: toISO(end) });
        setActivePeriodPreset('lastMonth');
        return;
      }

      if (preset === 'thisYear') {
        const start = new Date(now.getFullYear(), 0, 1);
        setDateRange({ start: toISO(start), end: toISO(now) });
        setActivePeriodPreset('thisYear');
        return;
      }

      if (preset === 'last30') {
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const start = new Date(end);
        start.setDate(start.getDate() - 29);
        setDateRange({ start: toISO(start), end: toISO(end) });
        setActivePeriodPreset('last30');
        return;
      }

      if (preset === 'last90') {
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const start = new Date(end);
        start.setDate(start.getDate() - 89);
        setDateRange({ start: toISO(start), end: toISO(end) });
        setActivePeriodPreset('last90');
      }
    },
    []
  );

  // -----------------------------
  // Aggregazioni (categorie/sottocategorie/conti) (escludi transfer)
  // -----------------------------
  const expensesByCategory = useMemo(() => {
    const map = new Map();

    filteredTransactions
      .filter((t) => t.__type === 'expense')
      .forEach((t) => {
        const catName = getCategoryNameFromTx(t);
        const catId = t.categoryId || 'no-cat';
        const key = `${catId}__${catName}`;

        const prev = map.get(key) || { categoryId: catId, categoryName: catName, amount: 0, count: 0 };
        prev.amount += Math.abs(t.__amountSigned);
        prev.count += 1;
        map.set(key, prev);
      });

    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, getCategoryNameFromTx]);

  const expensesBySubCategory = useMemo(() => {
    const map = new Map();

    filteredTransactions
      .filter((t) => t.__type === 'expense')
      .forEach((t) => {
        const catName = getCategoryNameFromTx(t);
        const subName = getSubCategoryNameFromTx(t) || 'Senza sottocategoria';
        const catId = t.categoryId || 'no-cat';
        const subId = t.subCategoryId || 'no-sub';

        const key = `${catId}__${subId}__${catName}__${subName}`;
        const prev =
          map.get(key) || {
            categoryId: catId,
            categoryName: catName,
            subCategoryId: subId,
            subCategoryName: subName,
            amount: 0,
            count: 0
          };

        prev.amount += Math.abs(t.__amountSigned);
        prev.count += 1;
        map.set(key, prev);
      });

    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, getCategoryNameFromTx, getSubCategoryNameFromTx]);

  const statsByAccount = useMemo(() => {
    const map = new Map();

    filteredTransactions
      .filter((t) => t.__type !== 'transfer')
      .forEach((t) => {
        const name = getAccountNameFromTx(t);
        const id = t.accountId || 'no-account';
        const key = `${id}__${name}`;

        const prev = map.get(key) || { accountId: id, accountName: name, income: 0, expenses: 0, count: 0 };
        if (t.__type === 'income') prev.income += Math.abs(t.__amountSigned);
        if (t.__type === 'expense') prev.expenses += Math.abs(t.__amountSigned);
        prev.count += 1;
        map.set(key, prev);
      });

    return Array.from(map.values()).sort((a, b) => (b.income - b.expenses) - (a.income - a.expenses));
  }, [filteredTransactions, getAccountNameFromTx]);

  // -----------------------------
  // Grafico mensile (periodo selezionato) (escludi transfer)
  // -----------------------------
  const monthlyChart = useMemo(() => {
    const buckets = new Map();

    filteredTransactions
      .filter((t) => t.__type !== 'transfer')
      .forEach((t) => {
        const d = t.__date;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        const prev = buckets.get(key) || { key, year: d.getFullYear(), month: d.getMonth(), income: 0, expenses: 0 };
        if (t.__type === 'income') prev.income += Math.abs(t.__amountSigned);
        if (t.__type === 'expense') prev.expenses += Math.abs(t.__amountSigned);
        buckets.set(key, prev);
      });

    const arr = Array.from(buckets.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    const max = Math.max(100, ...arr.map((x) => x.income), ...arr.map((x) => x.expenses));
    return { data: arr, max };
  }, [filteredTransactions]);

  const overviewSignals = useMemo(() => {
    const savingsRate = stats.income > 0 ? (stats.net / stats.income) * 100 : 0;
    const topCategory = expensesByCategory[0] || null;

    const expenseList = filteredTransactions
      .filter((t) => t.__type === 'expense')
      .map((t) => Math.abs(t.__amountSigned))
      .sort((a, b) => b - a);
    const biggestExpense = expenseList[0] || 0;
    const avgExpense = expenseList.length ? expenseList.reduce((s, n) => s + n, 0) / expenseList.length : 0;
    const anomaly = biggestExpense > 0 && avgExpense > 0 ? biggestExpense / avgExpense : 0;

    const endRef = parseDateInput(dateRange.end) || new Date();
    const month = endRef.getMonth();
    const year = endRef.getFullYear();
    const inCurrentMonth = month === new Date().getMonth() && year === new Date().getFullYear();
    const monthDays = new Date(year, month + 1, 0).getDate();
    const elapsed = Math.max(1, endRef.getDate());
    const projectedExpenses = inCurrentMonth ? (stats.expenses / elapsed) * monthDays : stats.expenses;
    const projectedIncome = inCurrentMonth ? (stats.income / elapsed) * monthDays : stats.income;

    return {
      savingsRate,
      topCategory,
      anomaly,
      biggestExpense,
      projectedExpenses,
      projectedIncome,
      projectedNet: projectedIncome - projectedExpenses,
      inCurrentMonth
    };
  }, [stats, expensesByCategory, filteredTransactions, parseDateInput, dateRange.end]);

  const scenarioProjection = useMemo(
    () =>
      projectScenario({
        income: overviewSignals.projectedIncome,
        expenses: overviewSignals.projectedExpenses,
        expenseShiftPct: scenarioExpenseShift
      }),
    [overviewSignals.projectedExpenses, overviewSignals.projectedIncome, scenarioExpenseShift]
  );

  // -----------------------------
  // Actions: export CSV / print
  // -----------------------------
  const exportCSV = useCallback(() => {
    const headers = ['Data', 'Descrizione', 'Tipo', 'Importo', 'Conto', 'Categoria', 'Sottocategoria'];

    const rows = filteredTransactions.map((t) => {
      const d = t.__date.toISOString().split('T')[0];
      const desc = (t.description || 'Nessuna descrizione').replaceAll('"', '""');

      let tipo = 'Uscita';
      if (t.__type === 'income') tipo = 'Entrata';
      if (t.__type === 'transfer') tipo = 'Trasferimento';

      const cat = getCategoryNameFromTx(t).replaceAll('"', '""');
      const sub = (getSubCategoryNameFromTx(t) || '').replaceAll('"', '""');

      let conto = getAccountNameFromTx(t);
      if (t.__type === 'transfer') {
        const from = t.__fromAccountName || getAccountName(t.__fromAccountId);
        const to = t.__toAccountName || getAccountName(t.__toAccountId);
        conto = `Da ${from} -> A ${to}`;
      }
      conto = String(conto).replaceAll('"', '""');

      const amount = t.__type === 'transfer' ? t.__amount : t.__amountSigned;

      return [d, `"${desc}"`, tipo, String(amount), `"${conto}"`, `"${cat}"`, `"${sub}"`].join(',');
    });

    const content = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${dateRange.start}_${dateRange.end}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }, [
    filteredTransactions,
    dateRange.start,
    dateRange.end,
    getAccountNameFromTx,
    getCategoryNameFromTx,
    getSubCategoryNameFromTx,
    getAccountName
  ]);

  const exportSubscriptionsCSV = useCallback(() => {
    const headers = [
      'Nome',
      'Intestatario',
      'Fornitore',
      'Tipo',
      'Ciclo',
      'Importo',
      'Mensile Equivalente',
      'Annuale Equivalente',
      'Prossima Scadenza',
      'Giorni alla Scadenza',
      'Aumento Prezzo',
      'Aumento Percentuale',
      'Stato'
    ];
    const rows = filteredSubscriptions.map((s) => {
      const due = s.dueDate ? s.dueDate.toISOString().split('T')[0] : '';
      const days = s.daysToDue == null ? '' : String(s.daysToDue);
      const state = s.active === false ? 'In pausa' : 'Attivo';
      const cycle = s.billingCycle === 'yearly' ? 'Annuale' : s.billingCycle === 'weekly' ? 'Settimanale' : 'Mensile';
      const type = s.kind === 'fixed' ? 'Scadenza fissa' : 'Ricorrente';
      return [
        `"${String(s.name || '').replaceAll('"', '""')}"`,
        `"${String(s.ownerName || '').replaceAll('"', '""')}"`,
        `"${String(s.provider || '').replaceAll('"', '""')}"`,
        `"${type}"`,
        `"${cycle}"`,
        String(Math.abs(Number(s.amount) || 0)),
        s.monthlyEquivalent.toFixed(2),
        s.annualEquivalent.toFixed(2),
        due,
        days,
        s.priceIncreaseDelta > 0 ? s.priceIncreaseDelta.toFixed(2) : '0',
        s.priceIncreasePercent > 0 ? s.priceIncreasePercent.toFixed(2) : '0',
        `"${state}"`
      ].join(',');
    });
    const content = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'report_abbonamenti.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredSubscriptions]);

  const exportPDF = useCallback(() => {
    if (activeTab === 'subscriptions') {
      const rows = filteredSubscriptions
        .map((s) => {
          const dueText = s.dueDate ? s.dueDate.toLocaleDateString('it-IT') : 'N/D';
          const daysText = s.daysToDue == null ? 'N/D' : s.daysToDue < 0 ? `Scaduto da ${Math.abs(s.daysToDue)} gg` : s.daysToDue === 0 ? 'Oggi' : s.daysToDue === 1 ? 'Domani' : `Tra ${s.daysToDue} gg`;
          return `
            <tr>
              <td>${String(s.name || '')}</td>
              <td>${String(s.ownerName || 'Tu')}</td>
              <td>${String(s.provider || '-')}</td>
              <td>${s.kind === 'fixed' ? 'Scadenza fissa' : 'Ricorrente'}</td>
              <td>${s.active === false ? 'In pausa' : 'Attivo'}</td>
              <td>${s.priceIncreaseDelta > 0 ? `+${formatEUR(s.priceIncreaseDelta)} (${formatNumber(s.priceIncreasePercent)}%)` : '-'}</td>
              <td>${formatEUR(s.monthlyEquivalent)}</td>
              <td>${dueText} (${daysText})</td>
            </tr>
          `;
        })
        .join('');
      const html = `
        <html>
          <head>
            <title>Report Abbonamenti Aurora</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 18px; color: #0f172a; }
              h1 { margin: 0 0 6px; }
              p { margin: 0 0 10px; color: #334155; }
              .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0; }
              .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; }
              .card .v { font-weight: 700; font-size: 18px; }
              table { width: 100%; border-collapse: collapse; margin-top: 12px; }
              th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; }
              th { background: #f1f5f9; text-align: left; }
            </style>
          </head>
          <body>
            <h1>Report Abbonamenti</h1>
            <p>Totale: ${subscriptionsStats.total} | Attivi: ${subscriptionsStats.active} | In pausa: ${subscriptionsStats.paused} | In scadenza 30g: ${subscriptionsStats.due30}</p>
            <div class="cards">
              <div class="card"><div>Mensile</div><div class="v">${formatEUR(subscriptionsStats.monthlyTotal)}</div></div>
              <div class="card"><div>Annuale</div><div class="v">${formatEUR(subscriptionsStats.annualTotal)}</div></div>
              <div class="card"><div>Attivi</div><div class="v">${subscriptionsStats.active}</div></div>
              <div class="card"><div>Scadenza 30g</div><div class="v">${subscriptionsStats.due30}</div></div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Nome</th><th>Intestatario</th><th>Fornitore</th><th>Tipo</th><th>Stato</th><th>Aumento</th><th>Mensile eq.</th><th>Scadenza</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </body>
        </html>
      `;
      const w = window.open('', '_blank');
      if (!w) return;
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 250);
      return;
    }

    const rows = filteredTransactions
      .map((t) => {
        const isTransfer = t.__type === 'transfer';
        const accountLabel = isTransfer
          ? `Da ${t.__fromAccountName || 'Conto'} -> A ${t.__toAccountName || 'Conto'}`
          : getAccountNameFromTx(t);
        const amount = isTransfer ? t.__amount : t.__amountSigned;
        return `
          <tr>
            <td>${t.__date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
            <td>${(t.description || (isTransfer ? 'Giroconto' : 'Nessuna descrizione')).toLocaleUpperCase('it-IT')}</td>
            <td>${getCategoryNameFromTx(t)}</td>
            <td></td>
            <td>${accountLabel}</td>
            <td style="text-align:right;">${formatEUR(amount)}</td>
          </tr>
        `;
      })
      .join('');

    const html = `
      <html>
        <head>
          <title>Report Aurora</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 18px; color: #0f172a; }
            h1 { margin: 0 0 6px; }
            p { margin: 0 0 10px; color: #334155; }
            .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 12px 0; }
            .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; }
            .card .v { font-weight: 700; font-size: 18px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; }
            th { background: #f1f5f9; text-align: left; }
          </style>
        </head>
        <body>
          <h1>Report Aurora</h1>
          <p>Periodo: ${dateRange.start} - ${dateRange.end}</p>
          <div class="cards">
            <div class="card"><div>Saldo Netto</div><div class="v">${formatEUR(stats.net)}</div></div>
            <div class="card"><div>Entrate</div><div class="v">${formatEUR(stats.income)}</div></div>
            <div class="card"><div>Uscite</div><div class="v">${formatEUR(stats.expenses)}</div></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Data</th><th>Descrizione</th><th>Categoria</th><th>Sottocategoria</th><th>Conto</th><th style="text-align:right;">Importo</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
    }, 250);
  }, [
    activeTab,
    filteredSubscriptions,
    subscriptionsStats.total,
    subscriptionsStats.active,
    subscriptionsStats.paused,
    subscriptionsStats.due30,
    subscriptionsStats.monthlyTotal,
    subscriptionsStats.annualTotal,
    filteredTransactions,
    getAccountNameFromTx,
    getCategoryNameFromTx,
    getSubCategoryNameFromTx,
    formatNumber,
    formatEUR,
    dateRange.start,
    dateRange.end,
    stats.net,
    stats.income,
    stats.expenses
  ]);

  const savePreset = useCallback(() => {
    const label = String(presetName || '').trim();
    if (!label) return;
    const item = {
      id: `${Date.now()}`,
      name: label,
      dateRange,
      filterType,
      filterAccount,
      filterCategory,
      filterSubCategory,
      searchTerm,
      sortBy,
      sortDir
    };
    setSavedPresets((prev) => [item, ...prev].slice(0, 10));
    setPresetName('');
  }, [
    presetName,
    dateRange,
    filterType,
    filterAccount,
    filterCategory,
    filterSubCategory,
    searchTerm,
    sortBy,
    sortDir
  ]);

  const applyPreset = useCallback((item) => {
    if (!item) return;
    setDateRange(item.dateRange || dateRange);
    setActivePeriodPreset('custom');
    setFilterType(item.filterType || 'all');
    setFilterAccount(item.filterAccount || 'all');
    setFilterCategory(item.filterCategory || 'all');
    setFilterSubCategory(item.filterSubCategory || 'all');
    setSearchTerm(item.searchTerm || '');
    setSortBy(item.sortBy || 'date');
    setSortDir(item.sortDir || 'desc');
  }, [dateRange]);

  const removePreset = useCallback((id) => {
    setSavedPresets((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const resetFilters = useCallback(() => {
    setFilterType('all');
    setFilterAccount('all');
    setFilterCategory('all');
    setFilterSubCategory('all');
    setSearchTerm('');
    setSortBy('date');
    setSortDir('desc');
  }, []);

  // -----------------------------
  // UI pieces
  // -----------------------------
  const formatDateIT = useCallback((d) => {
    if (!d) return '';
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }, []);

  const isSubscriptionsTab = activeTab === 'subscriptions';
  const showTransactionsEmpty = !isSubscriptionsTab && stats.count === 0;

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div className="reports-container">
      <PageHeader
        className="reports-header"
        title="Report"
        subtitle="Grafici, filtri e riepiloghi per categoria, sottocategoria, conto e periodo"
      />

      <div className="reports-hero-grid">
        <div className="reports-hero-card net">
          <div className="label">Saldo Netto</div>
          <div className={`value ${stats.net >= 0 ? 'positive' : 'negative'}`}>{formatEUR(stats.net)}</div>
          <div className="meta">{stats.count} movimenti analizzati</div>
        </div>
        <div className="reports-hero-card income">
          <div className="label">Entrate</div>
          <div className="value positive">{formatEUR(stats.income)}</div>
          <div className="meta">Tasso risparmio: {overviewSignals.savingsRate.toFixed(1)}%</div>
        </div>
        <div className="reports-hero-card expense">
          <div className="label">Uscite</div>
          <div className="value negative">{formatEUR(stats.expenses)}</div>
          <div className="meta">
            Top categoria: {toTitleCase(overviewSignals.topCategory?.categoryName || 'n/d')}
          </div>
        </div>
        <div className="reports-hero-card projection">
          <div className="label">Proiezione Fine Mese</div>
          <div className={`value ${overviewSignals.projectedNet >= 0 ? 'positive' : 'negative'}`}>
            {formatEUR(overviewSignals.projectedNet)}
          </div>
          <div className="meta">
            {overviewSignals.inCurrentMonth ? 'Stimata su mese corrente' : 'Periodo non corrente'}
          </div>
        </div>
        <div className="reports-hero-card scenario">
          <div className="label">Scenario (uscite)</div>
          <div className={`value ${scenarioProjection.projectedNet >= 0 ? 'positive' : 'negative'}`}>
            {formatEUR(scenarioProjection.projectedNet)}
          </div>
          <div className="meta">
            Delta: {scenarioExpenseShift > 0 ? '+' : ''}{scenarioExpenseShift}% uscite
          </div>
          <input
            className="scenario-slider"
            type="range"
            min="-30"
            max="30"
            step="1"
            value={scenarioExpenseShift}
            onChange={(e) => setScenarioExpenseShift(Number(e.target.value) || 0)}
            aria-label="Scenario variazione uscite"
          />
        </div>
      </div>

      <div className="reports-controls">
        {!isSubscriptionsTab && (
        <>
        {/* Date range */}
        <div className="date-range-controls">
          <div className="control-group">
            <FiCalendar />
            <label>Periodo:</label>
            <div className="date-inputs">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => {
                  setDateRange((p) => ({ ...p, start: e.target.value }));
                  setActivePeriodPreset('custom');
                }}
                className="date-input"
              />
              <span className="date-separator">al</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => {
                  setDateRange((p) => ({ ...p, end: e.target.value }));
                  setActivePeriodPreset('custom');
                }}
                className="date-input"
              />
            </div>
            <div className="period-presets">
              <button type="button" className={`period-chip ${activePeriodPreset === 'thisMonth' ? 'active' : ''}`} onClick={() => setPeriodPreset('thisMonth')}>
                Questo mese
              </button>
              <button type="button" className={`period-chip ${activePeriodPreset === 'lastMonth' ? 'active' : ''}`} onClick={() => setPeriodPreset('lastMonth')}>
                Mese scorso
              </button>
              <button type="button" className={`period-chip ${activePeriodPreset === 'thisYear' ? 'active' : ''}`} onClick={() => setPeriodPreset('thisYear')}>
                Quest'anno
              </button>
              <button type="button" className={`period-chip ${activePeriodPreset === 'last30' ? 'active' : ''}`} onClick={() => setPeriodPreset('last30')}>
                Ultimi 30g
              </button>
              <button type="button" className={`period-chip ${activePeriodPreset === 'last90' ? 'active' : ''}`} onClick={() => setPeriodPreset('last90')}>
                Ultimi 90g
              </button>
            </div>
          </div>
        </div>

        {/* Advanced filters */}
        <div className="advanced-filters">
          <h3 className="filters-title">
            <FiFilter /> Filtri Avanzati
          </h3>

          <div className="filters-grid">
            <div className="filter-group">
              <label>Tipo</label>
              <select className="filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="all">Tutti</option>
                <option value="income">Entrate</option>
                <option value="expense">Uscite</option>
                <option value="transfer">Giroconti</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Conto</label>
              <select className="filter-select" value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)}>
                <option value="all">Tutti i conti</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Categoria</label>
              <select className="filter-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="all">Tutte le categorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Sottocategoria</label>
              <select
                className="filter-select"
                value={filterSubCategory}
                onChange={(e) => setFilterSubCategory(e.target.value)}
                disabled={filterCategory === 'all' || availableSubCategories.length === 0}
              >
                <option value="all">Tutte</option>
                {availableSubCategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Ordina per</label>
              <select className="filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="date">Data</option>
                <option value="amount">Importo</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Direzione</label>
              <select className="filter-select" value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
                <option value="desc">Decrescente</option>
                <option value="asc">Crescente</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Cerca</label>
              <div className="filter-input-wrap">
                <input
                  type="text"
                  className="filter-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Descrizione, conto, categoria, importo..."
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="filter-input-clear"
                    onClick={() => setSearchTerm('')}
                    aria-label="Svuota ricerca"
                    title="Svuota ricerca"
                  >
                    x
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="filter-actions">
            <button className="reset-filters-btn" onClick={resetFilters}>
              <FiRefreshCw /> Reset Filtri
            </button>
            <div className="filter-results">
              {stats.count} transazioni trovate {stats.transferCount ? `- ${stats.transferCount} giroconti` : ''}
            </div>
          </div>
          <div className="report-presets-row">
            <div className="report-presets-save">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Nome preset filtri report"
                className="filter-input"
              />
              <button type="button" className="reset-filters-btn" onClick={savePreset} disabled={!presetName.trim()}>
                Salva preset
              </button>
            </div>
            {savedPresets.length > 0 && (
              <div className="report-presets-chips">
                {savedPresets.map((p) => (
                  <div className="report-preset-chip-wrap" key={p.id}>
                    <button type="button" className="report-preset-chip" onClick={() => applyPreset(p)}>
                      {p.name}
                    </button>
                    <button type="button" className="report-preset-delete" onClick={() => removePreset(p.id)}>
                      X
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </>
        )}

        {isSubscriptionsTab && (
          <div className="subscriptions-report-filters">
            <div className="subscriptions-report-filter-row">
              <span className="subscriptions-report-filter-label">Stato</span>
              <div className="subscriptions-report-chip-row">
                <button
                  type="button"
                  className={`period-chip ${subscriptionsFilterStatus === 'all' ? 'active' : ''}`}
                  onClick={() => setSubscriptionsFilterStatus('all')}
                >
                  Tutti
                </button>
                <button
                  type="button"
                  className={`period-chip ${subscriptionsFilterStatus === 'active' ? 'active' : ''}`}
                  onClick={() => setSubscriptionsFilterStatus('active')}
                >
                  Attivi
                </button>
                <button
                  type="button"
                  className={`period-chip ${subscriptionsFilterStatus === 'paused' ? 'active' : ''}`}
                  onClick={() => setSubscriptionsFilterStatus('paused')}
                >
                  In pausa
                </button>
                <button
                  type="button"
                  className={`period-chip ${subscriptionsFilterStatus === 'due30' ? 'active' : ''}`}
                  onClick={() => setSubscriptionsFilterStatus('due30')}
                >
                  Scadenza 30 giorni
                </button>
              </div>
            </div>
            <div className="subscriptions-report-filter-row">
              <span className="subscriptions-report-filter-label">Tipo</span>
              <div className="subscriptions-report-chip-row">
                <button
                  type="button"
                  className={`period-chip ${subscriptionsFilterKind === 'all' ? 'active' : ''}`}
                  onClick={() => setSubscriptionsFilterKind('all')}
                >
                  Tutti
                </button>
                <button
                  type="button"
                  className={`period-chip ${subscriptionsFilterKind === 'recurring' ? 'active' : ''}`}
                  onClick={() => setSubscriptionsFilterKind('recurring')}
                >
                  Ricorrenti
                </button>
                <button
                  type="button"
                  className={`period-chip ${subscriptionsFilterKind === 'fixed' ? 'active' : ''}`}
                  onClick={() => setSubscriptionsFilterKind('fixed')}
                >
                  Scadenza fissa
                </button>
              </div>
            </div>
            <div className="subscriptions-report-filter-row">
              <span className="subscriptions-report-filter-label">Prezzo</span>
              <div className="subscriptions-report-chip-row">
                <button
                  type="button"
                  className={`period-chip ${subscriptionsFilterPrice === 'all' ? 'active' : ''}`}
                  onClick={() => setSubscriptionsFilterPrice('all')}
                >
                  Tutti
                </button>
                <button
                  type="button"
                  className={`period-chip ${subscriptionsFilterPrice === 'recentIncrease' ? 'active' : ''}`}
                  onClick={() => setSubscriptionsFilterPrice('recentIncrease')}
                >
                  Aumenti recenti (30g)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="report-type-tabs" ref={tabsScrollRef}>
          <button ref={(el) => { tabBtnRefs.current.overview = el; }} className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            <FiPieChart /> Riepilogo
          </button>
          <button ref={(el) => { tabBtnRefs.current.trends = el; }} className={`tab-btn ${activeTab === 'trends' ? 'active' : ''}`} onClick={() => setActiveTab('trends')}>
            <FiTrendingUp /> Tendenze
          </button>
          <button ref={(el) => { tabBtnRefs.current.categories = el; }} className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}>
            <FiBarChart2 /> Categorie
          </button>
          <button ref={(el) => { tabBtnRefs.current.subcategories = el; }} className={`tab-btn ${activeTab === 'subcategories' ? 'active' : ''}`} onClick={() => setActiveTab('subcategories')}>
            <FiTrendingUp /> Sottocategorie
          </button>
          <button ref={(el) => { tabBtnRefs.current.accounts = el; }} className={`tab-btn ${activeTab === 'accounts' ? 'active' : ''}`} onClick={() => setActiveTab('accounts')}>
            <FiBarChart2 /> Conti
          </button>
          <button ref={(el) => { tabBtnRefs.current.transactions = el; }} className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}>
            <FiBarChart2 /> Transazioni
          </button>
          <button ref={(el) => { tabBtnRefs.current.subscriptions = el; }} className={`tab-btn ${activeTab === 'subscriptions' ? 'active' : ''}`} onClick={() => setActiveTab('subscriptions')}>
            <FiRepeat /> Abbonamenti
          </button>
        </div>
      </div>

      {!isSubscriptionsTab && periodComparison && (
        <div className="comparison-panel">
          <div className="comparison-head">
            <h3>Confronto col periodo precedente</h3>
            <p>
              {formatDateIT(periodComparison.currentStart)} - {formatDateIT(periodComparison.currentEnd)} vs{" "}
              {formatDateIT(periodComparison.prevStart)} - {formatDateIT(periodComparison.prevEnd)}
            </p>
          </div>

          <div className="comparison-grid">
            <div className="comparison-card">
              <div className="label">Saldo Netto</div>
              <div className={`value ${periodComparison.current.net >= 0 ? "positive" : "negative"}`}>
                {formatEUR(periodComparison.current.net)}
              </div>
              <div className={`delta ${periodComparison.deltaNet >= 0 ? "positive" : "negative"}`}>
                {periodComparison.deltaNet >= 0 ? "+" : ""}
                {formatEUR(periodComparison.deltaNet)} ({periodComparison.pctNet.toFixed(1)}%)
              </div>
            </div>

            <div className="comparison-card">
              <div className="label">Entrate</div>
              <div className="value positive">{formatEUR(periodComparison.current.income)}</div>
              <div className={`delta ${periodComparison.deltaIncome >= 0 ? "positive" : "negative"}`}>
                {periodComparison.deltaIncome >= 0 ? "+" : ""}
                {formatEUR(periodComparison.deltaIncome)} ({periodComparison.pctIncome.toFixed(1)}%)
              </div>
            </div>

            <div className="comparison-card">
              <div className="label">Uscite</div>
              <div className="value negative">{formatEUR(periodComparison.current.expenses)}</div>
              <div className={`delta ${periodComparison.deltaExpenses <= 0 ? "positive" : "negative"}`}>
                {periodComparison.deltaExpenses >= 0 ? "+" : ""}
                {formatEUR(periodComparison.deltaExpenses)} ({periodComparison.pctExpenses.toFixed(1)}%)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab content */}
      {showTransactionsEmpty ? (
        <div className="empty-state">
          <div className="empty-icon">[ ]</div>
          <h3>Nessuna transazione nel periodo/filtri</h3>
          <p>Controlla le date (soprattutto il giorno finale) oppure premi "Reset Filtri".</p>
          <button className="empty-action-btn" onClick={resetFilters}>Reset Filtri</button>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <>
              <div className="reports-spotlight">
                <div className="spotlight-card">
                  <div className="spotlight-title">Categoria Più Costosa</div>
                  <div className="spotlight-value">
                    {overviewSignals.topCategory
                      ? `${toTitleCase(overviewSignals.topCategory.categoryName)} - ${formatEUR(overviewSignals.topCategory.amount)}`
                      : 'Nessun dato'}
                  </div>
                </div>
                <div className="spotlight-card">
                  <div className="spotlight-title">Anomalia Spesa</div>
                  <div className="spotlight-value">
                    {overviewSignals.anomaly >= 2
                      ? `Picco ${overviewSignals.anomaly.toFixed(1)}x (${formatEUR(overviewSignals.biggestExpense)})`
                      : 'Nessuna anomalia rilevante'}
                  </div>
                </div>
              </div>
              <MonthlyTrendChart data={monthlyChart.data} formatEUR={formatEUR} />
              <div className="charts-row">
                <ExpenseDonutChart
                  expensesByCategory={expensesByCategory}
                  totalExpenses={stats.expenses}
                  formatEUR={formatEUR}
                  categories={categories}
                />
                <InsightsPanel
                  transactions={filteredTransactions}
                  comparisonTransactions={transactions}
                  categories={categories}
                  accounts={accounts}
                  formatEUR={formatEUR}
                  currentMonth={(parseDateInput(dateRange.end) || new Date()).getMonth()}
                  currentYear={(parseDateInput(dateRange.end) || new Date()).getFullYear()}
                  monthlyIncome={stats.income}
                  monthlyExpenses={stats.expenses}
                />
              </div>
              <div className="top-categories-section">
                <h4>Top Spese per Categoria</h4>
                <div className="top-categories-list">
                  {expensesByCategory.slice(0, 5).map((c, idx) => {
                    const perc = stats.expenses > 0 ? (c.amount / stats.expenses) * 100 : 0;
                    return (
                      <div key={c.categoryId + c.categoryName} className="top-category-item">
                        <div className="rank">{idx + 1}</div>
                        <div className="category-details">
                          <div className="category-name">{toTitleCase(c.categoryName)}</div>
                          <div className="category-stats">{c.count} transazioni</div>
                        </div>
                        <div className="category-amount">
                          <div className="amount">{formatEUR(c.amount)}</div>
                          <div className="percentage">{perc.toFixed(1)}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {activeTab === 'trends' && (
            <>
              <YearOverYearChart
                transactions={filteredTransactions}
                filterCategory={filterCategory}
                filterAccount={filterAccount}
                formatEUR={formatEUR}
              />
              <div style={{ marginTop: 20 }} />
              <SpendingHeatmap
                transactions={filteredTransactions}
                startDate={dateRange.start}
                endDate={dateRange.end}
                formatEUR={formatEUR}
              />
            </>
          )}

          {activeTab === 'categories' && (
            <div className="categories-section">
              <h3>Distribuzione Spese per Categoria</h3>
              <div className="table-scroll">
                <table className="expenses-table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Transazioni</th>
                    <th className="amount-col">Totale Spese</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {expensesByCategory.map((c) => {
                    const perc = stats.expenses > 0 ? (c.amount / stats.expenses) * 100 : 0;
                    return (
                      <tr key={c.categoryId + c.categoryName}>
                        <td>{toTitleCase(c.categoryName)}</td>
                        <td>{c.count}</td>
                        <td className="negative amount-col">{formatEUR(c.amount)}</td>
                        <td>{perc.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}><strong>Totale</strong></td>
                    <td className="negative amount-col"><strong>{formatEUR(stats.expenses)}</strong></td>
                    <td><strong>100%</strong></td>
                  </tr>
                </tfoot>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'subcategories' && (
            <div className="categories-section">
              <h3>Distribuzione Spese per Sottocategoria</h3>
              <div className="table-scroll">
                <table className="expenses-table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Sottocategoria</th>
                    <th>Transazioni</th>
                    <th className="amount-col">Totale Spese</th>
                  </tr>
                </thead>
                <tbody>
                  {expensesBySubCategory.map((x) => (
                    <tr key={`${x.categoryId}-${x.subCategoryId}`}>
                      <td>{toTitleCase(x.categoryName)}</td>
                      <td>{toTitleCase(x.subCategoryName || 'Senza sottocategoria')}</td>
                      <td>{x.count}</td>
                      <td className="negative amount-col">{formatEUR(x.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'accounts' && (
            <div className="accounts-section">
              <h3>Analisi per Conto</h3>
              <div className="accounts-grid">
                {statsByAccount.map((a) => {
                  const net = a.income - a.expenses;
                  return (
                    <div key={a.accountId + a.accountName} className="account-detail-card">
                      <div className="account-header">
                        <div className="account-icon-large">CC</div>
                        <div className="account-info">
                          <h4>{toTitleCase(a.accountName)}</h4>
                          <p className="account-type">{a.count} transazioni</p>
                        </div>
                      </div>

                      <div className="account-stats">
                        <div className="stat-row">
                          <span className="stat-label">Entrate</span>
                          <span className="stat-value positive">{formatEUR(a.income)}</span>
                        </div>
                        <div className="stat-row">
                          <span className="stat-label">Uscite</span>
                          <span className="stat-value negative">{formatEUR(a.expenses)}</span>
                        </div>
                        <div className="stat-row">
                          <span className="stat-label">Netto</span>
                          <span className={`stat-value ${net >= 0 ? 'positive' : 'negative'}`}>{formatEUR(net)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="categories-section">
              <h3>Transazioni (dettaglio)</h3>
              <div className="table-scroll">
                <table className="full-transactions-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrizione</th>
                    <th>Categoria</th>
                    <th>Sottocategoria</th>
                    <th>Conto</th>
                    <th>Tipo</th>
                    <th className="amount-col">Importo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((t) => {
                    const isTransfer = t.__type === 'transfer';
                    const accountLabel = isTransfer
                      ? `Da ${t.__fromAccountName || 'Conto'} -> A ${t.__toAccountName || 'Conto'}`
                      : getAccountNameFromTx(t);

                    return (
                      <tr key={t.id}>
                        <td>{formatDateIT(t.__date)}</td>
                        <td>{t.description || (isTransfer ? 'Giroconto' : 'Nessuna descrizione')}</td>
                        <td>{toTitleCase(getCategoryNameFromTx(t))}</td>
                        <td>{toTitleCase(getSubCategoryNameFromTx(t) || 'Senza sottocategoria')}</td>
                        <td>{toTitleCase(accountLabel)}</td>
                        <td>
                          <span className={`type-badge ${t.__type}`}>
                            {t.__type === 'income' ? 'Entrata' : t.__type === 'expense' ? 'Uscita' : 'Trasferimento'}
                          </span>
                        </td>
                        <td className={`amount-col ${t.__type === 'expense' ? 'negative' : t.__type === 'income' ? 'positive' : ''}`}>
                          {formatEUR(isTransfer ? t.__amount : t.__amountSigned)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'subscriptions' && (
            <div className="categories-section subscriptions-report-section">
              <h3>Report Abbonamenti</h3>

              <div className="subscriptions-report-kpis">
                <div className="comparison-card">
                  <div className="label">Totale Mensile (equivalente)</div>
                  <div className="value">{formatEUR(subscriptionsStats.monthlyTotal)}</div>
                </div>
                <div className="comparison-card">
                  <div className="label">Totale Annuale (equivalente)</div>
                  <div className="value">{formatEUR(subscriptionsStats.annualTotal)}</div>
                </div>
                <div className="comparison-card">
                  <div className="label">Attivi / In pausa</div>
                  <div className="value">{subscriptionsStats.active} / {subscriptionsStats.paused}</div>
                </div>
                <div className="comparison-card">
                  <div className="label">Scadenze 30 giorni</div>
                  <div className="value">{subscriptionsStats.due30}</div>
                </div>
                <div className="comparison-card">
                  <div className="label">Speso ultimi 30 giorni</div>
                  <div className="value">{formatEUR(subscriptionsPaymentStats.last30)}</div>
                </div>
                <div className="comparison-card">
                  <div className="label">Speso ultimi 90 giorni</div>
                  <div className="value">{formatEUR(subscriptionsPaymentStats.last90)}</div>
                </div>
                <div className="comparison-card">
                  <div className="label">Vs 30 giorni precedenti</div>
                  <div className={`value ${subscriptionsPaymentStats.delta30 <= 0 ? 'positive' : 'negative'}`}>
                    {subscriptionsPaymentStats.delta30 >= 0 ? '+' : ''}
                    {formatEUR(subscriptionsPaymentStats.delta30)}
                  </div>
                </div>
              </div>

              {subscriptionsLoading ? (
                <div className="subscriptions-report-empty">Caricamento abbonamenti...</div>
              ) : filteredSubscriptions.length === 0 ? (
                <div className="subscriptions-report-empty">Nessun abbonamento per i filtri selezionati.</div>
              ) : (
                <>
                  <div className="subscriptions-reconciliation">
                    <div className="subscriptions-reconciliation-head">
                      <h4>Riconciliazione pagamenti vs transazioni</h4>
                      <span
                        className={`subscriptions-reconciliation-status ${
                          subscriptionsReconciliation.missingTransactionsCount === 0 &&
                          subscriptionsReconciliation.transactionsWithoutPaymentCount === 0 &&
                          Math.abs(subscriptionsReconciliation.deltaAmount) < 0.01
                            ? 'ok'
                            : 'warning'
                        }`}
                      >
                        {subscriptionsReconciliation.missingTransactionsCount === 0 &&
                        subscriptionsReconciliation.transactionsWithoutPaymentCount === 0
                          ? 'Allineato'
                          : 'Da verificare'}
                      </span>
                    </div>
                    <div className="subscriptions-reconcile-bulk-actions">
                      <button
                        type="button"
                        className="subscriptions-reconcile-btn"
                        disabled={
                          !!subscriptionsReconcileBusyId || subscriptionsReconciliation.missingTransactionsCount === 0
                        }
                        onClick={handleCreateAllMissingSubscriptionTransactions}
                      >
                        {subscriptionsReconcileBusyId === 'bulk-payment' ? 'Creazione...' : 'Crea tutte le transazioni mancanti'}
                      </button>
                      <button
                        type="button"
                        className="subscriptions-reconcile-btn"
                        disabled={
                          !!subscriptionsReconcileBusyId ||
                          subscriptionsReconciliation.transactionsWithoutPaymentCount === 0
                        }
                        onClick={handleCreateAllMissingSubscriptionPayments}
                      >
                        {subscriptionsReconcileBusyId === 'bulk-tx' ? 'Creazione...' : 'Crea tutti i pagamenti mancanti'}
                      </button>
                    </div>
                    {subscriptionsReconcileMessage?.text ? (
                      <div
                        className={`subscriptions-reconcile-feedback ${
                          subscriptionsReconcileMessage.type === 'success' ? 'success' : 'error'
                        }`}
                      >
                        {subscriptionsReconcileMessage.text}
                      </div>
                    ) : null}
                    <div className="subscriptions-reconciliation-kpis">
                      <div className="comparison-card">
                        <div className="label">Pagamenti registrati</div>
                        <div className="value">{subscriptionsReconciliation.paymentsCount}</div>
                      </div>
                      <div className="comparison-card">
                        <div className="label">Transazioni generate</div>
                        <div className="value">{subscriptionsReconciliation.transactionsCount}</div>
                      </div>
                      <div className="comparison-card">
                        <div className="label">Riconciliati</div>
                        <div className="value">{subscriptionsReconciliation.matchedCount}</div>
                      </div>
                      <div className="comparison-card">
                        <div className="label">Mancano transazioni</div>
                        <div className="value negative">{subscriptionsReconciliation.missingTransactionsCount}</div>
                      </div>
                      <div className="comparison-card">
                        <div className="label">Transazioni senza pagamento</div>
                        <div className="value negative">{subscriptionsReconciliation.transactionsWithoutPaymentCount}</div>
                      </div>
                      <div className="comparison-card">
                        <div className="label">Delta importi</div>
                        <div
                          className={`value ${
                            Math.abs(subscriptionsReconciliation.deltaAmount) < 0.01
                              ? ''
                              : subscriptionsReconciliation.deltaAmount <= 0
                              ? 'positive'
                              : 'negative'
                          }`}
                        >
                          {subscriptionsReconciliation.deltaAmount > 0 ? '+' : ''}
                          {formatEUR(subscriptionsReconciliation.deltaAmount)}
                        </div>
                      </div>
                    </div>

                    <div className="subscriptions-reconciliation-tables">
                      <div className="table-scroll">
                        <table className="expenses-table">
                          <thead>
                            <tr>
                              <th colSpan={4}>Pagamenti senza transazione</th>
                            </tr>
                            <tr>
                              <th>Data</th>
                              <th>Abbonamento</th>
                              <th>Intestatario</th>
                              <th className="amount-col">Importo</th>
                              <th>Azione</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subscriptionsReconciliation.missingTransactions.length === 0 ? (
                              <tr>
                                <td colSpan={5}>Nessuna discrepanza.</td>
                              </tr>
                            ) : (
                              subscriptionsReconciliation.missingTransactions.map((p) => (
                                <tr key={p.id}>
                                  <td>{formatDateIT(p.paidAt)}</td>
                                  <td>{p.subscriptionName || 'N/D'}</td>
                                  <td>{toTitleCase(p.ownerName || 'Tu')}</td>
                                  <td className="amount-col">{formatEUR(p.amount)}</td>
                                  <td>
                                    <button
                                      type="button"
                                      className="subscriptions-reconcile-btn"
                                      disabled={!!subscriptionsReconcileBusyId}
                                      onClick={() => handleCreateMissingSubscriptionTransaction(p)}
                                    >
                                      {subscriptionsReconcileBusyId === `payment-${p.id}` ? 'Creazione...' : 'Crea transazione'}
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="table-scroll">
                        <table className="expenses-table">
                          <thead>
                            <tr>
                              <th colSpan={4}>Transazioni senza pagamento</th>
                            </tr>
                            <tr>
                              <th>Data</th>
                              <th>Abbonamento</th>
                              <th>Descrizione</th>
                              <th className="amount-col">Importo</th>
                              <th>Azione</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subscriptionsReconciliation.transactionsWithoutPayment.length === 0 ? (
                              <tr>
                                <td colSpan={5}>Nessuna discrepanza.</td>
                              </tr>
                            ) : (
                              subscriptionsReconciliation.transactionsWithoutPayment.map((t) => (
                                <tr key={t.id}>
                                  <td>{formatDateIT(t.__date)}</td>
                                  <td>{t.subscriptionName || 'N/D'}</td>
                                  <td>{t.description || 'N/D'}</td>
                                  <td className="amount-col">{formatEUR(t.__amount)}</td>
                                  <td>
                                    <button
                                      type="button"
                                      className="subscriptions-reconcile-btn"
                                      disabled={!!subscriptionsReconcileBusyId}
                                      onClick={() => handleCreateMissingSubscriptionPayment(t)}
                                    >
                                      {subscriptionsReconcileBusyId === `tx-${t.id}` ? 'Creazione...' : 'Crea pagamento'}
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="table-scroll">
                      <div className="subscriptions-report-filters" style={{ padding: 12, paddingBottom: 0 }}>
                        <div className="subscriptions-report-filter-row">
                          <span className="subscriptions-report-filter-label">Stato log</span>
                          <div className="subscriptions-report-chip-row">
                            <button
                              type="button"
                              className={`period-chip ${reconcileLogStatusFilter === 'all' ? 'active' : ''}`}
                              onClick={() => setReconcileLogStatusFilter('all')}
                            >
                              Tutti
                            </button>
                            <button
                              type="button"
                              className={`period-chip ${reconcileLogStatusFilter === 'success' ? 'active' : ''}`}
                              onClick={() => setReconcileLogStatusFilter('success')}
                            >
                              Solo OK
                            </button>
                            <button
                              type="button"
                              className={`period-chip ${reconcileLogStatusFilter === 'error' ? 'active' : ''}`}
                              onClick={() => setReconcileLogStatusFilter('error')}
                            >
                              Solo errori
                            </button>
                          </div>
                        </div>
                        <div className="subscriptions-report-filter-row">
                          <span className="subscriptions-report-filter-label">Modalita</span>
                          <div className="subscriptions-report-chip-row">
                            <button
                              type="button"
                              className={`period-chip ${reconcileLogModeFilter === 'all' ? 'active' : ''}`}
                              onClick={() => setReconcileLogModeFilter('all')}
                            >
                              Tutte
                            </button>
                            <button
                              type="button"
                              className={`period-chip ${reconcileLogModeFilter === 'single' ? 'active' : ''}`}
                              onClick={() => setReconcileLogModeFilter('single')}
                            >
                              Singole
                            </button>
                            <button
                              type="button"
                              className={`period-chip ${reconcileLogModeFilter === 'bulk' ? 'active' : ''}`}
                              onClick={() => setReconcileLogModeFilter('bulk')}
                            >
                              Bulk
                            </button>
                          </div>
                        </div>
                        <div className="subscriptions-report-filter-row">
                          <span className="subscriptions-report-filter-label">Periodo</span>
                          <div className="subscriptions-report-chip-row">
                            <button
                              type="button"
                              className={`period-chip ${reconcileLogRangeFilter === '7d' ? 'active' : ''}`}
                              onClick={() => setReconcileLogRangeFilter('7d')}
                            >
                              Ultimi 7g
                            </button>
                            <button
                              type="button"
                              className={`period-chip ${reconcileLogRangeFilter === '30d' ? 'active' : ''}`}
                              onClick={() => setReconcileLogRangeFilter('30d')}
                            >
                              Ultimi 30g
                            </button>
                            <button
                              type="button"
                              className={`period-chip ${reconcileLogRangeFilter === 'all' ? 'active' : ''}`}
                              onClick={() => setReconcileLogRangeFilter('all')}
                            >
                              Tutto
                            </button>
                          </div>
                        </div>
                      </div>
                      <table className="expenses-table">
                        <thead>
                          <tr>
                            <th colSpan={7}>Storico correzioni riconciliazione (ultime 30)</th>
                          </tr>
                          <tr>
                            <th>Quando</th>
                            <th>Azione</th>
                            <th>Modalita</th>
                            <th>Abbonamento</th>
                            <th>Stato</th>
                            <th className="amount-col">Importo</th>
                            <th>Dettagli</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredReconciliationLogs.length === 0 ? (
                            <tr>
                              <td colSpan={7}>Nessun log disponibile.</td>
                            </tr>
                          ) : (
                            filteredReconciliationLogs.map((l) => (
                              <tr key={l.id}>
                                <td>{formatDateIT(l.createdAt || l.actionAt)}</td>
                                <td>{l.actionType === 'createPayment' ? 'Crea pagamento' : 'Crea transazione'}</td>
                                <td>{l.mode === 'bulk' ? 'Bulk' : 'Singola'}</td>
                                <td>{l.subscriptionName || 'N/D'}</td>
                                <td>{l.status === 'success' ? 'OK' : 'Errore'}</td>
                                <td className="amount-col">{formatEUR(l.amount || 0)}</td>
                                <td>{l.errorMessage || l.notes || '-'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="subscriptions-trend">
                    <div className="subscriptions-trend-head">
                      <h4>Trend costi abbonamenti (prossimi {subscriptionsTrendMonths} mesi)</h4>
                      <div className="subscriptions-trend-range">
                        {[12, 6, 3].map((n) => (
                          <button
                            key={n}
                            type="button"
                            className={`period-chip ${subscriptionsTrendMonths === n ? 'active' : ''}`}
                            onClick={() => setSubscriptionsTrendMonths(n)}
                          >
                            {n} mesi
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="subscriptions-trend-grid">
                      {subscriptionsMonthlyTrend.months.map((m) => {
                        const h = Math.max(4, Math.round((m.total / subscriptionsMonthlyTrend.max) * 100));
                        return (
                          <div className="subscriptions-trend-col" key={m.key}>
                            <div className="subscriptions-trend-bar-wrap">
                              <div className="subscriptions-trend-bar" style={{ height: `${h}%` }} />
                            </div>
                            <div className="subscriptions-trend-value">{formatEUR(m.total)}</div>
                            <div className="subscriptions-trend-label">{m.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="subscriptions-breakdowns">
                    <div className="table-scroll">
                      <table className="expenses-table">
                        <thead>
                          <tr>
                            <th>Per intestatario</th>
                            <th>Abbonamenti</th>
                            <th className="amount-col">Mensile eq.</th>
                            <th className="amount-col">Annuale eq.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subscriptionsByOwner.map((r) => (
                            <tr key={r.owner}>
                              <td>{toTitleCase(r.owner)}</td>
                              <td>{r.count}</td>
                              <td className="amount-col">{formatEUR(r.monthly)}</td>
                              <td className="amount-col">{formatEUR(r.annual)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="table-scroll">
                      <table className="expenses-table">
                        <thead>
                          <tr>
                            <th>Per fornitore</th>
                            <th>Abbonamenti</th>
                            <th className="amount-col">Mensile eq.</th>
                            <th className="amount-col">Annuale eq.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subscriptionsByProvider.map((r) => (
                            <tr key={r.provider}>
                              <td>{toTitleCase(r.provider)}</td>
                              <td>{r.count}</td>
                              <td className="amount-col">{formatEUR(r.monthly)}</td>
                              <td className="amount-col">{formatEUR(r.annual)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="table-scroll" style={{ marginTop: 14 }}>
                    <table className="expenses-table">
                      <thead>
                        <tr>
                          <th>Per tipo</th>
                          <th>Abbonamenti</th>
                          <th className="amount-col">Mensile eq.</th>
                          <th className="amount-col">Annuale eq.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subscriptionsByKind.map((r) => (
                          <tr key={r.kind}>
                            <td>{r.kind}</td>
                            <td>{r.count}</td>
                            <td className="amount-col">{formatEUR(r.monthly)}</td>
                            <td className="amount-col">{formatEUR(r.annual)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="table-scroll" style={{ marginTop: 14 }}>
                    <table className="full-transactions-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Intestatario</th>
                          <th>Fornitore</th>
                          <th>Tipo</th>
                          <th>Stato</th>
                          <th>Scadenza</th>
                          <th>Variazione prezzo</th>
                          <th className="amount-col">Mensile eq.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSubscriptions.map((s) => {
                          const dueLabel =
                            s.daysToDue == null
                              ? 'N/D'
                              : s.daysToDue < 0
                              ? `Scaduto da ${Math.abs(s.daysToDue)} gg`
                              : s.daysToDue === 0
                              ? 'Oggi'
                              : s.daysToDue === 1
                              ? 'Domani'
                              : `Tra ${s.daysToDue} gg`;
                          return (
                            <tr key={s.id}>
                              <td>{s.name || 'N/D'}</td>
                              <td>{toTitleCase(s.ownerName || 'Tu')}</td>
                              <td>{toTitleCase(s.provider || '-')}</td>
                              <td>{s.kind === 'fixed' ? 'Scadenza fissa' : 'Ricorrente'}</td>
                              <td>{s.active === false ? 'In pausa' : 'Attivo'}</td>
                              <td>{s.dueDate ? `${formatDateIT(s.dueDate)} (${dueLabel})` : 'N/D'}</td>
                              <td>
                                {s.priceIncreaseDelta > 0 ? (
                                  <span className="price-increase-pill">
                                    +{formatEUR(s.priceIncreaseDelta)} ({formatNumber(s.priceIncreasePercent)}%)
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td className="amount-col">{formatEUR(s.monthlyEquivalent)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Actions */}
      <div className="reports-actions">
        <button className="action-btn export-btn" onClick={isSubscriptionsTab ? exportSubscriptionsCSV : exportCSV}>
          <FiDownload className="btn-icon" /> {isSubscriptionsTab ? 'Esporta CSV Abbonamenti' : 'Esporta CSV'}
        </button>
        <button className="action-btn print-btn" onClick={exportPDF}>
          <FiPrinter className="btn-icon" /> {isSubscriptionsTab ? 'Esporta PDF Abbonamenti' : 'Esporta PDF'}
        </button>
        <button className="action-btn print-btn" onClick={() => window.print()}>
          <FiPrinter className="btn-icon" /> Stampa
        </button>
      </div>
    </div>
  );
}

export default Reports;
