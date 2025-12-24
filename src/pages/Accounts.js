// src/pages/Accounts.js
import React, { useState } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import { useAuth } from '../contexts/AuthContext';
import CreateFirstAccount from '../components/CreateFirstAccount';
import './Accounts.css';

const Accounts = () => {
  const { accounts, deleteAccount, updateAccount, createAccount, transactions } = useFinancial();
  const { user } = useAuth();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [newAccount, setNewAccount] = useState({
    name: '',
    type: 'bank',
    balance: 0,
    color: '#4f46e5'
  });

  // Tipologie di conti (in italiano)
  const accountTypes = {
    bank: { label: 'Conto Bancario', icon: '🏦', color: '#4f46e5' },
    savings: { label: 'Risparmi', icon: '💰', color: '#065f46' },
    cash: { label: 'Contanti', icon: '💵', color: '#92400e' },
    credit: { label: 'Carta di Credito', icon: '💳', color: '#7f1d1d' },
    investment: { label: 'Investimenti', icon: '📈', color: '#3730a3' }
  };

  // Palette colori rapida per il pannello di modifica
  const accountColors = [
    '#4f46e5',
    '#065f46',
    '#92400e',
    '#7f1d1d',
    '#3730a3',
    '#0f766e',
    '#2563eb',
    '#16a34a',
    '#ea580c',
    '#e11d48'
  ];

  const getAccountStats = (accountId) => {
    const accountTransactions = transactions.filter(tx => tx.accountId === accountId);
    const lastTransaction = accountTransactions[accountTransactions.length - 1];

    return {
      transactions: accountTransactions.length,
      lastDate: lastTransaction ? new Date(lastTransaction.date) : null
    };
  };

  const handleDelete = async (accountId, accountName) => {
    const conferma = window.confirm(
      `Vuoi davvero eliminare il conto "${accountName}"?\n` +
      `Tutte le transazioni associate verranno rimosse.`
    );
    if (!conferma) return;

    try {
      await deleteAccount(accountId);
      // se stavi modificando questo conto, chiudi il pannello
      if (editingAccount && editingAccount.id === accountId) {
        setEditingAccount(null);
      }
    } catch (error) {
      alert(`Errore durante l'eliminazione del conto: ${error.message}`);
    }
  };

  const startEdit = (account) => {
    const typeInfo = accountTypes[account.type] || accountTypes.bank;

    setEditingAccount({
      id: account.id,
      name: account.name,
      type: account.type,
      balance: account.balance,
      color: account.color || typeInfo.color || '#4f46e5'
    });
    setShowAddForm(false);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingAccount.name.trim()) {
      alert('Inserisci un nome per il conto');
      return;
    }

    try {
      await updateAccount(editingAccount.id, {
        name: editingAccount.name.trim(),
        type: editingAccount.type,
        balance: parseFloat(editingAccount.balance) || 0,
        color: editingAccount.color
      });
      setEditingAccount(null);
    } catch (error) {
      alert(`Errore durante l'aggiornamento del conto: ${error.message}`);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();

    if (!user) {
      alert('Devi effettuare il login per creare un conto');
      return;
    }

    if (!newAccount.name.trim()) {
      alert('Inserisci un nome per il conto');
      return;
    }

    try {
      await createAccount({
        ...newAccount,
        name: newAccount.name.trim(),
        color: accountTypes[newAccount.type]?.color || '#4f46e5'
      });

      setNewAccount({
        name: '',
        type: 'bank',
        balance: 0,
        color: '#4f46e5'
      });
      setShowAddForm(false);
    } catch (error) {
      alert(`Errore nella creazione del conto: ${error.message}`);
    }
  };

  // 🔢 Formattazione valuta
  const formatCurrency = (amount) => {
    const absAmount = Math.abs(amount);
    const formatted = new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(absAmount);
    return amount < 0 ? `−${formatted}` : formatted;
  };

  const isHighValue = (amount) => Math.abs(amount) > 5000;

  const getBalanceClass = (amount) => {
    const baseClass = amount < 0 ? 'balance-amount negative' : 'balance-amount';
    return isHighValue(amount) ? `${baseClass} high-value` : baseClass;
  };

  // 🗓️ Formatta la data dell’ultima attività
  const formatDate = (date) => {
    if (!date) return 'Nessuna attività';
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Oggi';
    if (diffDays === 1) return 'Ieri';
    if (diffDays < 7) return `${diffDays} giorni fa`;

    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const totalAccounts = accounts.length;

  if (!user) {
    return (
      <div className="accounts-auth-message">
        <div className="auth-card">
          <div className="auth-icon">🔐</div>
          <h2>Accesso Richiesto</h2>
          <p>Accedi per gestire i tuoi conti</p>
        </div>
      </div>
    );
  }

  return (
    <div className="accounts-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1 className="dashboard-title">Conti</h1>
          <p className="dashboard-subtitle">
            Gestisci tutti i tuoi conti finanziari ({totalAccounts} totali)
          </p>
        </div>
        <div className="header-right">
          <div className="balance-summary">
            <span className="balance-label">Saldo Totale</span>
            <span className={`balance-amount ${isHighValue(totalBalance) ? 'high-value' : ''}`}>
              {formatCurrency(totalBalance)}
            </span>
          </div>
          <button
            className="add-account-btn"
            onClick={() => {
              setEditingAccount(null);
              setShowAddForm(true);
            }}
          >
            <span className="btn-plus">+</span>
            Nuovo Conto
          </button>
        </div>
      </div>

      {/* Componente che suggerisce di creare il primo conto */}
      <CreateFirstAccount />

      {/* Modal creazione nuovo conto */}
      {showAddForm && (
        <div className="form-overlay">
          <div className="form-modal">
            <div className="form-header">
              <h3>Nuovo Conto</h3>
              <button className="close-form" onClick={() => setShowAddForm(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleCreateAccount}>
              <div className="form-row">
                <input
                  type="text"
                  className="form-input"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                  placeholder="Nome del conto"
                  required
                  autoFocus
                />
              </div>

              <div className="form-row">
                <select
                  className="form-select"
                  value={newAccount.type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setNewAccount({
                      ...newAccount,
                      type: newType,
                      color: accountTypes[newType]?.color || '#4f46e5'
                    });
                  }}
                >
                  {Object.entries(accountTypes).map(([key, { label, icon }]) => (
                    <option key={key} value={key}>
                      {icon} {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <input
                  type="number"
                  className="form-input"
                  step="0.01"
                  value={newAccount.balance}
                  onChange={(e) =>
                    setNewAccount({
                      ...newAccount,
                      balance: parseFloat(e.target.value) || 0
                    })
                  }
                  placeholder="Saldo iniziale"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowAddForm(false)}
                >
                  Annulla
                </button>
                <button type="submit" className="submit-btn">
                  Crea Conto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pannello laterale per MODIFICA / ELIMINA conto */}
      {editingAccount && (
        <div className="edit-panel">
          <div className="panel-header">
            <h3>Modifica Conto</h3>
            <button className="close-panel" onClick={() => setEditingAccount(null)}>
              ×
            </button>
          </div>
          <form onSubmit={handleEditSubmit}>
            <div className="panel-form">
              <div className="form-field">
                <label>Nome Conto</label>
                <input
                  type="text"
                  value={editingAccount.name}
                  onChange={(e) =>
                    setEditingAccount({ ...editingAccount, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-field">
                <label>Tipo di Conto</label>
                <select
                  value={editingAccount.type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setEditingAccount((prev) => ({
                      ...prev,
                      type: newType,
                      color:
                        prev.color ||
                        accountTypes[newType]?.color ||
                        '#4f46e5'
                    }));
                  }}
                >
                  {Object.entries(accountTypes).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Saldo</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingAccount.balance}
                  onChange={(e) =>
                    setEditingAccount({
                      ...editingAccount,
                      balance: e.target.value
                    })
                  }
                />
              </div>

              <div className="form-field">
                <label>Colore</label>
                <div className="color-selector">
                  {accountColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`color-option ${
                        editingAccount.color === color ? 'selected' : ''
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() =>
                        setEditingAccount((prev) => ({
                          ...prev,
                          color
                        }))
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="panel-actions">
                <button type="submit" className="save-btn">
                  Salva Modifiche
                </button>
                <button
                  type="button"
                  className="delete-btn"
                  onClick={() => handleDelete(editingAccount.id, editingAccount.name)}
                >
                  Elimina Conto
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Griglia dei conti */}
      <div className="accounts-grid">
        {accounts.map((account) => {
          const stats = getAccountStats(account.id);
          const typeInfo = accountTypes[account.type] || accountTypes.bank;

          return (
            <div
              key={account.id}
              className="account-card"
              onClick={() => startEdit(account)}
            >
              <div className="account-header">
                <div
                  className="account-icon"
                  style={{
                    backgroundColor: account.color || typeInfo.color,
                    color: 'white'
                  }}
                >
                  {typeInfo.icon}
                </div>
                <div className="account-info">
                  <h3 className="account-name">{account.name}</h3>
                  <span className="account-type">{typeInfo.label}</span>
                </div>
                <div className="account-actions">
                  <button
                    className="action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(account);
                    }}
                  >
                    ⋮
                  </button>
                </div>
              </div>

              <div className="account-balance">
                <span className="balance-label">Saldo Attuale</span>
                <div className={getBalanceClass(account.balance)}>
                  {formatCurrency(account.balance)}
                </div>
              </div>

              <div className="account-footer">
                <div className="account-stat">
                  <span className="stat-label">Transazioni</span>
                  <span className="stat-value">{stats.transactions}</span>
                </div>
                <div className="account-stat">
                  <span className="stat-label">Ultima Attività</span>
                  <span className="stat-value">{formatDate(stats.lastDate)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stato vuoto */}
      {accounts.length === 0 && !showAddForm && (
        <div className="empty-state">
          <div className="empty-illustration">
            <div className="empty-icon">💼</div>
            <h3>Nessun Conto</h3>
            <p>Crea il tuo primo conto per iniziare a gestire le finanze</p>
            <button
              className="empty-action-btn"
              onClick={() => {
                setEditingAccount(null);
                setShowAddForm(true);
              }}
            >
              Crea Conto
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;
