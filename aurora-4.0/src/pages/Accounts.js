
import { useFinancial } from '../contexts/FinancialContext';
import { useAuth } from '../contexts/AuthContext';
import './Accounts.css';

const Accounts = () => {
  const { accounts, deleteAccount, updateAccount, createAccount } = useFinancial();
  const { user } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: '',
    type: 'bank',
    balance: 0,
    color: '#4f46e5'
  });

  // Verifica autenticazione quando il componente si monta
  useEffect(() => {
    console.log("🔍 Accounts - Stato utente:", user ? "Autenticato" : "Non autenticato");
    console.log("🔍 Accounts - Numero account:", accounts.length);
  }, [user, accounts]);

  const handleDelete = async (accountId, accountName) => {
    if (window.confirm(`Sei sicuro di voler eliminare "${accountName}"?`)) {
      try {
        await deleteAccount(accountId);
        alert('✅ Account eliminato con successo!');
      } catch (error) {
        alert(`❌ Errore: ${error.message}`);
      }
    }
  };

  const handleEdit = async (accountId, currentName) => {
    const newName = prompt('Inserisci il nuovo nome:', currentName);
    if (newName && newName.trim() !== '' && newName !== currentName) {
      try {
        await updateAccount(accountId, { name: newName.trim() });
        alert('✅ Account modificato con successo!');
      } catch (error) {
        alert(`❌ Errore: ${error.message}`);
      }
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    console.log("🎯 Tentativo di creare account:", newAccount);
    console.log("👤 Utente corrente:", user);
    
    if (!user) {
      alert('❌ Devi effettuare il login per creare un account');
      return;
    }
    
    if (!newAccount.name.trim()) {
      alert('Inserisci un nome per il conto');
      return;
    }

    try {
      console.log("📤 Chiamando createAccount...");
      const result = await createAccount({
        ...newAccount,
        name: newAccount.name.trim()
      });
      console.log("✅ Risultato createAccount:", result);
      
      setNewAccount({
        name: '',
        type: 'bank',
        balance: 0,
        color: '#4f46e5'
      });
      setShowAddForm(false);
      alert('✅ Account creato con successo!');
    } catch (error) {
      console.error("❌ Errore in handleCreateAccount:", error);
      alert(`❌ Errore: ${error.message}`);
    }
  };

  const accountTypes = {
    bank: '🏦 Conto Bancario',
    savings: '💰 Risparmi',
    cash: '💵 Contanti',
    credit: '💳 Carta di Credito',
    investment: '📈 Investimenti'
  };

  const getBalanceClass = (balance) => {
    return balance < 0 ? 'account-balance negative' : 'account-balance';
  };

  // Se l'utente non è autenticato, mostra un messaggio
  if (!user) {
    return (
      <div className="accounts-container">
        <div className="no-auth-message">
          <h2>Accesso Richiesto</h2>
          <p>Devi effettuare il login per gestire i tuoi conti.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="accounts-container">
      <div className="accounts-header">
        <h1>I tuoi conti</h1>
        <button 
          className="btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          + Nuovo Conto
        </button>
      </div>

      {showAddForm && (
        <form className="add-account-form" onSubmit={handleCreateAccount}>
          <h3>Crea Nuovo Conto</h3>
          <div className="form-group">
            <label>Nome del conto:</label>
            <input
              type="text"
              value={newAccount.name}
              onChange={(e) => setNewAccount({...newAccount, name: e.target.value})}
              placeholder="Es. Conto Principale"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Tipo di conto:</label>
            <select
              value={newAccount.type}
              onChange={(e) => setNewAccount({...newAccount, type: e.target.value})}
            >
              {Object.entries(accountTypes).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Saldo iniziale:</label>
            <input
              type="number"
              step="0.01"
              value={newAccount.balance}
              onChange={(e) => setNewAccount({...newAccount, balance: parseFloat(e.target.value) || 0})}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              Crea Conto
            </button>
            <button 
              type="button" 
              className="btn-secondary"
              onClick={() => setShowAddForm(false)}
            >
              Annulla
            </button>
          </div>
        </form>
      )}

      <div className="accounts-grid">
        {accounts.map(account => (
          <div key={account.id} className="account-card">
            <div 
              className="account-color" 
              style={{ backgroundColor: account.color || '#4f46e5' }}
            ></div>
            
            <div className="account-info">
              <h3>{account.name}</h3>
              <p className="account-type">{accountTypes[account.type] || 'Altro'}</p>
              <p className={getBalanceClass(account.balance)}>
                €{typeof account.balance === 'number' ? account.balance.toFixed(2) : '0.00'}
              </p>
            </div>

            <div className="account-actions">
              <button 
                className="btn-edit"
                onClick={() => handleEdit(account.id, account.name)}
              >
                ✏️ Modifica
              </button>
              <button 
                className="btn-delete"
                onClick={() => handleDelete(account.id, account.name)}
              >
                🗑️ Elimina
              </button>
            </div>
          </div>
        ))}
      </div>

      {accounts.length === 0 && (
        <div className="no-accounts">
          <p>Non hai ancora creato nessun conto.</p>
          <button 
            className="btn-primary"
            onClick={() => setShowAddForm(true)}
          >
            Crea il tuo primo conto
          </button>
        </div>
      )}
    </div>
  );
};

export default Accounts;