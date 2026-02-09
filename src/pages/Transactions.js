// src/pages/Transactions.js
import React, { useState, useMemo, useCallback } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import { useAuth } from '../contexts/AuthContext';
import AddTransactionForm from './AddTransactionForm';
import EditTransactionForm from './EditTransactionForm';
import './Transactions.css';

const Transactions = () => {
  const { transactions, accounts, categories, loading, deleteTransaction } = useFinancial();
  const { user } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(null);

  const [filterType, setFilterType] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');

  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // === DATE HELPERS ===
  const parseDate = (date) => {
    if (!date) return new Date();

    // Firestore Timestamp
    if (date && typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
      return date.toDate();
    }

    if (date instanceof Date) return date;

    return new Date(date);
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
      year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  // === NORMALIZZAZIONE CAMPI (compatibile tx vecchie/nuove) ===
  const getCategoryId = useCallback((tx) => tx?.categoryId || tx?.category || null, []);
  const getSubCategoryId = useCallback((tx) => tx?.subCategoryId || tx?.subCategory || null, []);

  // === MAPPE (ID -> LABEL) ===
  const accountMap = useMemo(
    () => Object.fromEntries(accounts.map((acc) => [acc.id, acc.name])),
    [accounts]
  );

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((cat) => [cat.id, cat.name])),
    [categories]
  );

  // Mappa sottocategorie: "categoryId:subId" -> "Nome Sottocategoria"
  const subCategoryMap = useMemo(() => {
    const entries = [];
    for (const cat of categories) {
      const subs = Array.isArray(cat.subCategories) ? cat.subCategories : [];
      for (const sub of subs) {
        if (sub && sub.id && sub.name) {
          entries.push([`${cat.id}:${sub.id}`, sub.name]);
        }
      }
    }
    return Object.fromEntries(entries);
  }, [categories]);

  // === ICONA/COLORE CATEGORIA (usa ID normalizzato) ===
  const getCategoryIcon = useCallback(
    (txOrCategoryId) => {
      const categoryId =
        typeof txOrCategoryId === 'string' ? txOrCategoryId : getCategoryId(txOrCategoryId);
      if (!categoryId) return '💰';
      const category = categories.find((cat) => cat.id === categoryId);
      return category?.icon || '💰';
    },
    [categories, getCategoryId]
  );

  const getCategoryColor = useCallback(
    (txOrCategoryId) => {
      const categoryId =
        typeof txOrCategoryId === 'string' ? txOrCategoryId : getCategoryId(txOrCategoryId);
      if (!categoryId) return '#6b7280';
      const category = categories.find((cat) => cat.id === categoryId);
      return category?.color || '#6b7280';
    },
    [categories, getCategoryId]
  );

  // === SOTTOCATEGORIA: RISOLUZIONE ID -> NOME (stabile) ===
  const getSubCategoryLabel = useCallback(
    (tx) => {
      // 1) Se ho un nome già pronto
      if (tx?.subCategoryName && typeof tx.subCategoryName === 'string') return tx.subCategoryName;

      const catId = getCategoryId(tx);
      const subId = getSubCategoryId(tx);

      if (!catId || !subId) return '';

      // 2) Provo a risolvere via mappa "catId:subId"
      const resolved = subCategoryMap[`${catId}:${subId}`];
      if (resolved) return resolved;

      // 3) Se subCategory era già un nome (vecchio formato)
      if (typeof tx?.subCategory === 'string') return tx.subCategory;

      return '';
    },
    [getCategoryId, getSubCategoryId, subCategoryMap]
  );

  // === FILTRI + ORDINAMENTO ===
  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter((tx) => {
      const matchesType =
        filterType === 'all' ||
        (filterType === 'income' && tx.amount > 0) ||
        (filterType === 'expense' && tx.amount < 0);

      const matchesAccount = selectedAccount === 'all' || tx.accountId === selectedAccount;

      const catId = getCategoryId(tx);
      const matchesCategory = selectedCategory === 'all' || catId === selectedCategory;

      const subLabel = getSubCategoryLabel(tx);

      const q = (searchTerm || '').toLowerCase();

      const matchesSearch =
        !q ||
        (tx.description && tx.description.toLowerCase().includes(q)) ||
        (accountMap[tx.accountId] && accountMap[tx.accountId].toLowerCase().includes(q)) ||
        (catId && categoryMap[catId] && categoryMap[catId].toLowerCase().includes(q)) ||
        (subLabel && subLabel.toLowerCase().includes(q));

      return matchesType && matchesAccount && matchesCategory && matchesSearch;
    });

    filtered.sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      return dateB - dateA;
    });

    return filtered;
  }, [
    transactions,
    filterType,
    selectedAccount,
    selectedCategory,
    searchTerm,
    accountMap,
    categoryMap,
    getCategoryId,
    getSubCategoryLabel,
  ]);

  // === STATISTICHE ===
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyTransactions = transactions.filter((tx) => {
      const txDate = parseDate(tx.date);
      return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
    });

    const totalIncome = transactions
      .filter((tx) => tx.amount && tx.amount > 0)
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    const totalExpenses = transactions
      .filter((tx) => tx.amount && tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);

    const monthlyIncome = monthlyTransactions
      .filter((tx) => tx.amount && tx.amount > 0)
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    const monthlyExpenses = monthlyTransactions
      .filter((tx) => tx.amount && tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);

    return {
      totalIncome,
      totalExpenses,
      totalBalance: totalIncome - totalExpenses,
      monthlyIncome,
      monthlyExpenses,
      monthlyBalance: monthlyIncome - monthlyExpenses,
    };
  }, [transactions]);

  // === DELETE ===
  const startDeleteTransaction = (transactionId) => {
    setTransactionToDelete(transactionId);
  };

  const handleDeleteTransaction = async () => {
    if (!transactionToDelete) return;

    try {
      setDeleting(true);
      await deleteTransaction(transactionToDelete);
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
            {filteredTransactions.length} di {transactions.length} transazioni
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
        </div>
      </div>

      {/* Statistiche Rapide */}
      <div className="quick-stats">
        <div className="stat-item">
          <div className="stat-label">Bilancio Totale</div>
          <div className={`stat-value ${stats.totalBalance >= 0 ? 'positive' : 'negative'}`}>
            €{stats.totalBalance.toFixed(2)}
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Questo Mese</div>
          <div className={`stat-value ${stats.monthlyBalance >= 0 ? 'positive' : 'negative'}`}>
            €{stats.monthlyBalance.toFixed(2)}
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Entrate Totali</div>
          <div className="stat-value positive">€{stats.totalIncome.toFixed(2)}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Uscite Totali</div>
          <div className="stat-value negative">€{stats.totalExpenses.toFixed(2)}</div>
        </div>
      </div>

      {/* Filtri */}
      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Cerca nelle transazioni..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-controls">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="filter-select">
            <option value="all">Tutti i tipi</option>
            <option value="income">Solo entrate</option>
            <option value="expense">Solo uscite</option>
          </select>

          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="filter-select"
          >
            <option value="all">Tutti i conti</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="filter-select"
          >
            <option value="all">Tutte le categorie</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
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
      {transactionToDelete && (
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
          {filteredTransactions.map((tx) => {
            const catId = getCategoryId(tx);
            const subLabel = getSubCategoryLabel(tx);

            return (
              <div key={tx.id} className="transaction-row">
                <div className="transaction-icon-wrapper">
                  <div
                    className="transaction-icon"
                    style={{
                      backgroundColor: getCategoryColor(catId) + '20',
                      color: getCategoryColor(catId),
                    }}
                  >
                    {getCategoryIcon(catId)}
                  </div>
                </div>

                <div className="transaction-info">
                  <div className="transaction-primary">
                    <h4 className="transaction-title">{tx.description || 'Transazione senza descrizione'}</h4>
                    <div className={`transaction-amount ${tx.amount > 0 ? 'income' : 'expense'}`}>
                      {tx.amount >= 0 ? '+' : ''}€{Math.abs(tx.amount || 0).toFixed(2)}
                    </div>
                  </div>

                  <div className="transaction-secondary">
                    <span className="transaction-account">{accountMap[tx.accountId] || 'Conto sconosciuto'}</span>

                    <span className="transaction-category">{categoryMap[catId] || 'Senza categoria'}</span>

                    {subLabel ? <span className="transaction-category">{subLabel}</span> : null}

                    <span className="transaction-date">
                      {formatDate(tx.date)} • {formatTime(tx.date)}
                    </span>
                  </div>
                </div>

                <div className="transaction-actions">
                  <button
                    onClick={() => setShowEditForm(tx)}
                    className="edit-btn"
                    title="Modifica transazione"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => startDeleteTransaction(tx.id)}
                    className="delete-btn"
                    title="Elimina transazione"
                  >
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
                const catId = getCategoryId(tx);
                const subLabel = getSubCategoryLabel(tx);

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
                        <div
                          className="category-indicator"
                          style={{ backgroundColor: getCategoryColor(catId) }}
                        ></div>
                        {tx.description || 'Transazione senza descrizione'}
                      </div>
                    </td>

                    <td className="category-cell">
                      <div className="category-info">
                        <span className="category-icon" style={{ color: getCategoryColor(catId) }}>
                          {getCategoryIcon(catId)}
                        </span>
                        <span className="category-name">{categoryMap[catId] || 'Senza categoria'}</span>
                        {subLabel ? <span className="category-name">{subLabel}</span> : null}
                      </div>
                    </td>

                    <td className="account-cell">{accountMap[tx.accountId] || 'Conto sconosciuto'}</td>

                    <td className="amount-cell">
                      <span className={`amount ${tx.amount > 0 ? 'income' : 'expense'}`}>
                        {tx.amount >= 0 ? '+' : ''}€{Math.abs(tx.amount || 0).toFixed(2)}
                      </span>
                    </td>

                    <td className="actions-cell">
                      <button
                        onClick={() => setShowEditForm(tx)}
                        className="edit-btn-table"
                        title="Modifica transazione"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => startDeleteTransaction(tx.id)}
                        className="delete-btn-table"
                        title="Elimina transazione"
                      >
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
            {searchTerm || filterType !== 'all' || selectedAccount !== 'all' || selectedCategory !== 'all'
              ? 'Prova a modificare i filtri di ricerca.'
              : 'Inizia aggiungendo la tua prima transazione!'}
          </p>

          {!searchTerm &&
            filterType === 'all' &&
            selectedAccount === 'all' &&
            selectedCategory === 'all' && (
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
