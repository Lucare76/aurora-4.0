import React, { useState, useEffect } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import { useAuth } from '../contexts/AuthContext';
import './AddTransactionForm.css';

const AddTransactionForm = ({ onClose }) => {
  const { accounts, categories, createTransaction } = useFinancial();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    accountId: '',
    amount: '',
    description: '',
    category: '',
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    targetAccountId: ''
  });

  const [isTransfer, setIsTransfer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    if (accounts.length > 0 && !formData.accountId) {
      setFormData(prev => ({ ...prev, accountId: accounts[0].id }));
    }
    if (categories.length > 0 && !formData.category) {
      const defaultCategory = categories.find(cat => cat.type === formData.type);
      if (defaultCategory) {
        setFormData(prev => ({ ...prev, category: defaultCategory.id }));
      }
    }
  }, [accounts, categories, formData.accountId, formData.category, formData.type]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (type) => {
    setIsTransfer(type === 'transfer');
    setFormData(prev => ({ 
      ...prev, 
      type: type === 'transfer' ? 'expense' : type,
      category: '' 
    }));
    
    // Auto-select first category of the new type
    setTimeout(() => {
      const filteredCategories = categories.filter(cat => cat.type === (type === 'transfer' ? 'expense' : type));
      if (filteredCategories.length > 0) {
        setFormData(prev => ({ ...prev, category: filteredCategories[0].id }));
      }
    }, 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const transactionData = {
      ...formData,
      amount: parseFloat(formData.amount),
      userId: user.uid,
      date: new Date(formData.date)
    };

    if (isTransfer) {
      transactionData.type = 'transfer';
      transactionData.targetAccountId = formData.targetAccountId;
    } else {
      transactionData.amount = formData.type === 'expense' 
        ? -Math.abs(parseFloat(formData.amount)) 
        : Math.abs(parseFloat(formData.amount));
    }

    try {
      await createTransaction(transactionData);
      
      // Success animation
      setCurrentStep(3);
      setTimeout(() => {
        onClose && onClose();
      }, 1500);
      
    } catch (err) {
      console.error('Errore nel creare la transazione:', err);
      setIsLoading(false);
    }
  };

  const getCategoryIcon = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.icon || '💰';
  };

  const getCategoryColor = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.color || '#6b7280';
  };

  const filteredCategories = categories.filter(cat => 
    isTransfer ? true : cat.type === formData.type
  );

  const getAccountIcon = (accountType) => {
    const icons = {
      'checking': '🏦',
      'savings': '💰',
      'credit': '💳',
      'cash': '💵'
    };
    return icons[accountType] || '🏦';
  };

  if (currentStep === 3) {
    return (
      <div className="transaction-form-container">
        <div className="success-animation">
          <div className="success-icon">✅</div>
          <h2>Transazione Aggiunta!</h2>
          <p>La tua transazione è stata salvata con successo</p>
        </div>
      </div>
    );
  }

  return (
    <div className="transaction-form-container">
      <div className="form-header">
        <h2>Nuova Transazione</h2>
        <button className="close-button" onClick={onClose}>
          <span>✕</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="transaction-form">
        {/* Tipo di Transazione */}
        <div className="form-section">
          <label className="section-label">Tipo di Transazione</label>
          <div className="transaction-type-selector">
            <button
              type="button"
              className={`type-button ${!isTransfer && formData.type === 'expense' ? 'active expense' : ''}`}
              onClick={() => handleTypeChange('expense')}
            >
              <span className="type-icon">💸</span>
              <span className="type-label">Spesa</span>
            </button>
            
            <button
              type="button"
              className={`type-button ${!isTransfer && formData.type === 'income' ? 'active income' : ''}`}
              onClick={() => handleTypeChange('income')}
            >
              <span className="type-icon">💰</span>
              <span className="type-label">Entrata</span>
            </button>
            
            <button
              type="button"
              className={`type-button ${isTransfer ? 'active transfer' : ''}`}
              onClick={() => handleTypeChange('transfer')}
            >
              <span className="type-icon">🔄</span>
              <span className="type-label">Trasferimento</span>
            </button>
          </div>
        </div>

        {/* Importo */}
        <div className="form-section">
          <label className="section-label">Importo</label>
          <div className="amount-input-wrapper">
            <span className="currency-symbol">€</span>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="0,00"
              className="amount-input"
              step="0.01"
              min="0"
              required
            />
          </div>
        </div>

        {/* Descrizione */}
        <div className="form-section">
          <label className="section-label">Descrizione (opzionale)</label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Es. Spesa supermercato, Stipendio..."
            className="description-input"
          />
        </div>

        {/* Conto */}
        <div className="form-section">
          <label className="section-label">
            {isTransfer ? 'Conto di Origine' : 'Conto'}
          </label>
          <div className="account-selector">
            {accounts.map(account => (
              <label
                key={account.id}
                className={`account-option ${formData.accountId === account.id ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="accountId"
                  value={account.id}
                  checked={formData.accountId === account.id}
                  onChange={handleChange}
                />
                <div className="account-info">
                  <span className="account-icon">{getAccountIcon(account.type)}</span>
                  <div className="account-details">
                    <span className="account-name">{account.name}</span>
                    <span className="account-balance">€{account.balance?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Conto Destinazione (solo per trasferimenti) */}
        {isTransfer && (
          <div className="form-section">
            <label className="section-label">Conto di Destinazione</label>
            <div className="account-selector">
              {accounts.filter(acc => acc.id !== formData.accountId).map(account => (
                <label
                  key={account.id}
                  className={`account-option ${formData.targetAccountId === account.id ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="targetAccountId"
                    value={account.id}
                    checked={formData.targetAccountId === account.id}
                    onChange={handleChange}
                  />
                  <div className="account-info">
                    <span className="account-icon">{getAccountIcon(account.type)}</span>
                    <div className="account-details">
                      <span className="account-name">{account.name}</span>
                      <span className="account-balance">€{account.balance?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Categoria (non per trasferimenti) */}
        {!isTransfer && (
          <div className="form-section">
            <label className="section-label">Categoria</label>
            <div className="category-selector">
              {filteredCategories.map(category => (
                <label
                  key={category.id}
                  className={`category-option ${formData.category === category.id ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="category"
                    value={category.id}
                    checked={formData.category === category.id}
                    onChange={handleChange}
                  />
                  <div className="category-info">
                    <div 
                      className="category-icon"
                      style={{ 
                        backgroundColor: getCategoryColor(category.id) + '20',
                        color: getCategoryColor(category.id)
                      }}
                    >
                      {getCategoryIcon(category.id)}
                    </div>
                    <span className="category-name">{category.name}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Data */}
        <div className="form-section">
          <label className="section-label">Data</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="date-input"
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Azioni */}
        <div className="form-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={onClose}
            disabled={isLoading}
          >
            Annulla
          </button>
          
          <button
            type="submit"
            className="submit-button"
            disabled={isLoading || !formData.amount}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Salvando...
              </>
            ) : (
              <>
                <span className="submit-icon">💾</span>
                Salva Transazione
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddTransactionForm;