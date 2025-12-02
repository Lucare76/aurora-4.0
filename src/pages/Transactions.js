import React, { useState, useMemo } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import { useAuth } from '../contexts/AuthContext';
import AddTransactionForm from './AddTransactionForm';
import './Transactions.css';

const Transactions = () => {
  const { transactions, accounts, categories, loading } = useFinancial();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'table'

  // Helper per convertire date (gestisce sia Date che Firestore Timestamp)
  const parseDate = (date) => {
    if (!date) return new Date();
    if (date && typeof date === 'object' && 'toDate' in date) {
      return date.toDate(); // Firestore Timestamp
    }
    return new Date(date); // String o Date object
  };

  // Mappa ID a nome per mostrare nome conto e categoria
  const accountMap = useMemo(() => 
    Object.fromEntries(accounts.map(acc => [acc.id, acc.name])), 
    [accounts]
  );
  const categoryMap = useMemo(() => 
    Object.fromEntries(categories.map(cat => [cat.id, cat.name])), 
    [categories]
  );

  // Filtra e ordina le transazioni
  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter(tx => {
      const matchesType = filterType === 'all' || 
        (filterType === 'income' && tx.amount > 0) ||
        (filterType === 'expense' && tx.amount < 0);
      
      const matchesAccount = selectedAccount === 'all' || tx.accountId === selectedAccount;
      const matchesCategory = selectedCategory === 'all' || tx.category === selectedCategory;
      
      const matchesSearch = !searchTerm || 
        (tx.description && tx.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (accountMap[tx.accountId] && accountMap[tx.accountId].toLowerCase().includes(searchTerm.toLowerCase())) ||
        (categoryMap[tx.category] && categoryMap[tx.category].toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesType && matchesAccount && matchesCategory && matchesSearch;
    });

    // Ordinamento per data (più recenti prima)
    filtered.sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      return dateB - dateA;
    });

    return filtered;
  }, [transactions, filterType, selectedAccount, selectedCategory, searchTerm, accountMap, categoryMap]);

  // Calcola statistiche per il periodo corrente
  const stats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyTransactions = transactions.filter(tx => {
      const txDate = parseDate(tx.date);
      return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
    });
    
    const totalIncome = transactions
      .filter(tx => tx.amount && tx.amount > 0)
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    const totalExpenses = transactions
      .filter(tx => tx.amount && tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
    
    const monthlyIncome = monthlyTransactions
      .filter(tx => tx.amount && tx.amount > 0)
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    const monthlyExpenses = monthlyTransactions
      .filter(tx => tx.amount && tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
    
    return { 
      totalIncome, 
      totalExpenses, 
      totalBalance: totalIncome - totalExpenses,
      monthlyIncome,
      monthlyExpenses,
      monthlyBalance: monthlyIncome - monthlyExpenses
    };
  }, [transactions]);

  const formatDate = (date) => {
    const d = parseDate(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (d.toDateString() === today.toDateString()) return 'Oggi';
    if (d.toDateString() === yesterday.toDateString()) return 'Ieri';
    
    return d.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: '2-digit',
      year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatTime = (date) => {
    const d = parseDate(date);
    return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  const getCategoryIcon = (categoryId) => {
    if (!categoryId) return '💰';
    const category = categories.find(cat => cat.id === categoryId);
    return category?.icon || '💰';
  };

  const getCategoryColor = (categoryId) => {
    if (!categoryId) return '#6b7280';
    const category = categories.find(cat => cat.id === categoryId);
    return category?.color || '#6b7280';
  };

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
          
          <button 
            className="primary-btn"
            onClick={() => setShowForm(true)}
          >
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
          <span className="search-icon">🔍</span>
        </div>
        
        <div className="filter-controls">
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
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
            {accounts.map(account => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
          
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="filter-select"
          >
            <option value="all">Tutte le categorie</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Modal per aggiungere transazione */}
      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <AddTransactionForm onClose={() => setShowForm(false)} />
          </div>
        </div>
      )}

      {/* Lista/Tabella Transazioni */}
      {viewMode === 'list' ? (
        <div className="transactions-list">
          {filteredTransactions.map(tx => (
            <div key={tx.id} className="transaction-row">
              <div className="transaction-icon-wrapper">
                <div 
                  className="transaction-icon"
                  style={{ 
                    backgroundColor: getCategoryColor(tx.category) + '20', 
                    color: getCategoryColor(tx.category) 
                  }}
                >
                  {getCategoryIcon(tx.category)}
                </div>
              </div>
              
              <div className="transaction-info">
                <div className="transaction-primary">
                  <h4 className="transaction-title">{tx.description || 'Transazione senza descrizione'}</h4>
                  <div className={`transaction-amount ${tx.amount > 0 ? 'income' : 'expense'}`}>
                    {tx.amount > 0 ? '+' : ''}€{Math.abs(tx.amount || 0).toFixed(2)}
                  </div>
                </div>
                
                <div className="transaction-secondary">
                  <span className="transaction-account">{accountMap[tx.accountId] || 'Conto sconosciuto'}</span>
                  <span className="transaction-category">{categoryMap[tx.category] || 'Senza categoria'}</span>
                  <span className="transaction-date">{formatDate(tx.date)} • {formatTime(tx.date)}</span>
                </div>
              </div>
            </div>
          ))}
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
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(tx => (
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
                        style={{ backgroundColor: getCategoryColor(tx.category) }}
                      ></div>
                      {tx.description || 'Transazione senza descrizione'}
                    </div>
                  </td>
                  <td className="category-cell">
                    <div className="category-info">
                      <span className="category-icon">{getCategoryIcon(tx.category)}</span>
                      {categoryMap[tx.category] || 'Senza categoria'}
                    </div>
                  </td>
                  <td className="account-cell">{accountMap[tx.accountId] || 'Conto sconosciuto'}</td>
                  <td className="amount-cell">
                    <span className={`amount ${tx.amount > 0 ? 'income' : 'expense'}`}>
                      {tx.amount > 0 ? '+' : ''}€{Math.abs(tx.amount || 0).toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
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
              : 'Inizia aggiungendo la tua prima transazione!'
            }
          </p>
          {!searchTerm && filterType === 'all' && selectedAccount === 'all' && selectedCategory === 'all' && (
            <button
              onClick={() => setShowForm(true)}
              className="secondary-btn"
            >
              Aggiungi Prima Transazione
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Transactions;