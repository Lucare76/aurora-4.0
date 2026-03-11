// src/pages/Transactions.js
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/currency';
import { formatEntityLabel } from '../utils/text';
import { analyzeDataQuality } from '../utils/dataQuality';
import PageHeader from '../components/app/PageHeader';
import AddTransactionForm from './AddTransactionForm';
import EditTransactionForm from './EditTransactionForm';
import './Transactions.css';

const TX_FILTER_PRESETS_KEY = 'aurora_tx_filter_presets';
const TX_LAST_FILTERS_KEY_PREFIX = 'aurora_tx_last_filters';
const SEARCH_ALIASES = {
  atm: ['prelievo', 'bancomat', 'contanti', 'sportello'],
  prelievo: ['atm', 'bancomat', 'contanti'],
  affitto: ['locazione', 'canone', 'rent'],
  benzina: ['carburante', 'diesel', 'gasolio', 'distributore', 'self'],
  carburante: ['benzina', 'diesel', 'gasolio', 'distributore'],
  bollette: ['utenze', 'luce', 'gas', 'acqua'],
  stipendio: ['salary', 'busta paga', 'payroll'],
  bonifico: ['transfer', 'sepa'],
  supermercato: ['spesa', 'market', 'iper'],
  giroconto: ['transfer', 'trasferimento interno']
};

const Transactions = ({ initialFilter, onFilterConsumed }) => {
  const { transactions = [], accounts = [], categories = [], loading, deleteTransaction, updateTransaction } = useFinancial();
  const { user, userSettings, isAdmin } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(null);
  const [showMoreActions, setShowMoreActions] = useState(false);

  const [filterType, setFilterType] = useState('all'); // all | income | expense | transfer
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const getCurrentMonthKey = useCallback(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const currentMonthKey = getCurrentMonthKey();
  const currentMonthLabel = new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  const prevMonthDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d;
  }, []);
  const previousMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const previousMonthLabel = prevMonthDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [presetName, setPresetName] = useState('');
  const [savedPresets, setSavedPresets] = useState(() => {
    try {
      const raw = localStorage.getItem(TX_FILTER_PRESETS_KEY);
      const parsed = JSON.parse(raw || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [didRestoreLastFilters, setDidRestoreLastFilters] = useState(false);

  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [repairingCategories, setRepairingCategories] = useState(false);
  const [visibleCount, setVisibleCount] = useState(60);
  const loadMoreRef = useRef(null);
  const txLastFiltersKey = useMemo(
    () => `${TX_LAST_FILTERS_KEY_PREFIX}_${user?.uid || 'anon'}`,
    [user?.uid]
  );
  const hasActiveFilters =
    !!searchTerm ||
    filterType !== 'all' ||
    selectedAccount !== 'all' ||
    selectedCategory !== 'all';

  useEffect(() => {
    if (!initialFilter) return;

    if (typeof initialFilter === 'string') {
      if (initialFilter === 'uncategorized') {
        setSelectedCategory('uncategorized');
      }
      if (onFilterConsumed) onFilterConsumed();
      return;
    }

    if (typeof initialFilter === 'object') {
      const { type, value } = initialFilter;
      if (type === 'category') setSelectedCategory(value || 'all');
      if (type === 'type') setFilterType(value || 'all');
      if (type === 'account') setSelectedAccount(value || 'all');
      if (type === 'month') setSelectedMonth(value || currentMonthKey);
      if (type === 'search') setSearchTerm(value || '');
      if (onFilterConsumed) onFilterConsumed();
    }
  }, [initialFilter, onFilterConsumed, currentMonthKey]);

  useEffect(() => {
    setVisibleCount(60);
  }, [filterType, selectedAccount, selectedCategory, searchTerm, selectedMonth]);

  useEffect(() => {
    try {
      localStorage.setItem(TX_FILTER_PRESETS_KEY, JSON.stringify(savedPresets));
    } catch {
      // ignore localStorage errors
    }
  }, [savedPresets]);

  useEffect(() => {
    if (!user?.uid || initialFilter || didRestoreLastFilters) return;
    try {
      const raw = localStorage.getItem(txLastFiltersKey);
      const parsed = JSON.parse(raw || '{}');
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.searchTerm === 'string') setSearchTerm(parsed.searchTerm);
        if (typeof parsed.filterType === 'string') setFilterType(parsed.filterType);
        if (typeof parsed.selectedAccount === 'string') setSelectedAccount(parsed.selectedAccount);
        if (typeof parsed.selectedCategory === 'string') setSelectedCategory(parsed.selectedCategory);
        if (typeof parsed.selectedMonth === 'string') setSelectedMonth(parsed.selectedMonth);
      }
    } catch {
      // ignore localStorage errors
    } finally {
      setDidRestoreLastFilters(true);
    }
  }, [user?.uid, initialFilter, didRestoreLastFilters, txLastFiltersKey]);

  useEffect(() => {
    if (!user?.uid) return;
    try {
      localStorage.setItem(
        txLastFiltersKey,
        JSON.stringify({
          searchTerm,
          filterType,
          selectedAccount,
          selectedCategory,
          selectedMonth,
          savedAt: new Date().toISOString()
        })
      );
    } catch {
      // ignore localStorage errors
    }
  }, [user?.uid, txLastFiltersKey, searchTerm, filterType, selectedAccount, selectedCategory, selectedMonth]);

  useEffect(() => {
    if (selectedAccount === 'all') return;
    if (!accounts.some((a) => a.id === selectedAccount)) setSelectedAccount('all');
  }, [accounts, selectedAccount]);

  useEffect(() => {
    if (selectedCategory === 'all' || selectedCategory === 'uncategorized') return;
    if (!categories.some((c) => c.id === selectedCategory)) setSelectedCategory('all');
  }, [categories, selectedCategory]);

  useEffect(() => {
    if (selectedMonth === currentMonthKey || selectedMonth === previousMonthKey) return;
    setSelectedMonth(currentMonthKey);
  }, [selectedMonth, currentMonthKey, previousMonthKey]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 250);
    return () => clearTimeout(t);
  }, [searchTerm]);
  const formatMoney = useCallback(
    (value) => {
      return formatCurrency(value, userSettings?.currency || 'EUR', { decimals: 2 });
    },
    [userSettings?.currency]
  );
  const formatDescription = useCallback(
    (value, fallback) => String(value || fallback).toLocaleUpperCase('it-IT'),
    []
  );
  const normalizeForSearch = useCallback(
    (value) =>
      String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim(),
    []
  );
  const normalizeDescKey = useCallback(
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
  const looksLikeInternalId = useCallback((value) => {
    const v = String(value || '').trim();
    if (!v) return false;
    if (v.includes('_') && /\d/.test(v)) return true;
    if (!v.includes(' ') && /^[A-Za-z0-9_-]{16,}$/.test(v)) return true;
    return false;
  }, []);

  // === DATE HELPERS ===
  const parseDate = (date) => {
    if (!date) return new Date();
    if (date && typeof date === 'object' && typeof date.toDate === 'function') return date.toDate();
    if (date instanceof Date) return date;
    const d = new Date(date);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  };

  const formatTime = (date) => {
    const d = parseDate(date);
    return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (date) => {
    const d = parseDate(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = d.toDateString() === today.toDateString();
    const isYesterday = d.toDateString() === yesterday.toDateString();

    if (isToday) return 'Oggi';
    if (isYesterday) return 'Ieri';

    return d.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  };

  const dateKey = useCallback(
    (value) => {
      let d = value instanceof Date ? value : null;
      if (!d && value && typeof value.toDate === 'function') d = value.toDate();
      if (!d) d = new Date(value);
      if (Number.isNaN(d.getTime())) d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },
    []
  );

  // === NORMALIZZAZIONE CAMPI (compatibile tx vecchie/nuove) ===
  const getCategoryId = useCallback((tx) => tx?.categoryId || tx?.category || null, []);
  const getSubCategoryId = useCallback((tx) => tx?.subCategoryId || tx?.subCategory || null, []);

  const isTransferTx = useCallback((tx) => !!(tx?.isTransfer || tx?.transferId), []);

  // === MAPPE (ID -> LABEL) ===
  const accountMap = useMemo(() => Object.fromEntries(accounts.map((acc) => [acc.id, acc.name])), [accounts]);
  const categoryMap = useMemo(() => Object.fromEntries(categories.map((cat) => [cat.id, cat.name])), [categories]);

  // Mappa sottocategorie: "categoryId:subId" -> "Nome Sottocategoria"
  const subCategoryMap = useMemo(() => {
    const entries = [];
    for (const cat of categories) {
      const subs = Array.isArray(cat.subCategories) ? cat.subCategories : [];
      for (const sub of subs) {
        if (sub && sub.id && sub.name) entries.push([`${cat.id}:${sub.id}`, sub.name]);
      }
    }
    return Object.fromEntries(entries);
  }, [categories]);

  // === ICONA/COLORE CATEGORIA ===
  const getCategoryIcon = useCallback(
    (txOrCategoryId) => {
      const categoryId = typeof txOrCategoryId === 'string' ? txOrCategoryId : getCategoryId(txOrCategoryId);
      if (!categoryId) return 'ðŸ’°';
      const category = categories.find((cat) => cat.id === categoryId);
      return category?.icon || 'ðŸ’°';
    },
    [categories, getCategoryId]
  );

  const getCategoryColor = useCallback(
    (txOrCategoryId) => {
      const categoryId = typeof txOrCategoryId === 'string' ? txOrCategoryId : getCategoryId(txOrCategoryId);
      if (!categoryId) return '#6b7280';
      const category = categories.find((cat) => cat.id === categoryId);
      return category?.color || '#6b7280';
    },
    [categories, getCategoryId]
  );

  // === SOTTOCATEGORIA: RISOLUZIONE ID -> NOME ===
  const getSubCategoryLabel = useCallback(
    (tx) => {
      if (tx?.subCategoryName && typeof tx.subCategoryName === 'string') return tx.subCategoryName;

      const catId = getCategoryId(tx);
      const subId = getSubCategoryId(tx);
      if (!catId || !subId) return '';

      const resolved = subCategoryMap[`${catId}:${subId}`];
      if (resolved) return resolved;

      if (typeof tx?.subCategory === 'string') return tx.subCategory;
      return '';
    },
    [getCategoryId, getSubCategoryId, subCategoryMap]
  );

  // === COLLASSO GIROCONTO: 2 righe -> 1 riga ===
  const displayTransactions = useMemo(() => {
    const list = [];
    const transferGroups = new Map();
    const orphanTransferGroups = new Map();

    const getMinuteKey = (value) => {
      const d = parseDate(value);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    for (const tx of transactions) {
      if (isTransferTx(tx) && tx.transferId) {
        // Giroconto a due gambe creato dall'app (con transferId)
        const g = transferGroups.get(tx.transferId) || [];
        g.push(tx);
        transferGroups.set(tx.transferId, g);
      } else if (tx.type === 'transfer' || (isTransferTx(tx) && !tx.transferId)) {
        // Giroconto senza transferId: provo ad accoppiare le 2 gambe per non mostrarlo doppio.
        const amountAbs = Math.abs(Number(tx.amount) || 0).toFixed(2);
        const day = dateKey(tx.date);
        const minute = getMinuteKey(tx.date);
        const desc = normalizeDescKey(tx.description);
        const rawFrom = tx.fromAccountId || (Number(tx.amount) < 0 ? tx.accountId : tx.transferPeerAccountId) || '';
        const rawTo = tx.toAccountId || (Number(tx.amount) < 0 ? tx.transferPeerAccountId : tx.accountId) || '';
        const pair = [String(rawFrom || '').trim(), String(rawTo || '').trim()].sort().join('|');
        const orphanKey = `${day}|${minute}|${amountAbs}|${desc}|${pair}`;

        const g = orphanTransferGroups.get(orphanKey) || [];
        g.push(tx);
        orphanTransferGroups.set(orphanKey, g);
      } else {
        list.push({ ...tx, __displayType: tx.amount >= 0 ? 'income' : 'expense', __isDisplayTransfer: false });
      }
    }

    for (const legs of orphanTransferGroups.values()) {
      const expenseLeg = legs.find((x) => Number(x.amount) < 0) || legs[0];
      const incomeLeg = legs.find((x) => Number(x.amount) > 0) || null;
      const d = parseDate(expenseLeg.date);
      const amountAbs = Math.max(...legs.map((x) => Math.abs(Number(x.amount) || 0)));

      const fromAccountId =
        expenseLeg.fromAccountId ||
        expenseLeg.accountId ||
        incomeLeg?.transferPeerAccountId ||
        incomeLeg?.fromAccountId ||
        null;
      const toAccountId =
        expenseLeg.toAccountId ||
        expenseLeg.transferPeerAccountId ||
        incomeLeg?.accountId ||
        incomeLeg?.toAccountId ||
        null;

      list.push({
        id: `transfer_orphan_${expenseLeg.id}`,
        __isDisplayTransfer: true,
        __displayType: 'transfer',
        __isUnifiedTransfer: legs.length > 1,
        legId: expenseLeg.id,
        date: d,
        timestamp: expenseLeg.timestamp || d.getTime(),
        description: expenseLeg.description || incomeLeg?.description || '',
        amount: amountAbs,
        fromAccountId,
        toAccountId,
        fromAccountName: accountMap[fromAccountId] || expenseLeg.accountName || incomeLeg?.transferPeerAccountName || 'Conto',
        toAccountName: accountMap[toAccountId] || expenseLeg.transferPeerAccountName || incomeLeg?.accountName || 'Conto',
        categoryId: null,
        categoryName: 'Giroconto'
      });
    }

    for (const [transferId, legs] of transferGroups.entries()) {
      // preferisci la gamba uscita (amount < 0), altrimenti la prima
      const expenseLeg = legs.find((x) => Number(x.amount) < 0) || legs[0];
      const d = parseDate(expenseLeg.date);

      const amountAbs = Math.max(...legs.map((x) => Math.abs(Number(x.amount) || 0)));

      // ricava from/to anche se ho una sola gamba
      let fromAccountId = expenseLeg.accountId || expenseLeg.fromAccountId || null;
      let toAccountId = expenseLeg.transferPeerAccountId || expenseLeg.toAccountId || null;

      if (!fromAccountId || !toAccountId) {
        const incomeLeg = legs.find((x) => Number(x.amount) > 0);
        if (incomeLeg) {
          toAccountId = incomeLeg.accountId || toAccountId;
          fromAccountId = incomeLeg.transferPeerAccountId || fromAccountId;
        }
      }

      const fromName = accountMap[fromAccountId] || expenseLeg.accountName || expenseLeg.transferPeerAccountName || 'Conto';
      const toName = accountMap[toAccountId] || expenseLeg.transferPeerAccountName || 'Conto';

      list.push({
        id: `transfer_${transferId}`, // id UI
        __isDisplayTransfer: true,
        __displayType: 'transfer',
        __isUnifiedTransfer: legs.length > 1,

        // per update/delete usiamo un id reale (leg id)
        legId: expenseLeg.id,
        transferId,

        date: d,
        timestamp: expenseLeg.timestamp || d.getTime(),
        description: expenseLeg.description || '',
        amount: amountAbs,

        fromAccountId,
        toAccountId,
        fromAccountName: fromName,
        toAccountName: toName,

        // per compatibilita UI
        categoryId: null,
        categoryName: 'Giroconto'
      });
    }

    // Filtro finale anti-doppio per giroconti specchiati (A->B e B->A uguali).
    const transferDeduped = [];
    const transferSeen = new Set();
    const transferKeyCount = new Map();
    for (const tx of list) {
      if (!tx.__isDisplayTransfer) continue;
      const minute = getMinuteKey(tx.date);
      const day = dateKey(tx.date);
      const amountAbs = Math.abs(Number(tx.amount) || 0).toFixed(2);
      const desc = normalizeDescKey(tx.description);
      const a = String(tx.fromAccountId || tx.fromAccountName || '').trim().toLowerCase();
      const b = String(tx.toAccountId || tx.toAccountName || '').trim().toLowerCase();
      const pair = [a, b].sort().join('|');
      const key = `${day}|${minute}|${amountAbs}|${desc}|${pair}`;
      transferKeyCount.set(key, (transferKeyCount.get(key) || 0) + 1);
    }
    for (const tx of list) {
      if (!tx.__isDisplayTransfer) {
        transferDeduped.push(tx);
        continue;
      }
      const minute = getMinuteKey(tx.date);
      const day = dateKey(tx.date);
      const amountAbs = Math.abs(Number(tx.amount) || 0).toFixed(2);
      const desc = normalizeDescKey(tx.description);
      const a = String(tx.fromAccountId || tx.fromAccountName || '').trim().toLowerCase();
      const b = String(tx.toAccountId || tx.toAccountName || '').trim().toLowerCase();
      const pair = [a, b].sort().join('|');
      const key = `${day}|${minute}|${amountAbs}|${desc}|${pair}`;
      if (transferSeen.has(key)) continue;
      transferSeen.add(key);
      transferDeduped.push({
        ...tx,
        __isUnifiedTransfer: !!tx.__isUnifiedTransfer || (transferKeyCount.get(key) || 0) > 1
      });
    }

    // ordina per data
    transferDeduped.sort((a, b) => parseDate(b.date) - parseDate(a.date));
    return transferDeduped;
  }, [transactions, isTransferTx, accountMap, dateKey, normalizeDescKey]);

  const [dedupeBusy, setDedupeBusy] = useState(false);
  const qualitySummary = useMemo(
    () => analyzeDataQuality(transactions, { isTransferTx, dateKey, normalizeDescKey }),
    [transactions, isTransferTx, dateKey, normalizeDescKey]
  );
  const duplicateSummary = useMemo(
    () => ({ groups: qualitySummary.duplicateGroups, duplicates: qualitySummary.duplicateCount }),
    [qualitySummary.duplicateGroups, qualitySummary.duplicateCount]
  );

  const handleRemoveDuplicates = useCallback(async () => {
    if (!transactions?.length || dedupeBusy) return;

    setDedupeBusy(true);
    try {
      const groups = new Map();

      for (const tx of transactions) {
        if (isTransferTx(tx)) continue;
        const amountRaw = Number(tx?.amount) || 0;
        const type = tx?.type || (amountRaw >= 0 ? 'income' : 'expense');
        const amountAbs = Math.abs(amountRaw).toFixed(2);
        const accKey = String(tx?.accountId || tx?.accountName || '').trim().toLowerCase();
        const key = `${dateKey(tx?.date)}|${type}|${amountAbs}|${normalizeDescKey(tx?.description)}|${accKey}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(tx);
      }

      const duplicateGroups = [...groups.values()].filter((g) => g.length > 1);
      if (!duplicateGroups.length) {
        alert('Nessun duplicato trovato.');
        return;
      }

      const totalDuplicates = duplicateGroups.reduce((sum, g) => sum + (g.length - 1), 0);
      const sample = duplicateGroups[0]?.[0];
      const sampleDate = sample ? dateKey(sample.date) : '';
      const sampleAmount = sample ? Math.abs(Number(sample.amount) || 0).toFixed(2) : '';
      const sampleDesc = sample ? (sample.description || '') : '';
      const sampleAcc = sample ? (accountMap[sample.accountId] || sample.accountName || '') : '';
      const proceed = window.confirm(
        `Trovati ${totalDuplicates} duplicati in ${duplicateGroups.length} gruppi.\n` +
        (sample ? `Esempio:\n${sampleDate} - EUR ${sampleAmount}\n${sampleAcc ? `Conto: ${sampleAcc}\n` : ''}${sampleDesc}\n\n` : '') +
        `Vuoi rimuovere i duplicati lasciando una sola transazione per gruppo?`
      );
      if (!proceed) return;

      const removed = [];

      for (const group of duplicateGroups) {
        const sorted = [...group].sort((a, b) => parseDate(a.date) - parseDate(b.date));
        const toDelete = sorted.slice(1);
        for (const tx of toDelete) {
          await deleteTransaction(tx.id);
          removed.push(tx);
        }
      }

      const csvRows = [
        ['date', 'type', 'amount', 'account', 'description', 'id'].join(',')
      ];
      for (const tx of removed) {
        const amountRaw = Number(tx?.amount) || 0;
        const type = tx?.type || (amountRaw >= 0 ? 'income' : 'expense');
        const amountAbs = Math.abs(amountRaw).toFixed(2);
        const accountLabel = accountMap[tx.accountId] || tx.accountName || '';
        const desc = String(tx.description || '').replace(/"/g, '""');
        csvRows.push(
          `"${dateKey(tx.date)}","${type}","${amountAbs}","${String(accountLabel).replace(/"/g, '""')}","${desc}","${tx.id}"`
        );
      }

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `duplicati-rimossi-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      alert(`Duplicati rimossi: ${totalDuplicates}. E stato scaricato un CSV di riepilogo.`);
    } catch (err) {
      console.error('Errore rimozione duplicati:', err);
      alert('Errore durante la rimozione dei duplicati.');
    } finally {
      setDedupeBusy(false);
    }
  }, [transactions, isTransferTx, deleteTransaction, normalizeDescKey, dateKey, dedupeBusy, accountMap]);

  // === FILTRI + ORDINAMENTO (sui displayTransactions) ===
  const filteredTransactions = useMemo(() => {
    const q = normalizeForSearch(debouncedSearchTerm);
    const queryTokens = q ? q.split(/\s+/).filter(Boolean) : [];

    let filtered = displayTransactions.filter((tx) => {
      const txType = tx.__displayType;

      const matchesType =
        filterType === 'all' ||
        (filterType === 'income' && txType === 'income') ||
        (filterType === 'expense' && txType === 'expense') ||
        (filterType === 'transfer' && txType === 'transfer');

      // account filter: per giroconto vale se matcha from o to
      const matchesAccount =
        selectedAccount === 'all' ||
        (!tx.__isDisplayTransfer && tx.accountId === selectedAccount) ||
        (tx.__isDisplayTransfer && (tx.fromAccountId === selectedAccount || tx.toAccountId === selectedAccount));

      // category filter: applica solo a non-giroconti
      const catId = getCategoryId(tx);
      const matchesCategory = selectedCategory === 'all' || (selectedCategory === 'uncategorized' ? (!tx.__isDisplayTransfer && !catId) : (!tx.__isDisplayTransfer && catId === selectedCategory));
      const txDate = parseDate(tx.date);
      const txMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
      const matchesMonth = txMonth === selectedMonth;

      // ricerca
      const subLabel = !tx.__isDisplayTransfer ? getSubCategoryLabel(tx) : '';
      const accountLabel = tx.__isDisplayTransfer
        ? `${tx.fromAccountName || ''} ${tx.toAccountName || ''}`
        : (accountMap[tx.accountId] || '');

      const catLabel = !tx.__isDisplayTransfer ? (categoryMap[catId] || tx.categoryName || '') : 'giroconto';
      const amountAbs = Math.abs(Number(tx.amount) || 0);
      const amountLabel = [
        formatMoney(amountAbs),
        amountAbs.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        amountAbs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        amountAbs.toFixed(2)
      ].join(' ');
      const searchableText = normalizeForSearch(
        [
          tx.description || '',
          accountLabel,
          catLabel,
          subLabel,
          amountLabel,
          tx.__isDisplayTransfer ? 'giroconto transfer trasferimento interno' : ''
        ].join(' ')
      );

      const matchesSearch =
        !q ||
        queryTokens.every((token) => {
          const variants = [token, ...(SEARCH_ALIASES[token] || [])].map((v) => normalizeForSearch(v));
          return variants.some((variant) => !!variant && searchableText.includes(variant));
        });

      return matchesType && matchesAccount && matchesCategory && matchesMonth && matchesSearch;
    });

    // sort (gia ordinato, ma teniamolo stabile)
    filtered.sort((a, b) => parseDate(b.date) - parseDate(a.date));
    return filtered;
  }, [
    displayTransactions,
    filterType,
    selectedAccount,
    selectedCategory,
    selectedMonth,
    debouncedSearchTerm,
    accountMap,
    categoryMap,
    formatMoney,
    getCategoryId,
    getSubCategoryLabel,
    normalizeForSearch
  ]);

  const visibleTransactions = useMemo(() => {
    return filteredTransactions.slice(0, visibleCount);
  }, [filteredTransactions, visibleCount]);

  const canLoadMore = visibleCount < filteredTransactions.length;
  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + 60, filteredTransactions.length));
  }, [filteredTransactions.length]);

  useEffect(() => {
    if (!canLoadMore) return;
    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin: '200px 0px', threshold: 0.1 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [canLoadMore, handleLoadMore]);

  // === STATISTICHE (escludi giroconti) ===
  const stats = useMemo(() => {
    const onlyNormal = displayTransactions.filter((t) => !t.__isDisplayTransfer);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyTransactions = onlyNormal.filter((tx) => {
      const txDate = parseDate(tx.date);
      return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
    });

    const totalIncome = onlyNormal.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const totalExpenses = onlyNormal.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);

    const monthlyIncome = monthlyTransactions.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const monthlyExpenses = monthlyTransactions.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);

    return {
      totalIncome,
      totalExpenses,
      totalBalance: totalIncome - totalExpenses,
      monthlyIncome,
      monthlyExpenses,
      monthlyBalance: monthlyIncome - monthlyExpenses
    };
  }, [displayTransactions]);

  const applyPreset = useCallback((preset) => {
    if (!preset) return;
    setSearchTerm(preset.searchTerm || '');
    setFilterType(preset.filterType || 'all');
    setSelectedAccount(preset.selectedAccount || 'all');
    setSelectedCategory(preset.selectedCategory || 'all');
    setSelectedMonth(preset.selectedMonth || currentMonthKey);
  }, [currentMonthKey]);

  const saveCurrentPreset = useCallback(() => {
    const label = String(presetName || '').trim();
    if (!label) return;

    const item = {
      id: `${Date.now()}`,
      name: label,
      searchTerm,
      filterType,
      selectedAccount,
      selectedCategory,
      selectedMonth
    };

    setSavedPresets((prev) => [item, ...prev].slice(0, 10));
    setPresetName('');
  }, [presetName, searchTerm, filterType, selectedAccount, selectedCategory, selectedMonth]);

  const removePreset = useCallback((id) => {
    setSavedPresets((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const buildCsvRows = useCallback((list) => {
    return list.map((tx) => {
      const isTransfer = !!tx.__isDisplayTransfer;
      const type = isTransfer ? 'giroconto' : tx.amount >= 0 ? 'entrata' : 'uscita';
      const amount = Math.abs(Number(tx.amount) || 0);
      const catId = getCategoryId(tx);
      const sub = isTransfer ? '' : getSubCategoryLabel(tx);
      const category = isTransfer ? 'Giroconto' : categoryMap[catId] || tx.categoryName || 'Senza categoria';
      const account = isTransfer
        ? `${tx.fromAccountName || 'Conto'} -> ${tx.toAccountName || 'Conto'}`
        : (accountMap[tx.accountId] || 'Conto sconosciuto');

      return [
        parseDate(tx.date).toLocaleDateString('it-IT'),
        type,
        formatDescription(tx.description, isTransfer ? 'Giroconto' : 'Transazione senza descrizione'),
        category,
        sub,
        account,
        amount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      ];
    });
  }, [accountMap, categoryMap, formatDescription, getCategoryId, getSubCategoryLabel]);

  const exportCsv = useCallback((rows, suffix) => {
    const header = ['Data', 'Tipo', 'Descrizione', 'Categoria', 'Sottocategoria', 'Conto', 'Importo'];
    const csv = [header, ...rows]
      .map((cols) =>
        cols
          .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
          .join(';')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transazioni-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const exportFilteredCsv = useCallback(() => {
    exportCsv(
      buildCsvRows(filteredTransactions),
      selectedMonth === currentMonthKey ? 'mese-corrente' : 'mese-precedente'
    );
  }, [buildCsvRows, exportCsv, filteredTransactions, selectedMonth, currentMonthKey]);

  const exportCurrentMonthCsv = useCallback(() => {
    const currentRows = displayTransactions.filter((tx) => {
      const txDate = parseDate(tx.date);
      const txMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
      return txMonth === currentMonthKey;
    });
    exportCsv(buildCsvRows(currentRows), 'mese-corrente');
  }, [buildCsvRows, displayTransactions, currentMonthKey, exportCsv]);

  // === DELETE ===
  const startDeleteTransaction = (transactionIdOrLegId, isTransfer) => {
    setTransactionToDelete({ id: transactionIdOrLegId, isTransfer: !!isTransfer });
  };

  const handleDeleteTransaction = async () => {
    if (!transactionToDelete?.id) return;

    try {
      setDeleting(true);
      await deleteTransaction(transactionToDelete.id); // FinancialContext elimina anche la peer se e giroconto
      setTransactionToDelete(null);
    } catch (error) {
      console.error("Errore nell'eliminazione:", error);
      alert(`Errore: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleRepairCategories = useCallback(async () => {
    if (repairingCategories) return;
    setRepairingCategories(true);
    try {
      let fixed = 0;

      for (const tx of transactions) {
        if (tx?.isTransfer || tx?.transferId || tx?.type === 'transfer') continue;

        const categoryCandidates = [tx?.categoryId, tx?.category, tx?.categoryName]
          .map((v) => String(v || '').trim())
          .filter(Boolean);

        let matchedCategory = null;
        for (const raw of categoryCandidates) {
          matchedCategory =
            categories.find((c) => c.id === raw) ||
            categories.find((c) => String(c?.name || '').trim().toLowerCase() === raw.toLowerCase()) ||
            null;
          if (matchedCategory) break;
        }

        const desiredCategoryId = matchedCategory?.id || null;
        const desiredCategoryName = matchedCategory?.name || '';

        let desiredSubCategoryId = null;
        let desiredSubCategoryName = '';

        const subCandidates = [tx?.subCategoryId, tx?.subCategory, tx?.subcategory, tx?.subCategoryName]
          .map((v) => String(v || '').trim())
          .filter(Boolean);

        if (subCandidates.length) {
          const catSubs = matchedCategory ? (matchedCategory.subCategories || matchedCategory.subcategories || matchedCategory.children || []) : [];

          for (const raw of subCandidates) {
            let foundSub =
              catSubs.find((s) => s?.id === raw) ||
              catSubs.find((s) => String(s?.name || '').trim().toLowerCase() === raw.toLowerCase());

            if (!foundSub) {
              for (const c of categories) {
                const subs = c?.subCategories || c?.subcategories || c?.children || [];
                foundSub =
                  subs.find((s) => s?.id === raw) ||
                  subs.find((s) => String(s?.name || '').trim().toLowerCase() === raw.toLowerCase());
                if (foundSub) break;
              }
            }

            if (foundSub) {
              desiredSubCategoryId = foundSub.id || null;
              desiredSubCategoryName = foundSub.name || '';
              break;
            }
          }
        }

        const hasDirtyCategoryName = looksLikeInternalId(tx?.categoryName) || !String(tx?.categoryName || '').trim();
        const hasDirtySubName = looksLikeInternalId(tx?.subCategoryName);
        const shouldFix =
          (!!desiredCategoryId && (
            tx?.categoryId !== desiredCategoryId ||
            hasDirtyCategoryName ||
            String(tx?.categoryName || '').trim().toLowerCase() !== String(desiredCategoryName || '').trim().toLowerCase()
          )) ||
          (!!desiredSubCategoryId && (
            tx?.subCategoryId !== desiredSubCategoryId ||
            hasDirtySubName ||
            String(tx?.subCategoryName || '').trim().toLowerCase() !== String(desiredSubCategoryName || '').trim().toLowerCase()
          ));

        if (!shouldFix) continue;

        await updateTransaction(tx.id, {
          categoryId: desiredCategoryId,
          category: desiredCategoryId,
          categoryName: desiredCategoryName || tx?.categoryName || '',
          subCategoryId: desiredSubCategoryId || null,
          subCategory: desiredSubCategoryId || null,
          subCategoryName: desiredSubCategoryName || ''
        });
        fixed += 1;
      }

      alert(fixed > 0 ? `Categorie riparate su ${fixed} transazioni.` : 'Nessuna transazione da riparare.');
    } catch (err) {
      console.error('Errore riparazione categorie:', err);
      alert('Errore durante la riparazione categorie.');
    } finally {
      setRepairingCategories(false);
    }
  }, [transactions, categories, looksLikeInternalId, updateTransaction, repairingCategories]);

  // === STATES ===
  if (loading) {
    return (
      <div className="transactions-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Caricamento transazioni...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="transactions-page">
        <div className="empty-state">
          <div className="empty-icon">ðŸ”’</div>
          <h3>Accesso Richiesto</h3>
          <p>Devi effettuare il login per visualizzare le tue transazioni.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="transactions-page">
      {/* Header */}
      <PageHeader
        className="page-header"
        title="Transazioni"
        subtitle={`${filteredTransactions.length} transazioni - ${selectedMonth === currentMonthKey ? 'mese corrente' : 'mese precedente'}`}
        actions={(
        <div className="header-actions">
          <button className="primary-btn" onClick={() => setShowForm(true)}>
            <span className="btn-icon">+</span>
            Aggiungi Transazione
          </button>
          <button className="secondary-btn hide-mobile" onClick={handleRemoveDuplicates} type="button" disabled={dedupeBusy}>
            {dedupeBusy ? 'Rimozione...' : 'Rimuovi Duplicati'}
            {duplicateSummary.duplicates > 0 && !dedupeBusy && (
              <span style={{ marginLeft: 8, fontWeight: 700 }}>
                ({duplicateSummary.duplicates})
              </span>
            )}
          </button>
          <button className="secondary-btn hide-mobile" onClick={handleRepairCategories} type="button" disabled={repairingCategories}>
            {repairingCategories ? 'Riparazione...' : 'Ripara Categorie'}
          </button>
          <button className="secondary-btn export-btn" onClick={exportFilteredCsv} type="button">
            Esporta CSV
          </button>
          <div className="more-actions mobile-only">
            <button
              type="button"
              className="more-actions-btn"
              onClick={() => setShowMoreActions((v) => !v)}
              aria-expanded={showMoreActions}
              aria-haspopup="menu"
            >
              Altro
            </button>
            {showMoreActions && (
              <div className="more-actions-menu" role="menu">
                <button type="button" className="more-actions-item" onClick={() => { setShowMoreActions(false); exportCurrentMonthCsv(); }}>
                  Esporta mese corrente
                </button>
                <button type="button" className="more-actions-item" onClick={() => { setShowMoreActions(false); handleRemoveDuplicates(); }} disabled={dedupeBusy}>
                  {dedupeBusy ? 'Rimozione...' : 'Rimuovi duplicati'}
                </button>
                <button type="button" className="more-actions-item" onClick={() => { setShowMoreActions(false); handleRepairCategories(); }} disabled={repairingCategories}>
                  {repairingCategories ? 'Riparazione...' : 'Ripara categorie'}
                </button>
              </div>
            )}
          </div>
        </div>
        )}
      />

      {/* Statistiche Rapide */}
      <div className="quick-stats">
        <div className="stat-item">
          <div className="stat-label">Bilancio Totale</div>
          <div className={`stat-value ${stats.totalBalance >= 0 ? 'positive' : 'negative'}`}>
            {formatMoney(stats.totalBalance)}
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Questo Mese</div>
          <div className={`stat-value ${stats.monthlyBalance >= 0 ? 'positive' : 'negative'}`}>
            {formatMoney(stats.monthlyBalance)}
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Entrate Totali</div>
          <div className="stat-value positive">{formatMoney(stats.totalIncome)}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Uscite Totali</div>
          <div className="stat-value negative">{formatMoney(stats.totalExpenses)}</div>
        </div>
      </div>

      <div className={`data-quality-guard level-${qualitySummary.severity}`}>
        <div className="data-quality-head">
          <strong>Data Quality Guard</strong>
          <span>{qualitySummary.issueCount} criticita</span>
        </div>
        <div className="data-quality-chips">
          <span className="dq-chip">Duplicati: {qualitySummary.duplicateCount}</span>
          <span className="dq-chip">Senza categoria: {qualitySummary.missingCategory}</span>
          <span className="dq-chip">Importi anomali: {qualitySummary.highExpenseCount}</span>
        </div>
        <div className="data-quality-actions">
          <button className="secondary-btn hide-mobile" onClick={handleRemoveDuplicates} type="button" disabled={dedupeBusy || qualitySummary.duplicateCount === 0}>
            {dedupeBusy ? 'Rimozione...' : 'Rimuovi duplicati'}
          </button>
          <button className="secondary-btn hide-mobile" onClick={handleRepairCategories} type="button" disabled={repairingCategories || qualitySummary.missingCategory === 0}>
            {repairingCategories ? 'Riparazione...' : 'Ripara categorie'}
          </button>
        </div>
      </div>

      {/* Filtri */}
      <div className="filters-section">
        <div className="filters-top-row">
          <div className="search-box">
            <input
              type="text"
              placeholder="Cerca descrizione, conto, categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              aria-label="Cerca nelle transazioni"
            />
            {searchTerm && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchTerm('')}
                aria-label="Pulisci ricerca"
              >
                &times;
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              className="clear-filters-btn"
              onClick={() => {
                setSearchTerm('');
                setFilterType('all');
                setSelectedAccount('all');
                setSelectedCategory('all');
                setSelectedMonth(currentMonthKey);
              }}
            >
              Reset filtri
            </button>
          )}
        </div>

        <div className="month-quick-toggle">
          <button
            type="button"
            className={`month-toggle-btn ${selectedMonth === currentMonthKey ? 'active' : ''}`}
            onClick={() => setSelectedMonth(currentMonthKey)}
          >
            {currentMonthLabel}
          </button>
          <button
            type="button"
            className={`month-toggle-btn ${selectedMonth === previousMonthKey ? 'active' : ''}`}
            onClick={() => setSelectedMonth(previousMonthKey)}
          >
            {previousMonthLabel}
          </button>
        </div>
        <button type="button" className="month-export-btn" onClick={exportCurrentMonthCsv}>
          Esporta mese corrente
        </button>

        <div className="type-quick-toggle">
          <button
            type="button"
            className={`type-toggle-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            Tutti
          </button>
          <button
            type="button"
            className={`type-toggle-btn ${filterType === 'income' ? 'active' : ''}`}
            onClick={() => setFilterType('income')}
          >
            Entrate
          </button>
          <button
            type="button"
            className={`type-toggle-btn ${filterType === 'expense' ? 'active' : ''}`}
            onClick={() => setFilterType('expense')}
          >
            Uscite
          </button>
          <button
            type="button"
            className={`type-toggle-btn ${filterType === 'transfer' ? 'active' : ''}`}
            onClick={() => setFilterType('transfer')}
          >
            Giroconti
          </button>
        </div>

        <div className="filter-controls">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="filter-select">
            <option value="all">Tutti i tipi</option>
            <option value="income">Solo entrate</option>
            <option value="expense">Solo uscite</option>
            <option value="transfer">Solo giroconti</option>
          </select>

          <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="filter-select">
            <option value="all">Tutti i conti</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>

          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="filter-select">
            <option value="all">Tutte le categorie</option>
            <option value="uncategorized">Senza categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="filter-select" disabled>
            <option value={currentMonthKey}>Mese corrente - {currentMonthLabel}</option>
            <option value={previousMonthKey}>Mese precedente - {previousMonthLabel}</option>
          </select>
        </div>

        <div className="preset-row">
          <div className="preset-save">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Nome preset filtri"
              className="preset-input"
            />
            <button type="button" className="clear-filters-btn" onClick={saveCurrentPreset} disabled={!presetName.trim()}>
              Salva preset
            </button>
          </div>
          {savedPresets.length > 0 && (
            <div className="preset-chips">
              {savedPresets.map((preset) => (
                <div key={preset.id} className="preset-chip-wrap">
                  <button type="button" className="preset-chip" onClick={() => applyPreset(preset)} title="Applica preset">
                    {preset.name}
                  </button>
                  <button
                    type="button"
                    className="preset-chip-delete"
                    onClick={() => removePreset(preset.id)}
                    title="Elimina preset"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Modal Aggiungi */}
      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <AddTransactionForm onClose={() => setShowForm(false)} />
          </div>
        </div>
      )}

      {/* Modal Modifica */}
      {showEditForm && (
        <div className="modal-backdrop">
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <EditTransactionForm transaction={showEditForm} onClose={() => setShowEditForm(null)} />
          </div>
        </div>
      )}

      {/* Modal Conferma Eliminazione */}
      {transactionToDelete?.id && (
        <div className="modal-backdrop">
          <div className="confirm-modal">
            <h3>Conferma Eliminazione</h3>
            <p>Sei sicuro di voler eliminare questa transazione? Questa azione non puo essere annullata.</p>
            <div className="modal-actions">
              <button onClick={() => setTransactionToDelete(null)} className="secondary-btn" disabled={deleting}>
                Annulla
              </button>
              <button onClick={handleDeleteTransaction} className="delete-confirm-btn" disabled={deleting}>
                {deleting ? 'Eliminazione...' : 'Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="transactions-list">
          {visibleTransactions.map((tx, index) => {
            const txDate = parseDate(tx.date);
            const txMonthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
            const prevTx = index > 0 ? visibleTransactions[index - 1] : null;
            const prevDate = prevTx ? parseDate(prevTx.date) : null;
            const prevMonthKey = prevDate
              ? `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
              : null;
            const showMonthHeader = index === 0 || txMonthKey !== prevMonthKey;
            const monthLabel = txDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

            const isTransfer = !!tx.__isDisplayTransfer;

            if (isTransfer) {
              const txForEdit = {
                id: tx.legId || tx.id, // legId per giroconti a 2 gambe, tx.id per giroconti singoli importati
                isTransfer: true,
                transferId: tx.transferId,
                type: 'transfer',
                description: tx.description || '',
                amount: tx.amount,
                fromAccountId: tx.fromAccountId,
                toAccountId: tx.toAccountId,
                date: tx.date
              };

              return (
                <div key={tx.id} className="transaction-row">
                  {showMonthHeader && (
                    <div className="month-header">
                      <span className="month-title">{monthLabel}</span>
                    </div>
                  )}
                  <div className="transaction-icon-wrapper">
                    <div className="transaction-icon" style={{ backgroundColor: '#6b728020', color: '#6b7280' }}>
                      TR
                    </div>
                  </div>

                  <div className="transaction-info">
                    <h4 className="transaction-title">{formatDescription(tx.description, 'Giroconto')}</h4>

                    <div className="transaction-secondary">
                      <span className="transaction-account">
                        Da <strong>{toTitleCase(tx.fromAccountName || 'Conto')}</strong> -> A <strong>{toTitleCase(tx.toAccountName || 'Conto')}</strong>
                      </span>

                      <span className="transaction-category">Giroconto</span>
                      {isAdmin && tx.__isUnifiedTransfer ? (
                        <span className="transaction-category">Giroconto unificato</span>
                      ) : null}

                      <span className="transaction-date">
                        {formatDate(tx.date)} - {formatTime(tx.date)}
                      </span>
                    </div>
                  </div>
                  <div className="transaction-amount transfer">
                    {formatMoney(tx.amount)}
                  </div>

                  <div className="transaction-actions">
                    <button
                      onClick={() => setShowEditForm(txForEdit)}
                      className="edit-btn"
                      title="Modifica giroconto"
                      aria-label="Modifica giroconto"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => startDeleteTransaction(tx.legId || tx.id, true)}
                      className="delete-btn"
                      title="Elimina giroconto"
                      aria-label="Elimina giroconto"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            }

            const catId = getCategoryId(tx);
            const subLabel = getSubCategoryLabel(tx);

            return (
              <div key={tx.id} className="transaction-row">
                {showMonthHeader && (
                  <div className="month-header">
                    <span className="month-title">{monthLabel}</span>
                  </div>
                )}
                <div className="transaction-icon-wrapper">
                  <div
                    className="transaction-icon"
                    style={{
                      backgroundColor: getCategoryColor(catId) + '20',
                      color: getCategoryColor(catId)
                    }}
                  >
                    {getCategoryIcon(catId)}
                  </div>
                </div>

                <div className="transaction-info">
                  <h4 className="transaction-title">
                    {tx.isRecurring && <span title="Ricorrente">* </span>}
                    {formatDescription(tx.description, 'Transazione senza descrizione')}
                  </h4>

                  <div className="transaction-secondary">
                    <span className="transaction-account">{toTitleCase(accountMap[tx.accountId] || 'Conto sconosciuto')}</span>
                    <span className="transaction-category">{toTitleCase(categoryMap[catId] || tx.categoryName || 'Senza categoria')}</span>
                    {subLabel ? <span className="transaction-category">{toTitleCase(subLabel)}</span> : null}
                    <span className="transaction-date">
                      {formatDate(tx.date)} - {formatTime(tx.date)}
                    </span>
                  </div>
                </div>
                <div className={`transaction-amount ${tx.amount > 0 ? 'income' : 'expense'}`}>
                  {`${tx.amount >= 0 ? '+' : '-'} ${formatMoney(Math.abs(tx.amount || 0))}`}
                </div>

                <div className="transaction-actions">
                  <button
                    onClick={() => setShowEditForm(tx)}
                    className="edit-btn"
                    title="Modifica transazione"
                    aria-label="Modifica transazione"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => startDeleteTransaction(tx.id, false)}
                    className="delete-btn"
                    title="Elimina transazione"
                    aria-label="Elimina transazione"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {canLoadMore && (
        <div className="load-more-wrap" ref={loadMoreRef}>
          <button type="button" className="secondary-btn load-more-btn" onClick={handleLoadMore}>
            Carica altre ({Math.min(60, filteredTransactions.length - visibleCount)})
          </button>
        </div>
      )}

      {/* Stato vuoto */}
      {filteredTransactions.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">[ ]</div>
          <h3>Nessuna transazione trovata</h3>
          <p>
            {searchTerm || filterType !== 'all' || selectedAccount !== 'all' || selectedCategory !== 'all' || selectedMonth !== 'all'
              ? 'Prova a modificare i filtri di ricerca.'
              : 'Inizia aggiungendo la tua prima transazione!'}
          </p>

          {!searchTerm && filterType === 'all' && selectedAccount === 'all' && selectedCategory === 'all' && selectedMonth === 'all' && (
            <button onClick={() => setShowForm(true)} className="secondary-btn">
              Aggiungi Prima Transazione
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Transactions;
