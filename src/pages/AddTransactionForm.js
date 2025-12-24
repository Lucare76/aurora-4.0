// src/pages/AddTransactionForm.js
import React, { useState, useEffect } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import './AddTransactionForm.css';

const AddTransactionForm = ({ onClose }) => {
  const { accounts, categories, createTransaction } = useFinancial();
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense',
    category: '',
    subCategory: '',
    accountId: '',
    date: getLocalDateTimeForInput() // CORREZIONE: Usa funzione corretta
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // CORREZIONE: Funzione per ottenere data/ora locale corretta per input datetime-local
  function getLocalDateTimeForInput() {
    const now = new Date();
    
    // Crea una data in formato locale (senza conversioni di fuso orario)
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // Imposta un conto di default quando sono disponibili gli account
  useEffect(() => {
    if (accounts.length > 0 && !formData.accountId) {
      setFormData(prev => ({
        ...prev,
        accountId: accounts[0]?.id || ''
      }));
    }
  }, [accounts, formData.accountId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'category') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        subCategory: ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
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
    
    if (!formData.description.trim()) {
      setError('La descrizione è obbligatoria');
      return;
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Inserisci un importo valido');
      return;
    }
    
    if (!formData.accountId) {
      setError('Seleziona un conto');
      return;
    }
    
    if (!formData.date) {
      setError('Seleziona una data');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // CORREZIONE: Crea la data in modo semplice e corretto
      let transactionDate;
      
      if (formData.date.includes('T')) {
        // Formato yyyy-MM-ddThh:mm
        const [datePart, timePart] = formData.date.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        
        // Crea la data direttamente in ora locale
        transactionDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
      } else {
        // Formato yyyy-MM-dd
        const [year, month, day] = formData.date.split('-').map(Number);
        const now = new Date();
        transactionDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), 0, 0);
      }
      
      const transactionData = {
        description: formData.description.trim(),
        amount: formData.type === 'income' ? parseFloat(formData.amount) : -parseFloat(formData.amount),
        type: formData.type,
        category: formData.category || null,
        subCategory: formData.subCategory || null,
        accountId: formData.accountId,
        date: transactionDate, // Salva come oggetto Date
        timestamp: transactionDate.getTime() // Per ordinamento
      };
      
      await createTransaction(transactionData);
      
      // Reset form
      setFormData({
        description: '',
        amount: '',
        type: 'expense',
        category: '',
        subCategory: '',
        accountId: accounts[0]?.id || '',
        date: getLocalDateTimeForInput() // Reimposta con data/ora corrente
      });
      
      onClose();
    } catch (error) {
      console.error('Errore durante la creazione:', error);
      setError(error.message || 'Errore durante la creazione della transazione');
    } finally {
      setLoading(false);
    }
  };

  // Filtra categorie per tipo (income/expense)
  const filteredCategories = categories.filter(
    cat => cat.type === formData.type
  );

  const selectedCategory = categories.find(cat => cat.id === formData.category);
  const subCategories = selectedCategory?.subCategories || [];

  const selectedAccount = accounts.find(acc => acc.id === formData.accountId);

  const getCategoryIcon = (categoryId) => {
    if (!categoryId) return { icon: '💰', color: '#6b7280' };
    const category = categories.find(cat => cat.id === categoryId);
    return { 
      icon: category?.icon || '💰', 
      color: category?.color || '#6b7280' 
    };
  };

  const categoryInfo = getCategoryIcon(formData.category);

  return (
    <div className="transaction-form-container">
      <div className="form-header">
        <h2>Nuova Transazione</h2>
        <button onClick={onClose} className="close-button">&times;</button>
      </div>

      <div className="transaction-form">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* Descrizione + Importo */}
          <div className="form-row">
            <div className="form-group">
              <label className="section-label">Descrizione *</label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Es. Stipendio, Affitto, Spesa..."
                className="description-input"
                required
                autoFocus
              />
            </div>
            
            <div className="form-group">
              <label className="section-label">Importo *</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                step="0.01"
                min="0.01"
                className="description-input"
                placeholder="0.00"
                required
              />
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
                  <span className="type-icon">📈</span>
                  <span className="type-label">Entrata</span>
                </button>
                <button
                  type="button"
                  className={`type-button ${formData.type === 'expense' ? 'active expense' : ''}`}
                  onClick={() => handleTypeChange('expense')}
                >
                  <span className="type-icon">📉</span>
                  <span className="type-label">Uscita</span>
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
            <div className="account-selection">
              <select
                name="accountId"
                value={formData.accountId}
                onChange={handleChange}
                className="form-select"
                required
              >
                <option value="">Seleziona un conto</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.type})
                  </option>
                ))}
              </select>

              {selectedAccount && (
                <div className="account-balance-info">
                  <span className="balance-label">Saldo attuale:</span>
                  <span className={`balance-amount ${selectedAccount.balance >= 0 ? 'positive' : 'negative'}`}>
                    €{selectedAccount.balance?.toFixed(2) || '0.00'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Categoria + Sottocategoria */}
          <div className="form-row">
            <div className="form-group">
              <label className="section-label">Categoria</label>
              <div className="category-selection">
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="">Senza categoria</option>
                  {filteredCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>

                {formData.category && (
                  <div className="selected-category">
                    <span
                      className="category-icon-preview"
                      style={{ color: categoryInfo.color }}
                    >
                      {categoryInfo.icon}
                    </span>
                    <span className="category-name-preview">
                      {selectedCategory?.name}
                    </span>
                  </div>
                )}
              </div>
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

          {/* Bottoni */}
          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="cancel-button"
              disabled={loading}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading-spinner" /> Creazione...
                </>
              ) : (
                <>
                  <span className="submit-icon">➕</span> Crea Transazione
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionForm;