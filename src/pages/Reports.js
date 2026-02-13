// src/pages/Reports.js
import React, { useCallback, useMemo, useState } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import './Reports.css';

import {
  FiCalendar,
  FiPieChart,
  FiTrendingUp,
  FiBarChart2,
  FiRefreshCw,
  FiFilter,
  FiDownload,
  FiPrinter
} from 'react-icons/fi';

function Reports() {
  const { transactions = [], accounts = [], categories = [] } = useFinancial();

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

  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      start: firstDay.toISOString().split('T')[0],
      end: todayISO
    };
  });

  const [activeTab, setActiveTab] = useState('overview');

  const [filterType, setFilterType] = useState('all'); // all | income | expense | transfer
  const [filterAccount, setFilterAccount] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSubCategory, setFilterSubCategory] = useState('all');

  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  // -----------------------------
  // Normalizzazione date
  // -----------------------------
  const normalizedStartDate = useMemo(() => {
    if (!dateRange.start) return null;
    const d = new Date(dateRange.start);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [dateRange.start]);

  const normalizedEndDate = useMemo(() => {
    if (!dateRange.end) return null;
    const d = new Date(dateRange.end);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [dateRange.end]);

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
          // se è transfer e ho peer id salvato, prova a matchare anche quello
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
    sortBy,
    sortDir,
    collapseTransfers
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
        const subName = getSubCategoryNameFromTx(t) || '—';
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

  const resetFilters = useCallback(() => {
    setFilterType('all');
    setFilterAccount('all');
    setFilterCategory('all');
    setFilterSubCategory('all');
    setSortBy('date');
    setSortDir('desc');
  }, []);

  // -----------------------------
  // UI pieces
  // -----------------------------
  const formatEUR = useCallback((n) => {
    const v = Number.isFinite(n) ? n : 0;
    return v.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
  }, []);

  const formatDateIT = useCallback((d) => {
    if (!d) return '';
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }, []);

  const MonthlyBars = useMemo(() => {
    const { data, max } = monthlyChart;

    return (
      <div className="chart-container">
        <div className="chart-header">
          <h4>Andamento Mensile (Periodo Selezionato)</h4>
          <span className="chart-subtitle">Entrate vs Uscite per mese (esclusi giroconti)</span>
        </div>

        <div className="chart-bars">
          {data.length === 0 ? (
            <div className="empty-state" style={{ padding: 20 }}>
              <div className="empty-icon">📉</div>
              <h3>Nessun dato nel periodo</h3>
              <p>Prova ad ampliare le date o a resettare i filtri.</p>
            </div>
          ) : (
            data.map((m) => {
              const label = new Date(m.year, m.month, 1).toLocaleDateString('it-IT', { month: 'short', year: 'numeric' });
              const incH = (m.income / max) * 100;
              const expH = (m.expenses / max) * 100;

              return (
                <div key={m.key} className="chart-bar-group">
                  <div className="month-label">{label}</div>
                  <div className="bars-container">
                    {m.income > 0 && (
                      <div
                        className="bar income-bar"
                        style={{ height: `${incH}%`, width: '40%' }}
                        title={`Entrate: ${formatEUR(m.income)}`}
                      >
                        <div className="bar-value">{m.income >= 100 ? formatEUR(m.income).replace(',00', '') : ''}</div>
                      </div>
                    )}
                    {m.expenses > 0 && (
                      <div
                        className="bar expense-bar"
                        style={{ height: `${expH}%`, width: '40%' }}
                        title={`Uscite: ${formatEUR(m.expenses)}`}
                      >
                        <div className="bar-value">{m.expenses >= 100 ? formatEUR(m.expenses).replace(',00', '') : ''}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="chart-legend">
          <div className="legend-item">
            <div className="legend-color income-legend"></div>
            <span>Entrate</span>
          </div>
          <div className="legend-item">
            <div className="legend-color expense-legend"></div>
            <span>Uscite</span>
          </div>
        </div>
      </div>
    );
  }, [monthlyChart, formatEUR]);

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div className="reports-container">
      <div className="reports-header">
        <h1>📊 Reports</h1>
        <p className="reports-subtitle">Grafici, filtri e riepiloghi per categoria, sottocategoria, conto e periodo</p>
      </div>

      <div className="reports-controls">
        {/* Date range */}
        <div className="date-range-controls">
          <div className="control-group">
            <FiCalendar />
            <label>Periodo:</label>
            <div className="date-inputs">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange((p) => ({ ...p, start: e.target.value }))}
                className="date-input"
              />
              <span className="date-separator">al</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange((p) => ({ ...p, end: e.target.value }))}
                className="date-input"
              />
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
          </div>

          <div className="filter-actions">
            <button className="reset-filters-btn" onClick={resetFilters}>
              <FiRefreshCw /> Reset Filtri
            </button>
            <div className="filter-results">
              {stats.count} transazioni trovate {stats.transferCount ? `• ${stats.transferCount} giroconti` : ''}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="report-type-tabs">
          <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            <FiPieChart /> Riepilogo
          </button>
          <button className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}>
            <FiTrendingUp /> Categorie
          </button>
          <button className={`tab-btn ${activeTab === 'subcategories' ? 'active' : ''}`} onClick={() => setActiveTab('subcategories')}>
            <FiTrendingUp /> Sottocategorie
          </button>
          <button className={`tab-btn ${activeTab === 'accounts' ? 'active' : ''}`} onClick={() => setActiveTab('accounts')}>
            <FiBarChart2 /> Conti
          </button>
          <button className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}>
            <FiBarChart2 /> Transazioni
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Saldo Netto</h3>
          <p className={stats.net >= 0 ? 'positive' : 'negative'}>{formatEUR(stats.net)}</p>
        </div>
        <div className="stat-card">
          <h3>Totale Entrate</h3>
          <p className="positive">{formatEUR(stats.income)}</p>
        </div>
        <div className="stat-card">
          <h3>Totale Uscite</h3>
          <p className="negative">{formatEUR(stats.expenses)}</p>
        </div>
        <div className="stat-card">
          <h3>Transazioni</h3>
          <p>{stats.count}</p>
        </div>
      </div>

      {/* Tab content */}
      {stats.count === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🧾</div>
          <h3>Nessuna transazione nel periodo/filtri</h3>
          <p>Controlla le date (soprattutto il giorno finale) oppure premi “Reset Filtri”.</p>
          <button className="empty-action-btn" onClick={resetFilters}>Reset Filtri</button>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <>
              {MonthlyBars}
              <div style={{ marginTop: 20 }} />
              <div className="top-categories-section">
                <h4>🏷️ Top Spese per Categoria</h4>
                <div className="top-categories-list">
                  {expensesByCategory.slice(0, 5).map((c, idx) => {
                    const perc = stats.expenses > 0 ? (c.amount / stats.expenses) * 100 : 0;
                    return (
                      <div key={c.categoryId + c.categoryName} className="top-category-item">
                        <div className="rank">{idx + 1}</div>
                        <div className="category-details">
                          <div className="category-name">{c.categoryName}</div>
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

          {activeTab === 'categories' && (
            <div className="categories-section">
              <h3>Distribuzione Spese per Categoria</h3>
              <table className="expenses-table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Transazioni</th>
                    <th>Totale Spese</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {expensesByCategory.map((c) => {
                    const perc = stats.expenses > 0 ? (c.amount / stats.expenses) * 100 : 0;
                    return (
                      <tr key={c.categoryId + c.categoryName}>
                        <td>{c.categoryName}</td>
                        <td>{c.count}</td>
                        <td className="negative">{formatEUR(c.amount)}</td>
                        <td>{perc.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}><strong>Totale</strong></td>
                    <td className="negative"><strong>{formatEUR(stats.expenses)}</strong></td>
                    <td><strong>100%</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {activeTab === 'subcategories' && (
            <div className="categories-section">
              <h3>Distribuzione Spese per Sottocategoria</h3>
              <table className="expenses-table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Sottocategoria</th>
                    <th>Transazioni</th>
                    <th>Totale Spese</th>
                  </tr>
                </thead>
                <tbody>
                  {expensesBySubCategory.map((x) => (
                    <tr key={`${x.categoryId}-${x.subCategoryId}`}>
                      <td>{x.categoryName}</td>
                      <td>{x.subCategoryName || '—'}</td>
                      <td>{x.count}</td>
                      <td className="negative">{formatEUR(x.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                        <div className="account-icon-large">🏦</div>
                        <div className="account-info">
                          <h4>{a.accountName}</h4>
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
              <table className="full-transactions-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrizione</th>
                    <th>Categoria</th>
                    <th>Sottocategoria</th>
                    <th>Conto</th>
                    <th>Tipo</th>
                    <th>Importo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((t) => {
                    const isTransfer = t.__type === 'transfer';
                    const accountLabel = isTransfer
                      ? `Da ${t.__fromAccountName || 'Conto'} → A ${t.__toAccountName || 'Conto'}`
                      : getAccountNameFromTx(t);

                    return (
                      <tr key={t.id}>
                        <td>{formatDateIT(t.__date)}</td>
                        <td>{t.description || (isTransfer ? 'Giroconto' : 'Nessuna descrizione')}</td>
                        <td>{getCategoryNameFromTx(t)}</td>
                        <td>{getSubCategoryNameFromTx(t) || '—'}</td>
                        <td>{accountLabel}</td>
                        <td>
                          <span className={`type-badge ${t.__type}`}>
                            {t.__type === 'income' ? 'Entrata' : t.__type === 'expense' ? 'Uscita' : 'Trasferimento'}
                          </span>
                        </td>
                        <td className={t.__type === 'expense' ? 'negative' : t.__type === 'income' ? 'positive' : ''}>
                          {formatEUR(isTransfer ? t.__amount : t.__amountSigned)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Actions */}
      <div className="reports-actions">
        <button className="action-btn export-btn" onClick={exportCSV}>
          <FiDownload className="btn-icon" /> Esporta CSV
        </button>
        <button className="action-btn print-btn" onClick={() => window.print()}>
          <FiPrinter className="btn-icon" /> Stampa
        </button>
      </div>
    </div>
  );
}

export default Reports;
