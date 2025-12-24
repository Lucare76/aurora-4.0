// src/components/CreateFirstAccount.js
import React from 'react';
import { useFinancial } from '../contexts/FinancialContext';
import '../pages/Accounts.css'; // ✅ path corretto

/**
 * Mostra un box di benvenuto SOLO se non esistono ancora account.
 */
const CreateFirstAccount = () => {
  const { accounts } = useFinancial();

  // Se esiste almeno un account, non mostra nulla
  if (!accounts || accounts.length > 0) {
    return null;
  }

  return (
    <div className="first-account-wrapper">
      <div className="first-account-card">
        <div className="first-account-icon">🌅</div>
        <h2 className="first-account-title">Benvenuto in Aurora 4.0</h2>
        <p className="first-account-text">
          Qui puoi gestire conti correnti, risparmi, carte di credito e contanti
          in un’unica dashboard elegante e intuitiva.
        </p>
        <p className="first-account-note">
          Per iniziare, clicca sul pulsante <strong>"New Account"</strong> in alto a destra
          e crea il tuo primo conto.
        </p>
      </div>
    </div>
  );
};

export default CreateFirstAccount;
