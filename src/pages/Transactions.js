// src/pages/Transactions.js
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/currency';
import AddTransactionForm from './AddTransactionForm';
import EditTransactionForm from './EditTransactionForm';
import './Transactions.css';

const Transactions = ({ initialFilter, onFilterConsumed }) => {
  const { transactions = [], accounts = [], categories = [], loading, deleteTransaction, updateTransaction } = useFinancial();
  const { user, userSettings } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(null);

  const [filterType, setFilterType] = useState('all'); // all | income | expense | transfer
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [presetName, setPresetName] = useState('');
  const [savedPresets, setSavedPresets] = useState(() => {
    try {
      const raw = localStorage.getItem('aurora_tx_filter_presets');
      const parsed = JSON.parse(raw || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAccountId, setBulkAccountId] = useState('all');
  const [bulkCategoryId, setBulkCategoryId] = useState('all');
  const [bulkSubCategoryId, setBulkSubCategoryId] = useState('all');
  const [bulkSaving, setBulkSaving] = useState(false);
  const hasActiveFilters =
    !!searchTerm ||
    filterType !== 'all' ||
    selectedAccount !== 'all' ||
    selectedCategory !== 'all' ||
    selectedMonth !== 'all';

  useEffect(() => {
    if (initialFilter === 'uncategorized') {
      setSelectedCategory('uncategorized');
      if (onFilterConsumed) onFilterConsumed();
    }
  }, [initialFilter, onFilterConsumed]);

  useEffect(() => {
    try {
      localStorage.setItem('aurora_tx_filter_presets', JSON.stringify(savedPresets));
    } catch {
      // ignore localStorage errors
    }
  }, [savedPresets]);
  const formatMoney = useCallback(
    (value) => {
      return formatCurrency(value, userSettings?.currency || 'EUR', { decimals: 2 });
    },
    [userSettings?.currency]
  );
  const bulkCategory = useMemo(
    () => categories.find((c) => c.id === bulkCategoryId) || null,
    [categories, bulkCategoryId]
  );
  const bulkSubOptions = bulkCategory?.subCategories || [];

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
      if (!categoryId) return '💰';
      const category = categories.find((cat) => cat.id === categoryId);
      return category?.icon || '💰';
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

    for (const tx of transactions) {
      if (isTransferTx(tx) && tx.transferId) {
        const g = transferGroups.get(tx.transferId) || [];
        g.push(tx);
        transferGroups.set(tx.transferId, g);
      } else {
        list.push({ ...tx, __displayType: tx.amount >= 0 ? 'income' : 'expense', __isDisplayTransfer: false });
      }
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

        // per compatibilità UI
        categoryId: null,
        categoryName: 'Giroconto'
      });
    }

    // ordina per data
    list.sort((a, b) => parseDate(b.date) - parseDate(a.date));
    return list;
  }, [transactions, isTransferTx, accountMap]);

  // === FILTRI + ORDINAMENTO (sui displayTransactions) ===
  const filteredTransactions = useMemo(() => {
    const q = normalizeForSearch(searchTerm);

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
      const matchesMonth = selectedMonth === 'all' || txMonth === selectedMonth;

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

      const matchesSearch =
        !q ||
        normalizeForSearch(tx.description).includes(q) ||
        normalizeForSearch(accountLabel).includes(q) ||
        normalizeForSearch(catLabel).includes(q) ||
        normalizeForSearch(subLabel).includes(q) ||
        normalizeForSearch(amountLabel).includes(q) ||
        (tx.__isDisplayTransfer && normalizeForSearch('giroconto').includes(q));

      return matchesType && matchesAccount && matchesCategory && matchesMonth && matchesSearch;
    });

    // sort (già ordinato, ma teniamolo stabile)
    filtered.sort((a, b) => parseDate(b.date) - parseDate(a.date));
    return filtered;
  }, [
    displayTransactions,
    filterType,
    selectedAccount,
    selectedCategory,
    selectedMonth,
    searchTerm,
    accountMap,
    categoryMap,
    formatMoney,
    getCategoryId,
    getSubCategoryLabel,
    normalizeForSearch
  ]);

  useEffect(() => {
    // Mantiene selezione solo su righe ancora visibili
    const allowed = new Set(filteredTransactions.filter((t) => !t.__isDisplayTransfer).map((t) => t.id));
    setSelectedIds((prev) => prev.filter((id) => allowed.has(id)));
  }, [filteredTransactions]);

  const monthOptions = useMemo(() => {
    const seen = new Set();
    const options = [];

    for (const tx of displayTransactions) {
      const d = parseDate(tx.date);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (seen.has(value)) continue;
      seen.add(value);
      options.push({
        value,
        label: d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
      });
    }

    return options;
  }, [displayTransactions]);

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

  const selectableTransactions = useMemo(
    () => filteredTransactions.filter((t) => !t.__isDisplayTransfer),
    [filteredTransactions]
  );

  const allVisibleSelected = selectableTransactions.length > 0 && selectedIds.length === selectableTransactions.length;

  const toggleSelectOne = useCallback((id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const toggleSelectAllVisible = useCallback(() => {
    if (allVisibleSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(selectableTransactions.map((t) => t.id));
  }, [allVisibleSelected, selectableTransactions]);

  const applyBulkCategoryChange = useCallback(async () => {
    const canChangeCategory = bulkCategoryId !== 'all';
    const canChangeAccount = bulkAccountId !== 'all';
    if (!selectedIds.length || (!canChangeCategory && !canChangeAccount)) return;

    setBulkSaving(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          updateTransaction(id, {
            ...(canChangeAccount ? { accountId: bulkAccountId } : {}),
            ...(canChangeCategory
              ? {
                  categoryId: bulkCategoryId,
                  subCategoryId: bulkSubCategoryId !== 'all' ? bulkSubCategoryId : null
                }
              : {})
          })
        )
      );
      setSelectedIds([]);
      setBulkAccountId('all');
      setBulkCategoryId('all');
      setBulkSubCategoryId('all');
    } catch (error) {
      console.error('Errore bulk update categoria:', error);
      alert(`Errore aggiornamento multiplo: ${error?.message || 'sconosciuto'}`);
    } finally {
      setBulkSaving(false);
    }
  }, [selectedIds, bulkAccountId, bulkCategoryId, bulkSubCategoryId, updateTransaction]);

  const applyPreset = useCallback((preset) => {
    if (!preset) return;
    setSearchTerm(preset.searchTerm || '');
    setFilterType(preset.filterType || 'all');
    setSelectedAccount(preset.selectedAccount || 'all');
    setSelectedCategory(preset.selectedCategory || 'all');
    setSelectedMonth(preset.selectedMonth || 'all');
  }, []);

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

  const exportFilteredCsv = useCallback(() => {
    const rows = filteredTransactions.map((tx) => {
      const isTransfer = !!tx.__isDisplayTransfer;
      const type = isTransfer ? 'giroconto' : tx.amount >= 0 ? 'entrata' : 'uscita';
      const amount = isTransfer ? Math.abs(Number(tx.amount) || 0) : Math.abs(Number(tx.amount) || 0);
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
    a.download = `transazioni-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [filteredTransactions, getCategoryId, getSubCategoryLabel, categoryMap, accountMap, formatDescription]);

  // === DELETE ===
  const startDeleteTransaction = (transactionIdOrLegId, isTransfer) => {
    setTransactionToDelete({ id: transactionIdOrLegId, isTransfer: !!isTransfer });
  };

  const handleDeleteTransaction = async () => {
    if (!transactionToDelete?.id) return;

    try {
      setDeleting(true);
      await deleteTransaction(transactionToDelete.id); // FinancialContext elimina anche la peer se è giroconto
      setTransactionToDelete(null);
    } catch (error) {
      console.error("❌ Errore nell'eliminazione:", error);
      alert(`Errore: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

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
          <div className="empty-icon">🔒</div>
          <h3>Accesso Richiesto</h3>
          <p>Devi effettuare il login per visualizzare le tue transazioni.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="transactions-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>Transazioni</h1>
          <p className="header-subtitle">
            {filteredTransactions.length} di {displayTransactions.length} transazioni
          </p>
        </div>

        <div className="header-actions">
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              📋 Lista
            </button>
            <button
              className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              📊 Tabella
            </button>
          </div>

          <button className="primary-btn" onClick={() => setShowForm(true)}>
            <span className="btn-icon">+</span>
            Aggiungi Transazione
          </button>
          <button className="secondary-btn export-btn" onClick={exportFilteredCsv} type="button">
            Esporta CSV
          </button>
        </div>
      </div>

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
                setSelectedMonth('all');
              }}
            >
              Reset filtri
            </button>
          )}
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

          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="filter-select">
            <option value="all">Tutti i mesi</option>
            {monthOptions.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
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
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bulk-edit-bar">
          <label className="bulk-checkbox-label">
            <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
            Seleziona tutte ({selectableTransactions.length})
          </label>

          <div className="bulk-edit-controls">
            <select
              value={bulkAccountId}
              onChange={(e) => setBulkAccountId(e.target.value)}
              className="filter-select"
            >
              <option value="all">Conto massivo (opzionale)...</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>

            <select
              value={bulkCategoryId}
              onChange={(e) => {
                setBulkCategoryId(e.target.value);
                setBulkSubCategoryId('all');
              }}
              className="filter-select"
            >
              <option value="all">Categoria massiva...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <select
              value={bulkSubCategoryId}
              onChange={(e) => setBulkSubCategoryId(e.target.value)}
              className="filter-select"
              disabled={!bulkCategory || bulkSubOptions.length === 0}
            >
              <option value="all">Sottocategoria (opzionale)</option>
              {bulkSubOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="clear-filters-btn"
              disabled={!selectedIds.length || (bulkCategoryId === 'all' && bulkAccountId === 'all') || bulkSaving}
              onClick={applyBulkCategoryChange}
            >
              {bulkSaving ? 'Aggiorno...' : `Applica a ${selectedIds.length}`}
            </button>
          </div>
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
        <div className="modal-backdrop" onClick={() => setShowEditForm(null)}>
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
            <p>Sei sicuro di voler eliminare questa transazione? Questa azione non può essere annullata.</p>
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

      {/* Lista / Tabella */}
      {viewMode === 'list' ? (
        <div className="transactions-list">
          {filteredTransactions.map((tx, index) => {
            const txDate = parseDate(tx.date);
            const txMonthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
            const prevTx = index > 0 ? filteredTransactions[index - 1] : null;
            const prevDate = prevTx ? parseDate(prevTx.date) : null;
            const prevMonthKey = prevDate
              ? `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
              : null;
            const showMonthHeader = index === 0 || txMonthKey !== prevMonthKey;
            const monthLabel = txDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

            const isTransfer = !!tx.__isDisplayTransfer;

            if (isTransfer) {
              const txForEdit = {
                id: tx.legId, // id reale
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
                      🔁
                    </div>
                  </div>

                  <div className="transaction-info">
                    <h4 className="transaction-title">{formatDescription(tx.description, 'Giroconto')}</h4>

                    <div className="transaction-secondary">
                      <span className="transaction-account">
                        Da <strong>{tx.fromAccountName || 'Conto'}</strong> → A <strong>{tx.toAccountName || 'Conto'}</strong>
                      </span>

                      <span className="transaction-category">Giroconto</span>

                      <span className="transaction-date">
                        {formatDate(tx.date)} • {formatTime(tx.date)}
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
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => startDeleteTransaction(tx.legId, true)}
                      className="delete-btn"
                      title="Elimina giroconto"
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
                  <input
                    type="checkbox"
                    className="tx-select-checkbox"
                    checked={selectedIds.includes(tx.id)}
                    onChange={() => toggleSelectOne(tx.id)}
                    aria-label="Seleziona transazione"
                  />
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
                    {tx.isRecurring && <span title="Ricorrente">🔄 </span>}
                    {formatDescription(tx.description, 'Transazione senza descrizione')}
                  </h4>

                  <div className="transaction-secondary">
                    <span className="transaction-account">{accountMap[tx.accountId] || 'Conto sconosciuto'}</span>
                    <span className="transaction-category">{categoryMap[catId] || tx.categoryName || 'Senza categoria'}</span>
                    {subLabel ? <span className="transaction-category">{subLabel}</span> : null}
                    <span className="transaction-date">
                      {formatDate(tx.date)} • {formatTime(tx.date)}
                    </span>
                  </div>
                </div>
                <div className={`transaction-amount ${tx.amount > 0 ? 'income' : 'expense'}`}>
                  {`${tx.amount >= 0 ? '+' : '-'} ${formatMoney(Math.abs(tx.amount || 0))}`}
                </div>

                <div className="transaction-actions">
                  <button onClick={() => setShowEditForm(tx)} className="edit-btn" title="Modifica transazione">
                    ✏️
                  </button>
                  <button onClick={() => startDeleteTransaction(tx.id, false)} className="delete-btn" title="Elimina transazione">
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="transactions-table-wrapper">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrizione</th>
                <th>Categoria</th>
                <th>Conto</th>
                <th>Importo</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => {
                const isTransfer = !!tx.__isDisplayTransfer;

                if (isTransfer) {
                  const txForEdit = {
                    id: tx.legId,
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
                    <tr key={tx.id}>
                      <td className="date-cell">
                        <div className="date-info">
                          <div className="date-primary">{formatDate(tx.date)}</div>
                          <div className="date-secondary">{formatTime(tx.date)}</div>
                        </div>
                      </td>

                      <td className="description-cell">
                        <div className="description-wrapper">
                          <div className="category-indicator" style={{ backgroundColor: '#6b7280' }}></div>
                          {formatDescription(tx.description, 'Giroconto')}
                        </div>
                      </td>

                      <td className="category-cell">
                        <div className="category-info">
                          <span className="category-icon" style={{ color: '#6b7280' }}>🔁</span>
                          <span className="category-name">Giroconto</span>
                        </div>
                      </td>

                      <td className="account-cell">
                        Da {tx.fromAccountName || 'Conto'} → A {tx.toAccountName || 'Conto'}
                      </td>

                      <td className="amount-cell">
                        <span className="amount transfer">{formatMoney(tx.amount)}</span>
                      </td>

                      <td className="actions-cell">
                        <button onClick={() => setShowEditForm(txForEdit)} className="edit-btn-table" title="Modifica giroconto">
                          ✏️
                        </button>
                        <button onClick={() => startDeleteTransaction(tx.legId, true)} className="delete-btn-table" title="Elimina giroconto">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                }

                const catId = getCategoryId(tx);
                const subLabel = getSubCategoryLabel(tx);

                return (
                  <tr key={tx.id}>
                    <td className="date-cell">
                      <input
                        type="checkbox"
                        className="tx-select-checkbox"
                        checked={selectedIds.includes(tx.id)}
                        onChange={() => toggleSelectOne(tx.id)}
                        aria-label="Seleziona transazione"
                      />
                      <div className="date-info">
                        <div className="date-primary">{formatDate(tx.date)}</div>
                        <div className="date-secondary">{formatTime(tx.date)}</div>
                      </div>
                    </td>

                    <td className="description-cell">
                      <div className="description-wrapper">
                        <div className="category-indicator" style={{ backgroundColor: getCategoryColor(catId) }}></div>
                        {formatDescription(tx.description, 'Transazione senza descrizione')}
                      </div>
                    </td>

                    <td className="category-cell">
                      <div className="category-info">
                        <span className="category-icon" style={{ color: getCategoryColor(catId) }}>
                          {getCategoryIcon(catId)}
                        </span>
                        <span className="category-name">{categoryMap[catId] || tx.categoryName || 'Senza categoria'}</span>
                        {subLabel ? <span className="category-name">{subLabel}</span> : null}
                      </div>
                    </td>

                    <td className="account-cell">{accountMap[tx.accountId] || 'Conto sconosciuto'}</td>

                    <td className="amount-cell">
                      <span className={`amount ${tx.amount > 0 ? 'income' : 'expense'}`}>
                        {`${tx.amount >= 0 ? '+' : '-'} ${formatMoney(Math.abs(tx.amount || 0))}`}
                      </span>
                    </td>

                    <td className="actions-cell">
                      <button onClick={() => setShowEditForm(tx)} className="edit-btn-table" title="Modifica transazione">
                        ✏️
                      </button>
                      <button onClick={() => startDeleteTransaction(tx.id, false)} className="delete-btn-table" title="Elimina transazione">
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Stato vuoto */}
      {filteredTransactions.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
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


