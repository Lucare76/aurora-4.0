// src/pages/Transactions.jsx

import React, { useState } from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import AddTransactionForm from './AddTransactionForm';

const Transactions = () => {
  const { transactions, accounts, categories, loading } = useFinancial();
  const [showForm, setShowForm] = useState(false);

  if (loading) return <div>Caricamento transazioni...</div>;

  // Mappa ID a nome per mostrare nome conto e categoria
  const accountMap = Object.fromEntries(accounts.map(acc => [acc.id, acc.name]));
  const categoryMap = Object.fromEntries(categories.map(cat => [cat.id, cat.name]));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Transazioni</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          + Aggiungi Transazione
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <AddTransactionForm onClose={() => setShowForm(false)} />
        </div>
      )}

      <table className="min-w-full bg-white border rounded-lg">
        <thead>
          <tr>
            <th className="border p-2">Data</th>
            <th className="border p-2">Descrizione</th>
            <th className="border p-2">Conto</th>
            <th className="border p-2">Categoria</th>
            <th className="border p-2">Importo</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(tx => (
            <tr key={tx.id}>
              <td className="border p-2">{tx.date?.toDate ? tx.date.toDate().toLocaleDateString() : tx.date}</td>
              <td className="border p-2">{tx.description}</td>
              <td className="border p-2">{accountMap[tx.accountId]}</td>
              <td className="border p-2">{categoryMap[tx.category]}</td>
              <td className={`border p-2 ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {tx.amount.toFixed(2)} €
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {transactions.length === 0 && <p className="mt-4 text-gray-500">Nessuna transazione trovata.</p>}
    </div>
  );
};

export default Transactions;