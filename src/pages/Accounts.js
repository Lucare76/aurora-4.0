// src/pages/Accounts.js
import React, { useState } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import { useAuth } from '../contexts/AuthContext';
<<<<<<< HEAD
import { getCurrencySymbol } from '../utils/currency';
=======
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
import CreateFirstAccount from '../components/CreateFirstAccount';
import './Accounts.css';

const Accounts = () => {
  const { accounts, deleteAccount, updateAccount, createAccount } = useFinancial();
<<<<<<< HEAD
  const { user, userSettings } = useAuth();
  const currencyCode = userSettings?.currency || 'EUR';
  const cs = getCurrencySymbol(currencyCode);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  // ✅ balance come STRINGA per non mostrare "0" fisso nel campo
  const [newAccount, setNewAccount] = useState({
    name: '',
    type: 'bank',
    balance: '',
=======
  const { user } = useAuth();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [newAccount, setNewAccount] = useState({
    name: '',
    type: 'bank',
    balance: 0,
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
    color: '#4f46e5'
  });

  // Tipologie di conti (in italiano)
  const accountTypes = {
    bank: { label: 'Conto Bancario', icon: '🏦', color: '#4f46e5' },
    savings: { label: 'Risparmi', icon: '💰', color: '#065f46' },
    cash: { label: 'Contanti', icon: '💵', color: '#92400e' },
    credit: { label: 'Carta di Credito', icon: '💳', color: '#7f1d1d' },
    investment: { label: 'Investimenti', icon: '📈', color: '#3730a3' },
<<<<<<< HEAD
    crypto: { label: 'Criptovalute', icon: '₿', color: '#f59e0b' },
    pension: { label: 'Fondo Pensione', icon: '🏛️', color: '#0f766e' },
    bets: { label: 'Scommesse', icon: '🎰', color: '#b91c1c' }
=======
    bets: { label: 'Scommesse', icon: '🎰', color: '#b91c1c' }  
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
  };

  // Palette colori rapida per il pannello di modifica
  const accountColors = [
<<<<<<< HEAD
    '#4f46e5', '#065f46', '#92400e', '#7f1d1d', '#3730a3',
    '#0f766e', '#2563eb', '#16a34a', '#ea580c', '#e11d48'
=======
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
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
  ];

  const handleDelete = async (accountId, accountName) => {
    const conferma = window.confirm(
<<<<<<< HEAD
      `Vuoi davvero eliminare il conto "${accountName}"?\nTutte le transazioni associate verranno rimosse.`
=======
      `Vuoi davvero eliminare il conto "${accountName}"?\n` +
      `Tutte le transazioni associate verranno rimosse.`
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
    );
    if (!conferma) return;

    try {
      await deleteAccount(accountId);
      if (editingAccount && editingAccount.id === accountId) {
        setEditingAccount(null);
      }
    } catch (error) {
      alert(`Errore durante l'eliminazione del conto: ${error.message}`);
    }
  };

  const startEdit = (account) => {
    const typeInfo = accountTypes[account.type] || accountTypes.bank;
<<<<<<< HEAD
=======

>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
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
<<<<<<< HEAD
=======

>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
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
<<<<<<< HEAD
=======

>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
    if (!user) {
      alert('Devi effettuare il login per creare un conto');
      return;
    }
<<<<<<< HEAD
=======

>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
    if (!newAccount.name.trim()) {
      alert('Inserisci un nome per il conto');
      return;
    }

<<<<<<< HEAD
    const balanceValue = parseFloat(newAccount.balance);
    const safeBalance = Number.isFinite(balanceValue) ? balanceValue : 0;

    try {
      await createAccount({
        name: newAccount.name.trim(),
        type: newAccount.type,
        balance: safeBalance,
        color: newAccount.color || accountTypes[newAccount.type]?.color || '#4f46e5'
=======
    try {
      await createAccount({
        ...newAccount,
        name: newAccount.name.trim(),
        color: accountTypes[newAccount.type]?.color || '#4f46e5'
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
      });

      setNewAccount({
        name: '',
        type: 'bank',
<<<<<<< HEAD
        balance: '',
=======
        balance: 0,
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
        color: '#4f46e5'
      });
      setShowAddForm(false);
    } catch (error) {
      alert(`Errore nella creazione del conto: ${error.message}`);
    }
  };

<<<<<<< HEAD
  const formatCurrency = (amount) => {
    const num = Math.abs(Number(amount) || 0);
    const fixed = num.toFixed(2);
    const [intPart, decPart] = fixed.split('.');
    const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const formatted = `${cs} ${withSep},${decPart}`;
=======
  // 🔢 Formattazione valuta
  const formatCurrency = (amount) => {
    const absAmount = Math.abs(amount);
    const formatted = new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(absAmount);
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
    return amount < 0 ? `−${formatted}` : formatted;
  };

  const isHighValue = (amount) => Math.abs(amount) > 5000;

  const getBalanceClass = (amount) => {
    const baseClass = amount < 0 ? 'balance-amount negative' : 'balance-amount';
    return isHighValue(amount) ? `${baseClass} high-value` : baseClass;
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
<<<<<<< HEAD
      {/* 🚀 HEADER BAR MIGLIORATA */}
      <div className="accounts-header-container">
        <div className="header-left">
          <h1 className="dashboard-title">Conti</h1>
          <p className="dashboard-subtitle">Gestisci tutti i tuoi conti finanziari ({totalAccounts} totali)</p>
        </div>
        <div className="header-right-actions">
          <div className="total-balance-pill">
            <span className="pill-label">SALDO TOTALE</span>
            <span className={`pill-amount ${isHighValue(totalBalance) ? 'high-value-text' : ''}`}>
=======
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
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
              {formatCurrency(totalBalance)}
            </span>
          </div>
          <button
<<<<<<< HEAD
            className="add-account-btn-new"
=======
            className="add-account-btn"
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
            onClick={() => {
              setEditingAccount(null);
              setShowAddForm(true);
            }}
<<<<<<< HEAD
            type="button"
          >
            <span className="btn-plus-icon">+</span>
            <span className="btn-text-label">Nuovo Conto</span>
=======
          >
            <span className="btn-plus">+</span>
            Nuovo Conto
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
          </button>
        </div>
      </div>

<<<<<<< HEAD
      <CreateFirstAccount />

      {/* 📱 GRIGLIA CONTI OTTIMIZZATA */}
      <div className="accounts-grid">
        {accounts.map((account) => {
          const typeInfo = accountTypes[account.type] || accountTypes.bank;
          return (
            <div key={account.id} className="account-card-modern" onClick={() => startEdit(account)}>
              <div className="card-top-row">
                <div className="account-icon-box" style={{ backgroundColor: account.color || typeInfo.color }}>
                  {typeInfo.icon}
                </div>
                <div className="account-main-details">
                  <h3 className="account-name-text">{account.name}</h3>
                  <span className="account-type-tag">{typeInfo.label}</span>
                </div>
                <button className="card-dots-btn" onClick={(e) => { e.stopPropagation(); startEdit(account); }}>⋮</button>
              </div>

              <div className="card-bottom-row">
                <span className="mini-label-text">Saldo Attuale</span>
                <div className={getBalanceClass(account.balance)}>{formatCurrency(account.balance)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* STATO VUOTO */}
      {accounts.length === 0 && !showAddForm && (
        <div className="empty-state">
          <div className="empty-illustration">
            <div className="empty-icon">💼</div>
            <h3>Nessun Conto</h3>
            <p>Crea il tuo primo conto per iniziare a gestire le finanze</p>
            <button className="empty-action-btn" onClick={() => setShowAddForm(true)}>Crea Conto</button>
          </div>
        </div>
      )}

      {/* MODALE CREAZIONE (NC) */}
      {showAddForm && (
        <div className="nc-overlay" onClick={() => setShowAddForm(false)}>
          <div className="nc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="nc-header">
              <h3>Nuovo Conto</h3>
              <button className="nc-close" onClick={() => setShowAddForm(false)}>×</button>
            </div>
            <form onSubmit={handleCreateAccount}>
              <div className="nc-field">
                <label className="nc-label">Nome conto</label>
                <input type="text" className="nc-input" value={newAccount.name} onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })} placeholder="es. Conto principale" required autoFocus />
              </div>
              <div className="nc-field">
                <label className="nc-label">Tipo di conto</label>
                <div className="nc-type-grid">
                  {Object.entries(accountTypes).map(([key, { label, icon, color }]) => (
                    <button key={key} type="button" className={`nc-type-card ${newAccount.type === key ? 'active' : ''}`} style={newAccount.type === key ? { borderColor: color, boxShadow: `0 0 12px -3px ${color}` } : {}} onClick={() => setNewAccount({ ...newAccount, type: key, color: color })}>
                      <span className="nc-type-icon">{icon}</span>
                      <span className="nc-type-name">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="nc-field">
                <label className="nc-label">Colore</label>
                <div className="nc-colors">
                  {accountColors.map((c) => (
                    <button key={c} type="button" className={`nc-color-dot ${newAccount.color === c ? 'active' : ''}`} style={{ backgroundColor: c }} onClick={() => setNewAccount((prev) => ({ ...prev, color: c }))} />
                  ))}
                </div>
              </div>
              <div className="nc-separator" />
              <div className="nc-field">
                <label className="nc-label">Saldo iniziale</label>
                <div className="nc-balance-wrap">
                  <span className="nc-euro">{cs}</span>
                  <input type="number" className="nc-input nc-input-balance" step="0.01" value={newAccount.balance} onChange={(e) => setNewAccount({ ...newAccount, balance: e.target.value })} placeholder="0,00" />
                </div>
              </div>
              <div className="nc-actions">
                <button type="button" className="nc-btn-cancel" onClick={() => setShowAddForm(false)}>Annulla</button>
                <button type="submit" className="nc-btn-create">+ Crea Conto</button>
=======
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
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
              </div>
            </form>
          </div>
        </div>
      )}

<<<<<<< HEAD
      {/* PANNELLO MODIFICA (EDIT) */}
      {editingAccount && <div className="edit-panel-backdrop" onClick={() => setEditingAccount(null)} />}
=======
      {/* Pannello laterale per MODIFICA / ELIMINA conto */}
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
      {editingAccount && (
        <div className="edit-panel">
          <div className="panel-header">
            <h3>Modifica Conto</h3>
<<<<<<< HEAD
            <button className="close-panel" onClick={() => setEditingAccount(null)}>×</button>
=======
            <button className="close-panel" onClick={() => setEditingAccount(null)}>
              ×
            </button>
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
          </div>
          <form onSubmit={handleEditSubmit}>
            <div className="panel-form">
              <div className="form-field">
                <label>Nome Conto</label>
<<<<<<< HEAD
                <input type="text" value={editingAccount.name} onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })} required />
              </div>
              <div className="form-field">
                <label>Tipo di Conto</label>
                <select value={editingAccount.type} onChange={(e) => {
                  const newType = e.target.value;
                  setEditingAccount((prev) => ({ ...prev, type: newType, color: prev.color || accountTypes[newType]?.color || '#4f46e5' }));
                }}>
                  {Object.entries(accountTypes).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Saldo</label>
                <input type="number" step="0.01" value={editingAccount.balance} onChange={(e) => setEditingAccount({ ...editingAccount, balance: e.target.value })} />
              </div>
=======
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

>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
              <div className="form-field">
                <label>Colore</label>
                <div className="color-selector">
                  {accountColors.map((color) => (
<<<<<<< HEAD
                    <button key={color} type="button" className={`color-option ${editingAccount.color === color ? 'selected' : ''}`} style={{ backgroundColor: color }} onClick={() => setEditingAccount((prev) => ({ ...prev, color }))} />
                  ))}
                </div>
              </div>
              <div className="panel-actions">
                <button type="submit" className="save-btn">Salva Modifiche</button>
                <button type="button" className="delete-btn" onClick={() => handleDelete(editingAccount.id, editingAccount.name)}>Elimina Conto</button>
=======
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
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
              </div>
            </div>
          </form>
        </div>
      )}
<<<<<<< HEAD
=======

      {/* Griglia dei conti */}
      <div className="accounts-grid">
        {accounts.map((account) => {
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
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
    </div>
  );
};

export default Accounts;