// src/pages/EditTransactionForm.js
import React from 'react';
import { useState, useEffect } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import './Transactions.css';
const EditTransactionForm = ({ transaction, onClose }) => {
  const { accounts, categories, updateTransaction } = useFinancial();
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense',
    category: '',
    subCategory: '',
    accountId: '',
    date: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (transaction) {
      const txDate = transaction.date;
      const formattedDate = txDate && typeof txDate === 'object' && 'toDate' in txDate
        ? txDate.toDate().toISOString().split('T')[0]
        : new Date(txDate).toISOString().split('T')[0];
      
      const isIncome = transaction.amount > 0;
      
      setFormData({
        description: transaction.description || '',
        amount: Math.abs(transaction.amount || 0).toString(),
        type: isIncome ? 'income' : 'expense',
        category: transaction.category || '',
        subCategory: transaction.subCategory || '',
        accountId: transaction.accountId || '',
        date: formattedDate
      });
    }
  }, [transaction]);

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
      
      const updateData = {
        description: formData.description.trim() || '',
        amount: parseFloat(formData.amount),
        type: formData.type,
        category: formData.category || null,
        subCategory: formData.subCategory || null,
        accountId: formData.accountId,
        date: new Date(formData.date)
      };
      
      await updateTransaction(transaction.id, updateData);
      onClose();
    } catch (error) {
      console.error('Errore durante l\'aggiornamento:', error);
      setError(error.message || 'Errore durante l\'aggiornamento della transazione');
    } finally {
      setLoading(false);
    }
  };

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
    <div className="transaction-form">
      <div className="form-header">
        <h2>Modifica Transazione</h2>
        <button onClick={onClose} className="close-btn">&times;</button>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
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
              autoFocus
            />
            <small style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
              Facoltativo — puoi lasciare vuoto.
            </small>
          </div>
          
          <div className="form-group">
            <label>Importo *</label>
            <div className="amount-input-wrapper">
              <span className="currency-symbol">€</span>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                step="0.01"
                min="0.01"
                className="form-input amount-input"
                placeholder="0.00"
                required
              />
            </div>
          </div>
        </div>
        
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
            </div>
          </div>
          
          <div className="form-group">
            <label>Data *</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
        </div>
        
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
                {filteredCategories.map(category => (
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
                {subCategories.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.icon || '📋'} {sub.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        <div className="form-actions">
          <button
            type="button"
            onClick={onClose}
            className="cancel-btn"
            disabled={loading}
          >
            Annulla
          </button>
          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
          >
            {loading ? 'Salvataggio...' : 'Salva Modifiche'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditTransactionForm;