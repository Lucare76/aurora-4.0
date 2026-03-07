import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import { useAuth } from '../contexts/AuthContext';
import { getCurrencySymbol, formatCurrency } from '../utils/currency';
import { formatEntityLabel } from '../utils/text';
import {
  suggestTopCategories,
  suggestTopCategoriesFromReceipt
} from '../services/smartCategoryService';
import { addRecurring } from '../services/recurringService';
import { analyzeReceipt } from '../services/receiptService';
import './AddTransactionForm.css';

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
    const [h, min, sec = '0'] = timePart.split(':');
    return new Date(y, m - 1, d, Number(h), Number(min), Number(sec) || 0, 0);
  }

  const [y, m, d] = value.split('-').map(Number);
  const now = new Date();
  return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds(), 0);
}

function pickDifferentAccountId(accounts, excludeId) {
  const other = (accounts || []).find((a) => a.id !== excludeId);
  return other?.id || '';
}

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

function normalizeDescription(value) {
  return formatEntityLabel(value || '').trim();
}

const AddTransactionForm = ({ onClose }) => {
  const { accounts = [], categories = [], transactions = [], createTransaction, createTransfer } = useFinancial();
  const { userSettings, user } = useAuth();
  const cs = getCurrencySymbol(userSettings?.currency);

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

  // Receipt scanner
  const [scanLoading, setScanLoading] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const fileInputRef = useRef(null);
  const dateTouchedRef = useRef(false);

  const handleReceiptUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input per permettere di ricaricare lo stesso file
    e.target.value = '';

    // Mostra anteprima
    const previewUrl = URL.createObjectURL(file);
    setReceiptPreview(previewUrl);

    try {
      setScanLoading(true);
      setError('');

      const compressImageToBase64 = (inputFile) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const maxSize = 1280;
            let { width, height } = img;
            if (width > maxSize || height > maxSize) {
              const ratio = Math.min(maxSize / width, maxSize / height);
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(reader.result);
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.8);
            resolve(compressed);
          };
          img.onerror = () => resolve(reader.result);
          img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(inputFile);
      });

      const base64 = await compressImageToBase64(file);

      // Chiama la Cloud Function
      const data = await analyzeReceipt(base64);

      // Pre-compila il form con i dati estratti
      setFormData(prev => {
        const updates = { ...prev };

        if (data.amount) {
          // Formatta l'importo nel formato italiano (virgola come separatore decimale)
          updates.amount = formatInputAmount(data.amount.toFixed(2).replace('.', ','));
        }

        if (data.merchant) {
          updates.description = data.merchant;
        }

        if (data.date) {
          // data è in formato YYYY-MM-DD, aggiungi l'ora corrente
          const now = new Date();
          const h = String(now.getHours()).padStart(2, '0');
          const min = String(now.getMinutes()).padStart(2, '0');
          const sec = String(now.getSeconds()).padStart(2, '0');
          updates.date = `${data.date}T${h}:${min}:${sec}`;
          dateTouchedRef.current = true;
        }

        return updates;
      });

      // Suggerimento smart da scontrino (merchant + raw OCR + fallback keyword)
      const receiptSuggestions = suggestTopCategoriesFromReceipt(data, transactions, categories, formData.type, 3);
      const firstSuggestion = receiptSuggestions?.[0];
      setSuggestions(receiptSuggestions || []);
      if (firstSuggestion) {
        setFormData((prev) => ({
          ...prev,
          category: prev.category || firstSuggestion.categoryId || '',
          subCategory: prev.subCategory || firstSuggestion.subCategoryId || ''
        }));
      }
    } catch (err) {
      setError(err.message || 'Errore durante la scansione dello scontrino');
    } finally {
      setScanLoading(false);
    }
  }, [transactions, categories, formData.type]);

  // Smart category suggestion
  const [suggestions, setSuggestions] = useState([]);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!formData.description || formData.description.length < 2 || formData.type === 'transfer') {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const results = suggestTopCategories(formData.description, transactions, categories, formData.type, 3);
      setSuggestions(results || []);
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [formData.description, formData.type, transactions, categories]);

  const applySuggestion = useCallback((picked) => {
    if (!picked) return;
    setFormData(prev => ({
      ...prev,
      category: picked.categoryId,
      subCategory: picked.subCategoryId
    }));
    setSuggestions([]);
  }, []);

  // Templates
  const [templates, setTemplates] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('aurora_templates') || '[]');
    } catch { return []; }
  });

  const saveTemplate = () => {
    if (!formData.description && !formData.amount) return;
    const tpl = {
      id: Date.now().toString(),
      label: formData.description || `${cs}${formData.amount}`,
      amount: formData.amount,
      type: formData.type,
      categoryId: formData.category,
      subCategoryId: formData.subCategory,
      accountId: formData.accountId,
      description: formData.description
    };
    const updated = [...templates, tpl];
    setTemplates(updated);
    localStorage.setItem('aurora_templates', JSON.stringify(updated));
  };

  const applyTemplate = (tpl) => {
    setFormData(prev => ({
      ...prev,
      description: tpl.description || '',
      amount: tpl.amount || '',
      type: tpl.type || prev.type,
      category: tpl.categoryId || '',
      subCategory: tpl.subCategoryId || '',
      accountId: tpl.accountId || prev.accountId
    }));
  };

  const deleteTemplate = (id) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    localStorage.setItem('aurora_templates', JSON.stringify(updated));
  };

  // Recurring
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState('monthly');

  // default conti
  useEffect(() => {
    if (!accounts?.length) return;

    setFormData((prev) => {
      const first = accounts[0]?.id || '';
      const second = pickDifferentAccountId(accounts, first);

      // se già valorizzati, non toccare
      const next = { ...prev };
      if (!next.accountId) next.accountId = first;
      if (!next.fromAccountId) next.fromAccountId = first;
      if (!next.toAccountId) next.toAccountId = second;

      // evita from=to
      if (next.fromAccountId && next.toAccountId && next.fromAccountId === next.toAccountId) {
        next.toAccountId = pickDifferentAccountId(accounts, next.fromAccountId);
      }
      return next;
    });
  }, [accounts]);

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
        const nextTo =
          prev.toAccountId === nextFrom ? pickDifferentAccountId(accounts, nextFrom) : prev.toAccountId;
        return { ...prev, fromAccountId: nextFrom, toAccountId: nextTo };
      });
      return;
    }

    if (name === 'description') {
      setFormData((prev) => ({ ...prev, description: String(value || '') }));
      return;
    }

    if (name === 'date') {
      dateTouchedRef.current = true;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (type) => {
    setFormData((prev) => {
      if (type === 'transfer') {
        const from = prev.accountId || accounts?.[0]?.id || '';
        const to = pickDifferentAccountId(accounts, from);
        return {
          ...prev,
          type,
          category: '',
          subCategory: '',
          fromAccountId: from,
          toAccountId: to
        };
      }

      return {
        ...prev,
        type,
        category: '',
        subCategory: ''
      };
    });
  };

  const filteredCategories = useMemo(() => {
  if (formData.type !== 'income' && formData.type !== 'expense') return [];
  // ✅ Mostra TUTTE le categorie
  return categories;
}, [categories, formData.type]);

  const selectedCategory = useMemo(() => {
    return categories?.find((c) => c.id === formData.category);
  }, [categories, formData.category]);

  const subCategories = selectedCategory?.subCategories || [];

  const selectedAccount = accounts?.find((a) => a.id === formData.accountId);
  const fromAccount = accounts?.find((a) => a.id === formData.fromAccountId);
  const toAccount = accounts?.find((a) => a.id === formData.toAccountId);
  const amountNum = useMemo(() => parseAmountFromInput(formData.amount), [formData.amount]);

  const anomalyInsight = useMemo(() => {
    if (formData.type !== 'expense' || amountNum <= 0) return null;

    const currentCategoryId = formData.category || null;
    const currentDesc = String(formData.description || '').trim().toLocaleLowerCase('it-IT');
    const sameBucket = (transactions || []).filter((t) => {
      if ((t?.type || '') !== 'expense') return false;
      const historicalAmount = Math.abs(Number(t?.amount) || 0);
      if (historicalAmount <= 0) return false;

      const byCategory = currentCategoryId && t?.categoryId === currentCategoryId;
      const byDescription =
        currentDesc.length >= 4 &&
        String(t?.description || '').toLocaleLowerCase('it-IT').includes(currentDesc);
      return byCategory || byDescription;
    });

    if (sameBucket.length < 3) return null;

    const average = sameBucket.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0) / sameBucket.length;
    if (!Number.isFinite(average) || average <= 0) return null;

    const ratio = amountNum / average;
    if (ratio < 1.8 || amountNum - average < 15) return null;

    return {
      average,
      ratio,
      sampleSize: sameBucket.length
    };
  }, [formData.type, formData.category, formData.description, amountNum, transactions]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const amountToSubmit = amountNum;
    if (!amountToSubmit || amountToSubmit <= 0) {
      setError('Inserisci un importo valido');
      return;
    }

    const transactionDate = dateTouchedRef.current
      ? parseLocalDateFromInput(formData.date)
      : new Date();
    if (!transactionDate) {
      setError('Data non valida');
      return;
    }

    try {
      setLoading(true);
      setError('');
      if (formData.type === 'transfer') {
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

        await createTransfer({
          description: normalizeDescription(formData.description) || '',
          type: 'transfer',
          amount: Math.abs(amountToSubmit),
          fromAccountId: formData.fromAccountId,
          toAccountId: formData.toAccountId,
          date: transactionDate,
          timestamp: transactionDate.getTime()
        });

        setFormData((prev) => ({
          ...prev,
          description: '',
          amount: '',
          type: 'expense',
          category: '',
          subCategory: '',
          accountId: accounts?.[0]?.id || '',
          date: getLocalDateTimeForInput()
        }));
        dateTouchedRef.current = false;

        onClose?.();
        return;
      }

      // ✅ NORMALE (entrata/uscita)
      if (!formData.accountId) {
        setError('Seleziona un conto');
        return;
      }

      await createTransaction({
        description: normalizeDescription(formData.description) || '',
        amount: formData.type === 'income' ? amountToSubmit : -amountToSubmit,
        type: formData.type,
        category: formData.category || null,
        subCategory: formData.subCategory || null,
        accountId: formData.accountId,
        date: transactionDate,
        timestamp: transactionDate.getTime()
      });

      // Crea ricorrenza se attivata
      if (isRecurring && user?.uid) {
        const selCat = categories.find(c => c.id === formData.category);
        const selSub = selCat?.subCategories?.find(s => s.id === formData.subCategory);
        const selAcc = accounts.find(a => a.id === formData.accountId);

        const nextDate = new Date(transactionDate);
        if (recurringFrequency === 'weekly') {
          nextDate.setDate(nextDate.getDate() + 7);
        } else {
          nextDate.setMonth(nextDate.getMonth() + 1);
        }

        await addRecurring(user.uid, {
          description: normalizeDescription(formData.description) || '',
          amount: amountToSubmit,
          type: formData.type,
          categoryId: formData.category || null,
          categoryName: selCat?.name || '',
          subCategoryId: formData.subCategory || null,
          subCategoryName: selSub?.name || '',
          accountId: formData.accountId || null,
          accountName: selAcc?.name || '',
          frequency: recurringFrequency,
          nextDate
        });
      }

      setFormData({
        description: '',
        amount: '',
        type: 'expense',
        category: '',
        subCategory: '',
        accountId: accounts?.[0]?.id || '',
        fromAccountId: accounts?.[0]?.id || '',
        toAccountId: pickDifferentAccountId(accounts, accounts?.[0]?.id || ''),
        date: getLocalDateTimeForInput()
      });
      dateTouchedRef.current = false;

      onClose?.();
    } catch (err) {
      setError(err?.message || 'Errore durante la creazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="transaction-form-container">
      <div className="form-header">
        <h2>Nuova Transazione</h2>
        <button type="button" className="close-button" onClick={onClose}>
          &times;
        </button>
      </div>

      <div className="transaction-form">
        {/* Template bar */}
        {templates.length > 0 && (
          <div className="template-bar">
            {templates.map(tpl => (
              <div key={tpl.id} className="template-chip" onClick={() => applyTemplate(tpl)}>
                <span className="template-chip-label">{tpl.label}</span>
                <button
                  type="button"
                  className="template-chip-delete"
                  onClick={(e) => { e.stopPropagation(); deleteTemplate(tpl.id); }}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Scansiona Scontrino */}
        <div className="receipt-scanner-section">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            onChange={handleReceiptUpload}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="receipt-scan-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={scanLoading}
          >
            {scanLoading ? (
              <>
                <span className="receipt-spinner" />
                Analisi in corso...
              </>
            ) : (
              <>
                Scansiona Scontrino
              </>
            )}
          </button>
          {receiptPreview && (
            <div className="receipt-preview">
              <img src={receiptPreview} alt="Anteprima scontrino" />
              <button
                type="button"
                className="receipt-preview-remove"
                onClick={() => {
                  setReceiptPreview(null);
                  URL.revokeObjectURL(receiptPreview);
                }}
              >
                &times;
              </button>
            </div>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Descrizione + Importo */}
          <div className="form-row">
            <div className="form-group">
              <label className="section-label">Descrizione</label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="(Opzionale)"
                className="description-input"
              />
              {suggestions.length > 0 && (
                <div className="suggestion-list">
                  <button
                    type="button"
                    className="apply-top-suggestion-btn"
                    onClick={() => applySuggestion(suggestions[0])}
                  >
                    Applica suggerimento migliore
                  </button>
                  {suggestions.map((item, index) => (
                    <div
                      key={`${item.categoryId}-${item.subCategoryId || 'none'}-${index}`}
                      className="suggestion-chip"
                      onClick={() => applySuggestion(item)}
                    >
                      {item.categoryIcon} {item.categoryName}
                      {item.subCategoryName ? ` > ${item.subCategoryName}` : ''}
                      <span
                        className={`suggestion-confidence ${String(item.confidenceLabel || '').toLowerCase()}`}
                        title={`Confidenza ${item.confidenceLabel || 'Media'}`}
                      >
                        {item.confidenceLabel || 'Media'}
                      </span>
                      <span className="suggestion-hint"> - clicca per applicare</span>
                    </div>
                  ))}
                </div>
              )}
              <small style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                Facoltativo, puoi lasciare vuoto.
              </small>
            </div>

            <div className="form-group">
              <label className="section-label">Importo *</label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                background: 'white',
                overflow: 'hidden',
                transition: 'all 0.3s ease'
              }}>
                <span style={{
                  padding: '14px 0 14px 16px',
                  color: '#64748b',
                  fontSize: '18px',
                  fontWeight: 700,
                  userSelect: 'none',
                  flexShrink: 0,
                  lineHeight: 1
                }}>{cs}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0,00"
                  className="amount-input"
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    padding: '14px 16px 14px 10px',
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#1e293b',
                    fontFamily: 'inherit',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    boxShadow: 'none',
                    width: '100%'
                  }}
                  required
                />
              </div>
              {anomalyInsight && (
                <div className="assistant-anomaly-hint">
                  Importo sopra media: simili a {cs}{' '}
                  {formatInputAmount(anomalyInsight.average.toFixed(2).replace('.', ','))}
                  {' '}({anomalyInsight.sampleSize} movimenti, {anomalyInsight.ratio.toFixed(1)}x)
                </div>
              )}
            </div>
          </div>

          {/* Tipo + Data */}
          <div className="form-row">
            <div className="form-group">
              <label className="section-label">Tipo *</label>
              <div className="transaction-type-selector">
                <button
                  type="button"
                  className={`type-button ${formData.type === 'income' ? 'active income' : ''}`}
                  onClick={() => handleTypeChange('income')}
                >
                  Entrata
                </button>

                <button
                  type="button"
                  className={`type-button ${formData.type === 'expense' ? 'active expense' : ''}`}
                  onClick={() => handleTypeChange('expense')}
                >
                  Uscita
                </button>

                <button
                  type="button"
                  className={`type-button ${formData.type === 'transfer' ? 'active' : ''}`}
                  onClick={() => handleTypeChange('transfer')}
                  disabled={!accounts || accounts.length < 2}
                  title={!accounts || accounts.length < 2 ? 'Servono almeno 2 conti' : ''}
                >
                  Giroconto
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="section-label">Data e Ora *</label>
              <input
                type="datetime-local"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="date-input"
                step="1"
                required
              />
            </div>
          </div>

          {/* Conti */}
          {formData.type !== 'transfer' ? (
            <div className="form-group">
              <label className="section-label">Conto *</label>
              <select
                name="accountId"
                value={formData.accountId}
                onChange={handleChange}
                className="form-select"
                required
              >
                <option value="">Seleziona un conto</option>
                {accounts?.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type})
                  </option>
                ))}
              </select>

                {selectedAccount && (
                  <div className="account-balance-info">
                    <span>Saldo attuale:</span>
                    <strong className={selectedAccount.balance >= 0 ? 'positive' : 'negative'}>
                      {formatCurrency(selectedAccount.balance, userSettings?.currency || 'EUR')}
                    </strong>
                  </div>
                )}
            </div>
          ) : (
            <div className="form-row">
              <div className="form-group">
                <label className="section-label">Da Conto *</label>
                <select
                  name="fromAccountId"
                  value={formData.fromAccountId}
                  onChange={handleChange}
                  className="form-select"
                  required
                >
                  <option value="">Seleziona conto origine</option>
                  {accounts?.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>

                {fromAccount && (
                  <div className="account-balance-info">
                    <span>Saldo attuale:</span>
                    <strong className={fromAccount.balance >= 0 ? 'positive' : 'negative'}>
                      {formatCurrency(fromAccount.balance, userSettings?.currency || 'EUR')}
                    </strong>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="section-label">A Conto *</label>
                <select
                  name="toAccountId"
                  value={formData.toAccountId}
                  onChange={handleChange}
                  className="form-select"
                  required
                >
                  <option value="">Seleziona conto destinazione</option>
                  {accounts
                    ?.filter((acc) => acc.id !== formData.fromAccountId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type})
                      </option>
                    ))}
                </select>

                {toAccount && (
                  <div className="account-balance-info">
                    <span>Saldo attuale:</span>
                    <strong className={toAccount.balance >= 0 ? 'positive' : 'negative'}>
                      {formatCurrency(toAccount.balance, userSettings?.currency || 'EUR')}
                    </strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Categoria (solo income/expense) */}
          {(formData.type === 'income' || formData.type === 'expense') && (
            <div className="form-row">
              <div className="form-group">
                <label className="section-label">Categoria</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="">Senza categoria</option>
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {formData.category && subCategories.length > 0 && (
                <div className="form-group">
                  <label className="section-label">Sottocategoria</label>
                  <select
                    name="subCategory"
                    value={formData.subCategory}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="">Nessuna sottocategoria</option>
                    {subCategories.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.icon || '*'} {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Ricorrente (solo income/expense) */}
          {formData.type !== 'transfer' && (
            <div className="recurring-toggle">
              <label className="recurring-label">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                />
                <span className="recurring-text">Transazione Ricorrente</span>
              </label>
              {isRecurring && (
                <select
                  value={recurringFrequency}
                  onChange={(e) => setRecurringFrequency(e.target.value)}
                  className="recurring-select"
                >
                  <option value="monthly">Mensile</option>
                  <option value="weekly">Settimanale</option>
                </select>
              )}
            </div>
          )}

          {/* Azioni */}
          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              Annulla
            </button>
            <button type="button" className="template-save-button" onClick={saveTemplate}>
              Salva template
            </button>
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Creazione...' : 'Crea Transazione'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionForm;


