import React, { useState, useEffect } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import './AddTransactionForm.css';

/* Data/ora locale per input datetime-local */
function getLocalDateTimeForInput(dateObj = new Date()) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  const h = String(dateObj.getHours()).padStart(2, '0');
  const min = String(dateObj.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
}

function parseLocalDateFromInput(value) {
  if (!value) return null;

  if (value.includes('T')) {
    const [datePart, timePart] = value.split('T');
    const [y, m, d] = datePart.split('-').map(Number);
    const [h, min] = timePart.split(':').map(Number);
    return new Date(y, m - 1, d, h, min, 0, 0);
  }

  const [y, m, d] = value.split('-').map(Number);
  const now = new Date();
  return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), 0, 0);
}

const AddTransactionForm = ({ onClose }) => {
  const { accounts, categories, createTransaction } = useFinancial();

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense',
    category: '',
    subCategory: '',
    accountId: '',
    date: getLocalDateTimeForInput()
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* Conto di default */
  useEffect(() => {
    if (accounts?.length > 0 && !formData.accountId) {
      setFormData(prev => ({
        ...prev,
        accountId: accounts[0].id
      }));
    }
  }, [accounts, formData.accountId]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'category') {
      setFormData(prev => ({
        ...prev,
        category: value,
        subCategory: ''
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      type,
      category: '',
      subCategory: ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const amountNum = parseFloat(formData.amount);
    if (!amountNum || amountNum <= 0) {
      setError('Inserisci un importo valido');
      return;
    }

    if (!formData.accountId) {
      setError('Seleziona un conto');
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

      await createTransaction({
        description: formData.description.trim() || '', // ✅ Adesso è opzionale
        amount: formData.type === 'income' ? amountNum : -amountNum,
        type: formData.type,
        category: formData.category || null,
        subCategory: formData.subCategory || null,
        accountId: formData.accountId,
        date: transactionDate,
        timestamp: transactionDate.getTime()
      });

      setFormData({
        description: '',
        amount: '',
        type: 'expense',
        category: '',
        subCategory: '',
        accountId: accounts?.[0]?.id || '',
        date: getLocalDateTimeForInput()
      });

      onClose?.();
    } catch (err) {
      setError(err?.message || 'Errore durante la creazione');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = (categories || []).filter(
    c => c.type === formData.type
  );

  const selectedCategory = categories?.find(
    c => c.id === formData.category
  );

  const subCategories = selectedCategory?.subCategories || [];

  const selectedAccount = accounts?.find(
    a => a.id === formData.accountId
  );

  return (
    <div className="transaction-form-container">
      <div className="form-header">
        <h2>Nuova Transazione</h2>
        <button type="button" className="close-button" onClick={onClose}>
          &times;
        </button>
      </div>

      <div className="transaction-form">
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
                // ⬇️ Rimosso "required"
              />
              <small style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                Facoltativo — puoi lasciare vuoto.
              </small>
            </div>

            <div className="form-group">
              <label className="section-label">Importo *</label>
              <div className="amount-input-wrapper">
                <span className="currency-symbol">€</span>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  min="0.01"
                  step="0.01"
                  className="amount-input"
                  required
                />
              </div>
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
                  📈 Entrata
                </button>

                <button
                  type="button"
                  className={`type-button ${formData.type === 'expense' ? 'active expense' : ''}`}
                  onClick={() => handleTypeChange('expense')}
                >
                  📉 Uscita
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
                required
              />
            </div>
          </div>

          {/* Conto */}
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
              {accounts?.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type})
                </option>
              ))}
            </select>

            {selectedAccount && (
              <div className="account-balance-info">
                <span>Saldo attuale:</span>
                <strong className={selectedAccount.balance >= 0 ? 'positive' : 'negative'}>
                  €{selectedAccount.balance.toFixed(2)}
                </strong>
              </div>
            )}
          </div>

          {/* Categoria */}
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
                {filteredCategories.map(cat => (
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
                  {subCategories.map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.icon || '📋'} {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Azioni */}
          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              Annulla
            </button>
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Creazione…' : '➕ Crea Transazione'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionForm;