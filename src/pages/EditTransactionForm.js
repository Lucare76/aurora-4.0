// src/pages/EditTransactionForm.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/currency';
import './Transactions.css';
import './AddTransactionForm.css';

const MAX_DESCRIPTION_LENGTH = 240;

/* Formattazione importo italiano: 1.000,50 */
function formatInputAmount(value) {
  let clean = value.replace(/[^\d.,]/g, '');
  clean = clean.replace(/\./g, ',');
  const parts = clean.split(',');
  if (parts.length > 2) {
    clean = parts.slice(0, -1).join('') + ',' + parts[parts.length - 1];
  }
  const [intPart, decPart] = clean.split(',');
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (decPart !== undefined) {
    return intFormatted + ',' + decPart.slice(0, 2);
  }
  return intFormatted;
}

function parseAmountFromInput(value) {
  if (!value) return 0;
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

/* Data/ora locale per input datetime-local */
function getLocalDateTimeForInput(dateObj = new Date()) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  const h = String(dateObj.getHours()).padStart(2, '0');
  const min = String(dateObj.getMinutes()).padStart(2, '0');
  const sec = String(dateObj.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}:${sec}`;
}

function parseLocalDateFromInput(value) {
  if (!value) return null;

  if (value.includes('T')) {
    const [datePart, timePart] = value.split('T');
    const [y, m, d] = datePart.split('-').map(Number);
    const [hRaw, minRaw, secRaw = '0'] = timePart.split(':');
    const h = Number(hRaw);
    const min = Number(minRaw);
    const sec = Number(secRaw);
    if (![y, m, d, h, min, sec].every(Number.isInteger)) return null;
    if (m < 1 || m > 12 || d < 1 || d > 31 || h < 0 || h > 23 || min < 0 || min > 59 || sec < 0 || sec > 59) return null;
    const parsed = new Date(y, m - 1, d, h, min, sec, 0);
    if (
      parsed.getFullYear() !== y ||
      parsed.getMonth() !== m - 1 ||
      parsed.getDate() !== d ||
      parsed.getHours() !== h ||
      parsed.getMinutes() !== min ||
      parsed.getSeconds() !== sec
    ) {
      return null;
    }
    return parsed;
  }

  const [y, m, d] = value.split('-').map(Number);
  if (![y, m, d].every(Number.isInteger)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const now = new Date();
  const parsed = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), 0, 0);
  if (parsed.getFullYear() !== y || parsed.getMonth() !== m - 1 || parsed.getDate() !== d) return null;
  return parsed;
}

function pickDifferentAccountId(accounts, excludeId) {
  const other = (accounts || []).find((a) => a.id !== excludeId);
  return other?.id || '';
}

const makeFormSnapshot = (data = {}) =>
  JSON.stringify({
    description: String(data.description || ''),
    amount: String(data.amount || ''),
    type: String(data.type || ''),
    category: String(data.category || ''),
    subCategory: String(data.subCategory || ''),
    accountId: String(data.accountId || ''),
    fromAccountId: String(data.fromAccountId || ''),
    toAccountId: String(data.toAccountId || ''),
    date: String(data.date || '')
  });

const EditTransactionForm = ({ transaction, onClose }) => {
  const { accounts = [], categories = [], updateTransaction } = useFinancial();
  const { userSettings } = useAuth();

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense', // income | expense | transfer
    category: '',
    subCategory: '',
    accountId: '',
    fromAccountId: '',
    toAccountId: '',
    date: getLocalDateTimeForInput()
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [canRetry, setCanRetry] = useState(false);
  const [lastSubmitPayload, setLastSubmitPayload] = useState(null);
  const [initialSnapshot, setInitialSnapshot] = useState('');

  const isTransfer = useMemo(() => !!(transaction?.isTransfer || transaction?.type === 'transfer' || transaction?.transferId), [transaction]);

  useEffect(() => {
    if (!transaction) return;

    // date
    let dt = new Date();
    if (transaction.date) {
      if (typeof transaction.date?.toDate === 'function') dt = transaction.date.toDate();
      else {
        const parsed = new Date(transaction.date);
        if (!Number.isNaN(parsed.getTime())) dt = parsed;
      }
    }

    // tipo
    const baseType = isTransfer ? 'transfer' : (transaction.type || (Number(transaction.amount) >= 0 ? 'income' : 'expense'));

    // category/subcategory (usa ID se presenti)
    const categoryId = transaction.categoryId || transaction.category || '';
    const subId = transaction.subCategoryId || transaction.subCategory || transaction.subcategory || '';

    // conti giroconto
    let fromAccountId = transaction.fromAccountId || '';
    let toAccountId = transaction.toAccountId || '';

    // se mi arriva una gamba o un oggetto “collassato”, normalizzo
    if (isTransfer) {
      // se non ho from/to, provo a dedurre da campi standard
      if (!fromAccountId || !toAccountId) {
        const amt = Number(transaction.amount) || 0;

        if (transaction.accountId && transaction.transferPeerAccountId) {
          // se questa è la gamba uscita (amt < 0), accountId=from, peer=to
          // se è la gamba entrata (amt > 0), accountId=to, peer=from
          if (amt < 0) {
            fromAccountId = transaction.accountId;
            toAccountId = transaction.transferPeerAccountId;
          } else if (amt > 0) {
            toAccountId = transaction.accountId;
            fromAccountId = transaction.transferPeerAccountId;
          }
        } else {
          // fallback: usa accountId come from e scegline un altro come to
          fromAccountId = transaction.accountId || accounts?.[0]?.id || '';
          toAccountId = pickDifferentAccountId(accounts, fromAccountId);
        }
      }

      if (fromAccountId && toAccountId && fromAccountId === toAccountId) {
        toAccountId = pickDifferentAccountId(accounts, fromAccountId);
      }
    }

    const nextState = {
      description: transaction.description || '',
      amount: formatInputAmount(String(Math.abs(Number(transaction.amount) || 0))),
      type: baseType,
      category: baseType === 'transfer' ? '' : categoryId,
      subCategory: baseType === 'transfer' ? '' : subId,
      accountId: transaction.accountId || accounts?.[0]?.id || '',
      fromAccountId: fromAccountId || accounts?.[0]?.id || '',
      toAccountId: toAccountId || pickDifferentAccountId(accounts, fromAccountId || accounts?.[0]?.id || ''),
      date: getLocalDateTimeForInput(dt)
    };
    setFormData(nextState);
    setInitialSnapshot(makeFormSnapshot(nextState));
    setError('');
    setInfoMessage('');
    setCanRetry(false);
    setLastSubmitPayload(null);
  }, [transaction, accounts, isTransfer]);

  const isDirty = useMemo(
    () => !!initialSnapshot && makeFormSnapshot(formData) !== initialSnapshot,
    [formData, initialSnapshot]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'amount') {
      setFormData((prev) => ({ ...prev, amount: formatInputAmount(value) }));
      return;
    }

    if (name === 'category') {
      setFormData((prev) => ({ ...prev, category: value, subCategory: '' }));
      return;
    }

    if (name === 'fromAccountId') {
      setFormData((prev) => {
        const nextFrom = value;
        const nextTo = prev.toAccountId === nextFrom ? pickDifferentAccountId(accounts, nextFrom) : prev.toAccountId;
        return { ...prev, fromAccountId: nextFrom, toAccountId: nextTo };
      });
      return;
    }

    if (name === 'description') {
      setFormData((prev) => ({ ...prev, description: String(value || '').toLocaleUpperCase('it-IT') }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (type) => {
    setFormData((prev) => {
      if (type === 'transfer') {
        const from = prev.accountId || accounts?.[0]?.id || '';
        const to = pickDifferentAccountId(accounts, from);
        return { ...prev, type, category: '', subCategory: '', fromAccountId: from, toAccountId: to };
      }
      return { ...prev, type, category: '', subCategory: '' };
    });
  };

  const filteredCategories = useMemo(() => {
    if (formData.type !== 'income' && formData.type !== 'expense') return [];
    return (categories || []).filter((c) => !c?.type || c.type === formData.type);
  }, [categories, formData.type]);

  const selectedCategory = useMemo(() => categories.find((cat) => cat.id === formData.category), [categories, formData.category]);
  const subCategories = selectedCategory?.subCategories || [];

  const selectedAccount = accounts.find((acc) => acc.id === formData.accountId);
  const fromAccount = accounts.find((acc) => acc.id === formData.fromAccountId);
  const toAccount = accounts.find((acc) => acc.id === formData.toAccountId);

  const getCategoryIcon = (categoryId) => {
    if (!categoryId) return { icon: '💰', color: '#6b7280' };
    const category = categories.find((cat) => cat.id === categoryId);
    return { icon: category?.icon || '💰', color: category?.color || '#6b7280' };
  };

  const categoryInfo = getCategoryIcon(formData.category);
  const expectedUpdatedAtMs = useMemo(() => {
    const ts = transaction?.updatedAt || transaction?.createdAt || null;
    if (!ts) return null;
    if (typeof ts?.toDate === 'function') return ts.toDate().getTime();
    if (ts instanceof Date) return ts.getTime();
    const n = Number(ts);
    if (Number.isFinite(n)) return n;
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }, [transaction]);

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const isRetryableUpdateError = (err) => {
    const code = String(err?.code || '').toLowerCase();
    const msg = String(err?.message || '').toLowerCase();
    return (
      code.includes('unavailable') ||
      code.includes('deadline-exceeded') ||
      code.includes('aborted') ||
      code.includes('resource-exhausted') ||
      msg.includes('network') ||
      msg.includes('offline') ||
      msg.includes('failed to fetch')
    );
  };
  const runWithRetry = async (fn, retries = 2) => {
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (!isRetryableUpdateError(err) || attempt === retries) break;
        await wait(350 * (attempt + 1));
      }
    }
    throw lastError;
  };

  const isNetworkError = useCallback(
    (err) => {
      const code = String(err?.code || '').toLowerCase();
      const msg = String(err?.message || '').toLowerCase();
      return (
        isRetryableUpdateError(err) ||
        code.includes('unavailable') ||
        code.includes('deadline-exceeded') ||
        msg.includes('network') ||
        msg.includes('offline') ||
        msg.includes('failed to fetch')
      );
    },
    []
  );

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!isDirty || loading) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty, loading]);

  const attemptClose = useCallback(() => {
    if (loading) return;
    if (isDirty) {
      const ok = window.confirm('Hai modifiche non salvate. Vuoi uscire senza salvare?');
      if (!ok) return;
    }
    onClose?.();
  }, [isDirty, loading, onClose]);

  const submitUpdate = useCallback(
    async (submitConfig, options = { fromRetry: false }) => {
      if (!submitConfig) return;
      const { mode, payload } = submitConfig;
      if (!options.fromRetry) {
        setLastSubmitPayload(submitConfig);
      }
      await runWithRetry(() => updateTransaction(transaction.id, payload));
      setCanRetry(false);
      setLastSubmitPayload(null);
      setInitialSnapshot(makeFormSnapshot(formData));
      onClose?.();
    },
    [formData, onClose, runWithRetry, transaction?.id, updateTransaction]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setError('Sei offline. Riconnettiti e riprova.');
      setCanRetry(true);
      return;
    }

    const amountNum = parseAmountFromInput(formData.amount);
    if (!amountNum || amountNum <= 0) {
      setError('Inserisci un importo valido');
      return;
    }

    const transactionDate = parseLocalDateFromInput(formData.date);
    if (!transactionDate) {
      setError('Data non valida');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setInfoMessage('Salvataggio in corso...');
      setCanRetry(false);

      // ✅ GIROCONTO
      if (formData.type === 'transfer' || isTransfer) {
        if (!accounts || accounts.length < 2) {
          setError('Per un giroconto servono almeno 2 conti');
          return;
        }
        if (!formData.fromAccountId || !formData.toAccountId) {
          setError('Seleziona conto origine e destinazione');
          return;
        }
        if (formData.fromAccountId === formData.toAccountId) {
          setError('I conti devono essere diversi');
          return;
        }

        const payload = {
          type: 'transfer',
          description: formData.description.slice(0, MAX_DESCRIPTION_LENGTH).toLocaleUpperCase('it-IT').trim() || '',
          amount: Math.abs(amountNum),
          fromAccountId: formData.fromAccountId,
          toAccountId: formData.toAccountId,
          date: transactionDate,
          timestamp: transactionDate.getTime(),
          expectedUpdatedAtMs
        };
        await submitUpdate({ mode: 'transfer', payload });
        return;
      }

      // ✅ NORMALE
      if (!formData.accountId) {
        setError('Seleziona un conto');
        return;
      }

      const payload = {
        description: formData.description.slice(0, MAX_DESCRIPTION_LENGTH).toLocaleUpperCase('it-IT').trim() || '',
        amount: formData.type === 'income' ? amountNum : -amountNum,
        type: formData.type,
        category: formData.category || null,
        subCategory: formData.subCategory || null,
        accountId: formData.accountId,
        date: transactionDate,
        timestamp: transactionDate.getTime(),
        expectedUpdatedAtMs
      };
      await submitUpdate({ mode: 'single', payload });
    } catch (err) {
      console.error("Errore durante l'aggiornamento:", err);
      const raw = String(err?.message || '');
      if (raw.includes('aggiornata da un altro')) {
        setError('Questa transazione e\' stata modificata da un\'altra sessione. Chiudi e riapri per ricaricare i dati.');
      } else {
        setError(err?.message || "Errore durante l'aggiornamento della transazione");
      }
      setCanRetry(isNetworkError(err) || (typeof navigator !== 'undefined' && navigator.onLine === false));
    } finally {
      setInfoMessage('');
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!lastSubmitPayload || loading) return;
    try {
      setLoading(true);
      setError('');
      setInfoMessage('Riprovo il salvataggio...');
      await submitUpdate(lastSubmitPayload, { fromRetry: true });
    } catch (err) {
      setError(err?.message || 'Riprova non riuscita. Controlla la connessione.');
      setCanRetry(true);
    } finally {
      setInfoMessage('');
      setLoading(false);
    }
  };

  return (
    <div className="transaction-form">
      <div className="form-header">
        <h2>Modifica Transazione</h2>
        <button onClick={attemptClose} className="close-btn" disabled={loading}>&times;</button>
      </div>

      {infoMessage && <div className="error-message" style={{ borderLeftColor: '#2563eb', color: '#bfdbfe', background: 'rgba(37, 99, 235, 0.16)' }}>{infoMessage}</div>}
      {error && (
        <div className="error-message" role="alert">
          <span>{error}</span>
          {canRetry && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={loading}
              style={{
                marginLeft: 'auto',
                background: 'rgba(248, 250, 252, 0.16)',
                color: '#f8fafc',
                border: '1px solid rgba(248, 250, 252, 0.35)',
                borderRadius: 8,
                padding: '6px 10px',
                cursor: 'pointer'
              }}
            >
              Riprova
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Descrizione + Importo */}
        <div className="form-row">
          <div className="form-group">
            <label>Descrizione</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="(Opzionale)"
              className="form-input"
              maxLength={MAX_DESCRIPTION_LENGTH}
              autoFocus
            />
            <small style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
              Facoltativo — puoi lasciare vuoto. {formData.description.length}/{MAX_DESCRIPTION_LENGTH}
            </small>
          </div>

          <div className="form-group">
            <label>Importo *</label>
            <div className="amount-input-wrapper">
              <span className="currency-symbol">€</span>
              <input
                type="text"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                inputMode="decimal"
                className="form-input amount-input"
                placeholder="0,00"
                required
              />
            </div>
          </div>
        </div>

        {/* Tipo + DataOra */}
        <div className="form-row">
          <div className="form-group">
            <label>Tipo *</label>
            <div className="type-toggle">
              <button
                type="button"
                className={`type-btn ${formData.type === 'income' ? 'active' : ''}`}
                onClick={() => handleTypeChange('income')}
              >
                <span className="type-icon">📈</span>
                Entrata
              </button>

              <button
                type="button"
                className={`type-btn ${formData.type === 'expense' ? 'active' : ''}`}
                onClick={() => handleTypeChange('expense')}
              >
                <span className="type-icon">📉</span>
                Uscita
              </button>

              <button
                type="button"
                className={`type-btn ${formData.type === 'transfer' ? 'active' : ''}`}
                onClick={() => handleTypeChange('transfer')}
                disabled={!accounts || accounts.length < 2}
                title={!accounts || accounts.length < 2 ? 'Servono almeno 2 conti' : ''}
              >
                <span className="type-icon">🔁</span>
                Giroconto
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Data e Ora *</label>
            <input
              type="datetime-local"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="form-input"
              step="1"
              required
            />
          </div>
        </div>

        {/* Conti */}
        {formData.type !== 'transfer' ? (
          <div className="form-group">
            <label>Conto *</label>
            <div className="account-selection">
              <select
                name="accountId"
                value={formData.accountId}
                onChange={handleChange}
                className="form-select"
                required
              >
                <option value="">Seleziona un conto</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.type})
                  </option>
                ))}
              </select>

              {selectedAccount && (
                <div className="account-balance-info">
                  <span className="balance-label">Saldo attuale:</span>
                  <span className={`balance-amount ${selectedAccount.balance >= 0 ? 'positive' : 'negative'}`}>
                    {formatCurrency(selectedAccount.balance || 0, userSettings?.currency || 'EUR')}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="form-row">
            <div className="form-group">
              <label>Da Conto *</label>
              <select
                name="fromAccountId"
                value={formData.fromAccountId}
                onChange={handleChange}
                className="form-select"
                required
              >
                <option value="">Seleziona conto origine</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.type})
                  </option>
                ))}
              </select>

              {fromAccount && (
                <div className="account-balance-info">
                  <span className="balance-label">Saldo attuale:</span>
                  <span className={`balance-amount ${fromAccount.balance >= 0 ? 'positive' : 'negative'}`}>
                    {formatCurrency(fromAccount.balance || 0, userSettings?.currency || 'EUR')}
                  </span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>A Conto *</label>
              <select
                name="toAccountId"
                value={formData.toAccountId}
                onChange={handleChange}
                className="form-select"
                required
              >
                <option value="">Seleziona conto destinazione</option>
                {accounts
                  .filter((a) => a.id !== formData.fromAccountId)
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.type})
                    </option>
                  ))}
              </select>

              {toAccount && (
                <div className="account-balance-info">
                  <span className="balance-label">Saldo attuale:</span>
                  <span className={`balance-amount ${toAccount.balance >= 0 ? 'positive' : 'negative'}`}>
                    {formatCurrency(toAccount.balance || 0, userSettings?.currency || 'EUR')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Categoria / Sottocategoria (solo income/expense) */}
        {(formData.type === 'income' || formData.type === 'expense') && (
          <div className="form-row">
            <div className="form-group">
              <label>Categoria</label>
              <div className="category-selection">
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="">Senza categoria</option>
                  {filteredCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>

                {formData.category && (
                  <div className="selected-category">
                    <span className="category-icon-preview" style={{ color: categoryInfo.color }}>
                      {categoryInfo.icon}
                    </span>
                    <span className="category-name-preview">{selectedCategory?.name}</span>
                  </div>
                )}
              </div>
            </div>

            {formData.category && subCategories.length > 0 && (
              <div className="form-group">
                <label>Sottocategoria</label>
                <select
                  name="subCategory"
                  value={formData.subCategory}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="">Nessuna sottocategoria</option>
                  {subCategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.icon || '📋'} {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="form-actions">
          <button type="button" onClick={attemptClose} className="cancel-btn" disabled={loading}>
            Annulla
          </button>
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Salvataggio...' : 'Salva Modifiche'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditTransactionForm;
