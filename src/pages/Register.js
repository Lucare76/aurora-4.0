// src/pages/Reports.js
import React, { useContext, useState, useEffect, useMemo } from 'react';
import { FinancialContext } from '../contexts/FinancialContext';
import { useAuth } from '../contexts/AuthContext';
import './Reports.css';

const Reports = () => {
  const { transactions, accounts, categories } = useContext(FinancialContext);
  const { user } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState('summary');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [expandedAccount, setExpandedAccount] = useState(null);

  // Inizializza date: primo e ultimo giorno del mese corrente
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  // Helper per convertire date
  const parseDate = (date) => {
    if (!date) return new Date();
    if (date && typeof date === 'object' && 'toDate' in date) {
      return date.toDate();
    }
    return new Date(date);
  };

  // Filtra transazioni per periodo selezionato
  const filteredTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    
    return transactions.filter(t => {
      if (!startDate && !endDate) return true;
      
      const transDate = parseDate(t.date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      if (start && transDate < start) return false;
      if (end && transDate > end) return false;
      return true;
    });
  }, [transactions, startDate, endDate]);

  // Calcola statistiche generali
  const calculateStats = () => {
    if (!filteredTransactions.length) {
      return { 
        totalIncome: 0, 
        totalExpenses: 0, 
        netBalance: 0,
        transactionCount: 0
      };
    }

    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income' || (t.amount && t.amount > 0))
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);

    const totalExpenses = filteredTransactions
      .filter(t => t.type === 'expense' || (t.amount && t.amount < 0))
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);

    const netBalance = totalIncome - totalExpenses;

    return { 
      totalIncome, 
      totalExpenses, 
      netBalance,
      transactionCount: filteredTransactions.length 
    };
  };

  const { totalIncome, totalExpenses, netBalance, transactionCount } = calculateStats();

  // Raggruppa spese per categoria
  const calculateExpensesByCategory = () => {
    const expenses = filteredTransactions.filter(t => 
      t.type === 'expense' || (t.amount && t.amount < 0)
    );
    
    const categoryMap = {};
    const transactionsByCategory = {};

    expenses.forEach(t => {
      // Usa il nome della categoria invece dell'ID per display
      let categoryName = 'Senza categoria';
      let categoryId = 'uncategorized';
      
      if (t.category) {
        const foundCategory = categories.find(c => c.id === t.category);
        if (foundCategory) {
          categoryName = foundCategory.name;
          categoryId = t.category;
        } else {
          categoryName = t.category;
          categoryId = t.category;
        }
      }
      
      if (!categoryMap[categoryId]) {
        categoryMap[categoryId] = {
          id: categoryId,
          name: categoryName,
          total: 0,
          count: 0,
          transactions: []
        };
        transactionsByCategory[categoryId] = [];
      }
      
      const amount = Math.abs(parseFloat(t.amount || 0));
      categoryMap[categoryId].total += amount;
      categoryMap[categoryId].count += 1;
      categoryMap[categoryId].transactions.push(t);
      transactionsByCategory[categoryId].push(t);
    });

    return { categoryMap, transactionsByCategory };
  };

  const { categoryMap, transactionsByCategory } = calculateExpensesByCategory();
  const totalExpensesAll = Object.values(categoryMap).reduce((sum, cat) => sum + cat.total, 0);

  // Calcola entrate per categoria
  const calculateIncomeByCategory = () => {
    const income = filteredTransactions.filter(t => 
      t.type === 'income' || (t.amount && t.amount > 0)
    );
    
    const categoryMap = {};
    const transactionsByCategory = {};

    income.forEach(t => {
      let categoryName = 'Senza categoria';
      let categoryId = 'uncategorized-income';
      
      if (t.category) {
        const foundCategory = categories.find(c => c.id === t.category);
        if (foundCategory) {
          categoryName = foundCategory.name;
          categoryId = t.category;
        } else {
          categoryName = t.category;
          categoryId = t.category;
        }
      }
      
      if (!categoryMap[categoryId]) {
        categoryMap[categoryId] = {
          id: categoryId,
          name: categoryName,
          total: 0,
          count: 0,
          transactions: []
        };
        transactionsByCategory[categoryId] = [];
      }
      
      const amount = Math.abs(parseFloat(t.amount || 0));
      categoryMap[categoryId].total += amount;
      categoryMap[categoryId].count += 1;
      categoryMap[categoryId].transactions.push(t);
      transactionsByCategory[categoryId].push(t);
    });

    return { categoryMap, transactionsByCategory };
  };

  const { categoryMap: incomeCategoryMap, transactionsByCategory: incomeTransactionsByCategory } = calculateIncomeByCategory();
  const totalIncomeAll = Object.values(incomeCategoryMap).reduce((sum, cat) => sum + cat.total, 0);

  // Calcola totale per conto
  const calculateAccountTotals = () => {
    return accounts.map(account => {
      const accountTransactions = filteredTransactions.filter(t => t.accountId === account.id);
      const income = accountTransactions
        .filter(t => t.type === 'income' || (t.amount && t.amount > 0))
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);
      const expenses = accountTransactions
        .filter(t => t.type === 'expense' || (t.amount && t.amount < 0))
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);
      const net = income - expenses;

      return {
        ...account,
        income,
        expenses,
        net,
        transactions: accountTransactions
      };
    });
  };

  const accountTotals = calculateAccountTotals();

  // Formatta data
  const formatDate = (dateString) => {
    try {
      const date = parseDate(dateString);
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'Data non valida';
    }
  };

  // Funzione export CSV
  const exportToCSV = () => {
    const headers = ['Data', 'Descrizione', 'Categoria', 'Tipo', 'Importo', 'Conto'];
    const csvData = filteredTransactions.map(t => {
      const category = categories.find(c => c.id === t.category);
      const account = accounts.find(a => a.id === t.accountId);
      const type = t.type === 'income' || (t.amount && t.amount > 0) ? 'Entrata' : 'Uscita';
      const amount = Math.abs(parseFloat(t.amount || 0));
      
      return [
        formatDate(t.date),
        `"${t.description || ''}"`,
        category?.name || t.category || '',
        type,
        amount.toFixed(2),
        account?.name || ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `report_${startDate}_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Ordina categorie per importo (decrescente)
  const sortedExpenseCategories = Object.values(categoryMap)
    .sort((a, b) => b.total - a.total);

  const sortedIncomeCategories = Object.values(incomeCategoryMap)
    .sort((a, b) => b.total - a.total);

  // Toggle espansione categoria
  const toggleCategory = (categoryId) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  const toggleAccount = (accountId) => {
    setExpandedAccount(expandedAccount === accountId ? null : accountId);
  };

  // Trova icona e colore categoria
  const getCategoryInfo = (categoryId) => {
    if (!categoryId || categoryId === 'uncategorized' || categoryId === 'uncategorized-income') {
      return { icon: '💰', color: '#6b7280' };
    }
    
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      return { icon: category.icon || '💰', color: category.color || '#6b7280' };
    }
    
    return { icon: '💰', color: '#6b7280' };
  };

  if (!user) {
    return (
      <div className="reports-container">
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <h3>Accesso Richiesto</h3>
          <p>Devi effettuare il login per visualizzare i report.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h1>📊 Report Finanziari</h1>
        <p className="reports-subtitle">Analisi dettagliata delle tue transazioni</p>
      </div>

      {/* Controlli */}
      <div className="reports-controls">
        <div className="date-range-controls">
          <div className="control-group">
            <label>Periodo:</label>
            <div className="date-inputs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="date-input"
              />
              <span className="date-separator">al</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="date-input"
              />
            </div>
          </div>
        </div>

        <div className="report-type-tabs">
          <button 
            className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            📈 Riepilogo
          </button>
          <button 
            className={`tab-btn ${activeTab === 'expenses' ? 'active' : ''}`}
            onClick={() => setActiveTab('expenses')}
          >
            📉 Uscite
          </button>
          <button 
            className={`tab-btn ${activeTab === 'income' ? 'active' : ''}`}
            onClick={() => setActiveTab('income')}
          >
            📈 Entrate
          </button>
          <button 
            className={`tab-btn ${activeTab === 'accounts' ? 'active' : ''}`}
            onClick={() => setActiveTab('accounts')}
          >
            🏦 Conti
          </button>
          <button 
            className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            💰 Transazioni
          </button>
        </div>
      </div>

      {/* Statistiche */}
      <div className="stats-grid">
        <div className="stat-card" style={{ borderTopColor: '#4a90e2' }}>
          <h3>Saldo Netto</h3>
          <p className={netBalance >= 0 ? 'positive' : 'negative'}>
            €{netBalance.toFixed(2)}
          </p>
        </div>
        
        <div className="stat-card" style={{ borderTopColor: '#27ae60' }}>
          <h3>Totale Entrate</h3>
          <p className="positive">€{totalIncome.toFixed(2)}</p>
        </div>
        
        <div className="stat-card" style={{ borderTopColor: '#e74c3c' }}>
          <h3>Totale Uscite</h3>
          <p className="negative">€{totalExpenses.toFixed(2)}</p>
        </div>
        
        <div className="stat-card" style={{ borderTopColor: '#9b59b6' }}>
          <h3>Transazioni</h3>
          <p>{transactionCount}</p>
        </div>
      </div>

      {/* Tab Riepilogo */}
      {activeTab === 'summary' && (
        <div className="summary-section">
          <h3>Riepilogo Periodo</h3>
          <table className="summary-table">
            <thead>
              <tr>
                <th>Conto</th>
                <th>Entrate</th>
                <th>Uscite</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {accountTotals.map(account => (
                <tr key={account.id}>
                  <td>{account.name}</td>
                  <td className="positive">€{account.income.toFixed(2)}</td>
                  <td className="negative">€{account.expenses.toFixed(2)}</td>
                  <td className={account.net >= 0 ? 'positive' : 'negative'}>
                    €{account.net.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab Uscite */}
      {activeTab === 'expenses' && (
        <div className="categories-section">
          <h3>Distribuzione Uscite per Categoria</h3>
          
          <div className="category-list">
            {sortedExpenseCategories.map(category => {
              const percentage = totalExpensesAll > 0 
                ? ((category.total / totalExpensesAll) * 100).toFixed(1)
                : '0.0';
              const categoryInfo = getCategoryInfo(category.id);
              
              return (
                <React.Fragment key={category.id}>
                  <div 
                    className="category-item" 
                    onClick={() => toggleCategory(category.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="category-info">
                      <div className="category-icon-preview" style={{ color: categoryInfo.color }}>
                        {categoryInfo.icon}
                      </div>
                      <div className="category-name">{category.name}</div>
                      <div className="category-percentage">{percentage}%</div>
                      <div className="category-amount negative">€{category.total.toFixed(2)}</div>
                    </div>
                    <div className="toggle-details">
                      {expandedCategory === category.id ? '▼' : '▶'} Dettagli
                    </div>
                  </div>
                  
                  {/* Dettaglio transazioni per categoria */}
                  {expandedCategory === category.id && (
                    <div className="category-details">
                      <table className="expenses-table">
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Descrizione</th>
                            <th>Importo</th>
                            <th>Conto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactionsByCategory[category.id]?.map(trans => {
                            const account = accounts.find(a => a.id === trans.accountId);
                            return (
                              <tr key={trans.id}>
                                <td>{formatDate(trans.date)}</td>
                                <td>{trans.description || 'Nessuna descrizione'}</td>
                                <td className="negative">-€{Math.abs(parseFloat(trans.amount || 0)).toFixed(2)}</td>
                                <td>
                                  {account?.name || 'Sconosciuto'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan="2"><strong>Totale {category.name}:</strong></td>
                            <td colSpan="2" className="negative">
                              <strong>€{category.total.toFixed(2)}</strong> ({category.count} transazioni)
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab Entrate */}
      {activeTab === 'income' && (
        <div className="categories-section">
          <h3>Distribuzione Entrate per Categoria</h3>
          
          <div className="category-list">
            {sortedIncomeCategories.map(category => {
              const percentage = totalIncomeAll > 0 
                ? ((category.total / totalIncomeAll) * 100).toFixed(1)
                : '0.0';
              const categoryInfo = getCategoryInfo(category.id);
              
              return (
                <React.Fragment key={category.id}>
                  <div 
                    className="category-item" 
                    onClick={() => toggleCategory(category.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="category-info">
                      <div className="category-icon-preview" style={{ color: categoryInfo.color }}>
                        {categoryInfo.icon}
                      </div>
                      <div className="category-name">{category.name}</div>
                      <div className="category-percentage">{percentage}%</div>
                      <div className="category-amount positive">€{category.total.toFixed(2)}</div>
                    </div>
                    <div className="toggle-details">
                      {expandedCategory === category.id ? '▼' : '▶'} Dettagli
                    </div>
                  </div>
                  
                  {/* Dettaglio transazioni per categoria */}
                  {expandedCategory === category.id && (
                    <div className="category-details">
                      <table className="expenses-table">
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Descrizione</th>
                            <th>Importo</th>
                            <th>Conto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {incomeTransactionsByCategory[category.id]?.map(trans => {
                            const account = accounts.find(a => a.id === trans.accountId);
                            return (
                              <tr key={trans.id}>
                                <td>{formatDate(trans.date)}</td>
                                <td>{trans.description || 'Nessuna descrizione'}</td>
                                <td className="positive">+€{Math.abs(parseFloat(trans.amount || 0)).toFixed(2)}</td>
                                <td>
                                  {account?.name || 'Sconosciuto'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan="2"><strong>Totale {category.name}:</strong></td>
                            <td colSpan="2" className="positive">
                              <strong>€{category.total.toFixed(2)}</strong> ({category.count} transazioni)
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab Conti */}
      {activeTab === 'accounts' && (
        <div className="accounts-section">
          <h3>Dettaglio Conti</h3>
          
          <div className="accounts-list">
            {accountTotals.map(account => (
              <React.Fragment key={account.id}>
                <div 
                  className="account-item" 
                  onClick={() => toggleAccount(account.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="account-info">
                    <div className="account-name">{account.name}</div>
                    <div className="account-type">{account.type}</div>
                    <div className="account-stats">
                      <span className="positive">€{account.income.toFixed(2)}</span>
                      <span className="negative">€{account.expenses.toFixed(2)}</span>
                      <span className={account.net >= 0 ? 'positive' : 'negative'}>
                        €{account.net.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="toggle-details">
                    {expandedAccount === account.id ? '▼' : '▶'} Dettagli
                  </div>
                </div>
                
                {/* Dettaglio transazioni per conto */}
                {expandedAccount === account.id && (
                  <div className="account-details">
                    <table className="expenses-table">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Descrizione</th>
                          <th>Categoria</th>
                          <th>Tipo</th>
                          <th>Importo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {account.transactions?.map(trans => {
                          const category = categories.find(c => c.id === trans.category);
                          const isIncome = trans.type === 'income' || (trans.amount && trans.amount > 0);
                          
                          return (
                            <tr key={trans.id}>
                              <td>{formatDate(trans.date)}</td>
                              <td>{trans.description || 'Nessuna descrizione'}</td>
                              <td>{category?.name || trans.category || '-'}</td>
                              <td>
                                <span className={`type-badge ${isIncome ? 'income' : 'expense'}`}>
                                  {isIncome ? 'Entrata' : 'Uscita'}
                                </span>
                              </td>
                              <td className={isIncome ? 'positive' : 'negative'}>
                                {isIncome ? '+' : '-'}€{Math.abs(parseFloat(trans.amount || 0)).toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Tab Transazioni */}
      {activeTab === 'transactions' && (
        <div className="transactions-section">
          <h3>Tutte le Transazioni ({filteredTransactions.length})</h3>
          <table className="full-transactions-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrizione</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Importo</th>
                <th>Conto</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(trans => {
                const category = categories.find(c => c.id === trans.category);
                const account = accounts.find(a => a.id === trans.accountId);
                const isIncome = trans.type === 'income' || (trans.amount && trans.amount > 0);
                
                return (
                  <tr key={trans.id}>
                    <td>{formatDate(trans.date)}</td>
                    <td>{trans.description || '-'}</td>
                    <td>{category?.name || trans.category || '-'}</td>
                    <td>
                      <span className={`type-badge ${isIncome ? 'income' : 'expense'}`}>
                        {isIncome ? 'Entrata' : 'Uscita'}
                      </span>
                    </td>
                    <td className={isIncome ? 'positive' : 'negative'}>
                      {isIncome ? '+' : '-'}€{Math.abs(parseFloat(trans.amount)).toFixed(2)}
                    </td>
                    <td>
                      {account?.name || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Azioni */}
      <div className="reports-actions">
        <button onClick={exportToCSV} className="action-btn export-btn">
          <span className="btn-icon">📥</span> Esporta CSV
        </button>
        <button onClick={() => window.print()} className="action-btn print-btn">
          <span className="btn-icon">🖨️</span> Stampa Report
        </button>
      </div>
    </div>
  );
};

export default Reports;