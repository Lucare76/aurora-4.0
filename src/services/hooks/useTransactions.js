import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  increment 
} from 'firebase/firestore';
import { db } from './firebase';

// ==================== SERVIZIO TRANSAZIONI ====================

export const transactionsService = {
  // Crea una nuova transazione
  async createTransaction(userId, transactionData) {
    try {
      console.log("📝 Creazione transazione per userId:", userId);
      console.log("📝 Dati transazione:", transactionData);
      
      const transactionsRef = collection(db, 'users', userId, 'transactions');
      
      const transactionWithMetadata = {
        ...transactionData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log("📝 Tentativo di salvataggio su Firestore...");
      const docRef = await addDoc(transactionsRef, transactionWithMetadata);
      console.log("✅ Transazione creata con ID:", docRef.id);
      
      return {
        id: docRef.id,
        ...transactionWithMetadata
      };
    } catch (error) {
      console.error("❌ Errore nella creazione della transazione:", error);
      throw error;
    }
  },

  // Ottiene tutte le transazioni di un utente
  async getTransactions(userId) {
    try {
      const transactionsRef = collection(db, 'users', userId, 'transactions');
      const q = query(
        transactionsRef, 
        where('deleted', '!=', true),
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Errore nel recupero delle transazioni:", error);
      throw error;
    }
  },

  // Elimina una transazione
  async deleteTransaction(userId, transactionId) {
    try {
      const transactionRef = doc(db, 'users', userId, 'transactions', transactionId);
      await deleteDoc(transactionRef);
      console.log("✅ Transazione eliminata definitivamente");
    } catch (error) {
      console.error("Errore nell'eliminazione della transazione:", error);
      throw error;
    }
  },

  // Aggiorna una transazione
  async updateTransaction(userId, transactionId, updateData) {
    try {
      const transactionRef = doc(db, 'users', userId, 'transactions', transactionId);
      await updateDoc(transactionRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      console.log("✅ Transazione aggiornata con successo");
    } catch (error) {
      console.error("Errore nell'aggiornamento della transazione:", error);
      throw error;
    }
  }
};

// ==================== SERVIZIO CONTI ====================

export const accountsService = {
  // Crea un nuovo conto
  async createAccount(userId, accountData) {
    try {
      console.log("🏦 Creazione conto per userId:", userId);
      
      const accountsRef = collection(db, 'users', userId, 'accounts');
      
      const accountWithMetadata = {
        ...accountData,
        balance: accountData.initialBalance || 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(accountsRef, accountWithMetadata);
      
      return {
        id: docRef.id,
        ...accountWithMetadata
      };
    } catch (error) {
      console.error("Errore nella creazione del conto:", error);
      throw error;
    }
  },

  // Ottiene tutti i conti di un utente
  async getAccounts(userId) {
    try {
      const accountsRef = collection(db, 'users', userId, 'accounts');
      const querySnapshot = await getDocs(accountsRef);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Errore nel recupero dei conti:", error);
      throw error;
    }
  },

  // Aggiorna il saldo di un conto
  async updateAccountBalance(userId, accountId, amount, type) {
    try {
      console.log("💰 Aggiornamento saldo:", { accountId, amount, type });
      
      const accountRef = doc(db, 'users', userId, 'accounts', accountId);
      
      await updateDoc(accountRef, {
        balance: increment(amount),
        updatedAt: serverTimestamp()
      });
      
      console.log("✅ Saldo aggiornato con successo");
    } catch (error) {
      console.error("Errore nell'aggiornamento del saldo:", error);
      throw error;
    }
  },

  // Elimina un conto
  async deleteAccount(userId, accountId) {
    try {
      const accountRef = doc(db, 'users', userId, 'accounts', accountId);
      await deleteDoc(accountRef);
      console.log("✅ Conto eliminato con successo");
    } catch (error) {
      console.error("Errore nell'eliminazione del conto:", error);
      throw error;
    }
  },

  // Aggiorna un conto
  async updateAccount(userId, accountId, updateData) {
    try {
      const accountRef = doc(db, 'users', userId, 'accounts', accountId);
      await updateDoc(accountRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      console.log("✅ Conto aggiornato con successo");
    } catch (error) {
      console.error("Errore nell'aggiornamento del conto:", error);
      throw error;
    }
  }
};

// ==================== SERVIZIO CATEGORIE ====================

export const categoriesService = {
  // Crea categorie predefinite per un nuovo utente
  async createDefaultCategories(userId) {
    const defaultCategories = [
      // Uscite
      { name: 'Affitto/Mutuo', type: 'expense', color: '#ef4444', icon: '🏠' },
      { name: 'Bollette', type: 'expense', color: '#f59e0b', icon: '💡' },
      { name: 'Spesa', type: 'expense', color: '#10b981', icon: '🛒' },
      { name: 'Trasporti', type: 'expense', color: '#3b82f6', icon: '🚗' },
      { name: 'Salute', type: 'expense', color: '#8b5cf6', icon: '🏥' },
      { name: 'Svago', type: 'expense', color: '#ec4899', icon: '🎬' },
      
      // Entrate
      { name: 'Stipendio', type: 'income', color: '#10b981', icon: '💼' },
      { name: 'Freelance', type: 'income', color: '#06b6d4', icon: '💻' },
      { name: 'Investimenti', type: 'income', color: '#f59e0b', icon: '📈' },
      { name: 'Regali', type: 'income', color: '#ec4899', icon: '🎁' }
    ];

    try {
      const categoriesRef = collection(db, 'users', userId, 'categories');
      
      for (const category of defaultCategories) {
        await addDoc(categoriesRef, {
          ...category,
          createdAt: serverTimestamp()
        });
      }
      
      console.log("✅ Categorie predefinite create");
    } catch (error) {
      console.error("Errore nella creazione delle categorie predefinite:", error);
      throw error;
    }
  },

  // Ottiene tutte le categorie di un utente
  async getCategories(userId) {
    try {
      const categoriesRef = collection(db, 'users', userId, 'categories');
      const querySnapshot = await getDocs(categoriesRef);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Errore nel recupero delle categorie:", error);
      throw error;
    }
  }
};

// ==================== FUNZIONE AGGIORNAMENTO SALDI ====================

export const updateAccountBalance = async (userId, accountId, amount, type) => {
  try {
    await accountsService.updateAccountBalance(userId, accountId, amount, type);
  } catch (error) {
    console.error("Errore nell'aggiornamento del saldo:", error);
    throw error;
  }
};