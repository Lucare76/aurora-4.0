import React, { useState } from 'react';
import { useFinancial } from '../contexts/FinancialContext';

const CreateFirstAccount = () => {
  const { createAccount, accounts } = useFinancial();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateFirstAccount = async () => {
    if (isCreating) return;
    
    setIsCreating(true);
    try {
      await createAccount({
        name: 'Conto Corrente',
        type: 'bank',
        balance: 0,
        color: '#4f46e5'
      });
      console.log("✅ Primo conto creato!");
    } catch (error) {
      console.error("❌ Errore creazione conto:", error);
    } finally {
      setIsCreating(false);
    }
  };

  // Se non ci sono conti, mostra il pulsante per crearne uno
  if (accounts.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px 20px',
        background: 'var(--bg-primary)',
        borderRadius: '12px',
        border: '2px dashed var(--border-color)',
        margin: '20px 0'
      }}>
        <h3>🎯 Crea il tuo primo conto</h3>
        <p>Per aggiungere transazioni, hai bisogno di almeno un conto</p>
        <button 
          onClick={handleCreateFirstAccount}
          disabled={isCreating}
          style={{
            background: 'var(--primary-color)',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: 'pointer',
            marginTop: '15px'
          }}
        >
          {isCreating ? 'Creazione...' : 'Crea Primo Conto'}
        </button>
      </div>
    );
  }

  return null;
};

export default CreateFirstAccount;