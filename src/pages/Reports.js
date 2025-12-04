// src/pages/Reports.js
import React, { useContext, useState, useEffect } from 'react';
import { FinancialContext } from '../contexts/FinancialContext';
import './Reports.css';

const Reports = () => {
  const { transactions, accounts } = useContext(FinancialContext);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState('summary');
  const [expandedCategory, setExpandedCategory] = useState(null);

  // Inizializza date: primo e ultimo giorno del mese corrente
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  // Filtra transazioni per periodo selezionato
  const filteredTransactions = transactions.filter(t => {
    if (!startDate && !endDate) return true;
    
    const transDate = new Date(t.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    if (start && transDate < start) return false;
    if (end && transDate > end) return false;
    return true;
  });

  // Calcola statistiche generali
  const calculateStats = () => {
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    const totalExpenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

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
    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    const categoryMap = {};
    const transactionsByCategory = {};

    expenses.forEach(t => {
      const category = t.category || 'Senza categoria';
      
      if (!categoryMap[category]) {
        categoryMap[category] = {
          total: 0,
          count: 0,
          transactions: []
        };
      }
      
      categoryMap[category].total += parseFloat(t.amount || 0);
      categoryMap[category].count += 1;
      categoryMap[category].transactions.push(t);
    });

    return categoryMap;
  };

  const expensesByCategory = calculateExpensesByCategory();
  const totalExpensesAll = Object.values(expensesByCategory).reduce((sum, cat) => sum + cat.total, 0);

  // Calcola totale per conto
  const calculateAccountTotals = () => {
    return accounts.map(account => {
      const accountTransactions = filteredTransactions.filter(t => t.accountId === account.id);
      const income = accountTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      const expenses = accountTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      const net = income - expenses;

      return {
        ...account,
        income,
        expenses,
        net
      };
    });
  };

  const accountTotals = calculateAccountTotals();

  // Formatta data
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Funzione export CSV
  const exportToCSV = () => {
    const headers = ['Data', 'Descrizione', 'Categoria', 'Tipo', 'Importo', 'Conto'];
    const csvData = filteredTransactions.map(t => [
      t.date,
      `"${t.description || ''}"`,
      t.category || '',
      t.type === 'income' ? 'Entrata' : 'Uscita',
      t.amount,
      accounts.find(a => a.id === t.accountId)?.name || ''
    ]);

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
  const sortedCategories = Object.entries(expensesByCategory)
    .sort(([, a], [, b]) => b.total - a.total);

  // Toggle espansione categoria
  const toggleCategory = (category) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

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
            className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            🏷️ Categorie
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

      {/* Tab Categorie */}
      {activeTab === 'categories' && (
        <div className="categories-section">
          <h3>Distribuzione Spese per Categoria</h3>
          
          <h4>Top Categorie</h4>
          <div className="category-list">
            {sortedCategories.map(([categoryName, categoryData]) => {
              const percentage = totalExpensesAll > 0 
                ? (categoryData.total / totalExpensesAll * 100).toFixed(1)
                : '0.0';
              
              return (
                <React.Fragment key={categoryName}>
                  <div 
                    className="category-item" 
                    onClick={() => toggleCategory(categoryName)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="category-info">
                      <div className="category-name">{categoryName}</div>
                      <div className="category-percentage">{percentage}%</div>
                      <div className="category-amount negative">€{categoryData.total.toFixed(2)}</div>
                    </div>
                    <div style={{ 
                      padding: '6px 12px', 
                      background: '#4a90e2', 
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}>
                      {expandedCategory === categoryName ? '▼' : '▶'} Dettagli
                    </div>
                  </div>
                  
                  {/* Dettaglio transazioni per categoria */}
                  {expandedCategory === categoryName && (
                    <div style={{ 
                      padding: '20px', 
                      background: '#f8fafc', 
                      margin: '10px 0',
                      borderRadius: '8px',
                      borderLeft: '4px solid #4a90e2'
                    }}>
                      <table className="expenses-table" style={{ marginTop: 0 }}>
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Descrizione</th>
                            <th>Importo</th>
                            <th>Conto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categoryData.transactions.map(trans => (
                            <tr key={trans.id}>
                              <td>{formatDate(trans.date)}</td>
                              <td>{trans.description || 'Nessuna descrizione'}</td>
                              <td className="negative">-€{parseFloat(trans.amount || 0).toFixed(2)}</td>
                              <td>
                                {accounts.find(a => a.id === trans.accountId)?.name || 'Sconosciuto'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan="2"><strong>Totale {categoryName}:</strong></td>
                            <td colSpan="2" className="negative">
                              <strong>€{categoryData.total.toFixed(2)}</strong> ({categoryData.count} transazioni)
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
              {filteredTransactions.map(trans => (
                <tr key={trans.id}>
                  <td>{formatDate(trans.date)}</td>
                  <td>{trans.description || '-'}</td>
                  <td>{trans.category || '-'}</td>
                  <td>
                    <span className={`type-badge ${trans.type}`}>
                      {trans.type === 'income' ? 'Entrata' : 'Uscita'}
                    </span>
                  </td>
                  <td className={trans.type === 'income' ? 'positive' : 'negative'}>
                    {trans.type === 'income' ? '+' : '-'}€{parseFloat(trans.amount).toFixed(2)}
                  </td>
                  <td>
                    {accounts.find(a => a.id === trans.accountId)?.name || '-'}
                  </td>
                </tr>
              ))}
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