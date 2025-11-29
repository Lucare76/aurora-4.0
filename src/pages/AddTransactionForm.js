// src/pages/AddTransactionForm.jsx

import React, { useState, useEffect } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import { useAuth } from '../contexts/AuthContext';

const AddTransactionForm = ({ onClose }) => {
  const { accounts, categories, createTransaction } = useFinancial();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    accountId: '',
    amount: '',
    description: '',
    category: '',
    type: 'expense', // 'income', 'expense', 'transfer'
    date: new Date().toISOString().split('T')[0],
    targetAccountId: '' // per trasferimenti
  });

  const [isTransfer, setIsTransfer] = useState(false);

  useEffect(() => {
    if (accounts.length > 0 && !formData.accountId) {
      setFormData(prev => ({ ...prev, accountId: accounts[0].id }));
    }
    if (categories.length > 0 && !formData.category) {
      setFormData(prev => ({ ...prev, category: categories[0].id }));
    }
  }, [accounts, categories, formData.accountId, formData.category]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const transactionData = {
      ...formData,
      amount: parseFloat(formData.amount),
      userId: user.uid
    };

    if (isTransfer) {
      transactionData.type = 'transfer';
      transactionData.targetAccountId = formData.targetAccountId;
    } else {
      transactionData.amount = formData.type === 'expense' ? -Math.abs(parseFloat(formData.amount)) : Math.abs(parseFloat(formData.amount));
    }

    try {
      await createTransaction(transactionData);
      alert('Transazione aggiunta!');
      onClose && onClose();
    } catch (err) {
      alert('Errore: ' + err.message);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Aggiungi Transazione</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium">Tipo</label>
          <div className="flex space-x-4">
            <label>
              <input
                type="radio"
                name="type"
                value="expense"
                checked={formData.type === 'expense' && !isTransfer}
                onChange={() => {
                  setIsTransfer(false);
                  setFormData(prev => ({ ...prev, type: 'expense' }));
                }}
              /> Spesa
            </label>
            <label>
              <input
                type="radio"
                name="type"
                value="income"
                checked={formData.type === 'income' && !isTransfer}
                onChange={() => {
                  setIsTransfer(false);
                  setFormData(prev => ({ ...prev, type: 'income' }));
                }}
              /> Entrata
            </label>
            <label>
              <input
                type="radio"
                name="type"
                value="transfer"
                checked={isTransfer}
                onChange={() => setIsTransfer(true)}
              /> Trasferimento
            </label>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium">Conto</label>
          <select
            name="accountId"
            value={formData.accountId}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          >
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.balance.toFixed(2)} €)
              </option>
            ))}
          </select>
        </div>

        {isTransfer && (
          <div className="mb-4">
            <label className="block text-sm font-medium">Conto Destinazione</label>
            <select
              name="targetAccountId"
              value={formData.targetAccountId}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              {accounts.filter(acc => acc.id !== formData.accountId).map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium">Importo</label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium">Descrizione</label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium">Categoria</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium">Data</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="flex justify-end space-x-2">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">
            Annulla
          </button>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
            Salva
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddTransactionForm;