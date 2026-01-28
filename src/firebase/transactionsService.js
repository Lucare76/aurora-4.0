import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  deleteDoc,
  increment
} from 'firebase/firestore';
import { db } from '../firebase/config';

// SERVICIO PER GLI ACCOUNT
export const accountsService = {
  // Crea un nuovo account
  createAccount: async (userId, accountData) => {
    try {
      console.log("🔥 Firebase - Creazione account per user:", userId);
      console.log("📊 Dati account:", accountData);
      
      const accountDataWithTimestamp = {
        ...accountData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log("📤 Invio a Firebase...");
      const docRef = await addDoc(collection(db, "users", userId, "accounts"), accountDataWithTimestamp);
      
      console.log("✅ Firebase - Account creato con ID:", docRef.id);
      
      return { 
        id: docRef.id, 
        ...accountData 
      };
    } catch (error) {
      console.error("❌ Firebase - Errore creazione account:", error);
      throw error;
    }
  },

  // Recupera tutti gli account dell'utente
  getAccounts: async (userId) => {
    try {
      console.log("🔥 Firebase - Recupero account per user:", userId);
      const q = query(
        collection(db, "users", userId, "accounts"),
        orderBy('createdAt', 'asc')
      );
      const querySnapshot = await getDocs(q);
      const accounts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log("✅ Firebase - Account recuperati:", accounts.length);
      return accounts;
    } catch (error) {
      console.error("❌ Firebase - Errore recupero account:", error);
      throw error;
    }
  },

  // ELIMINA UN ACCOUNT
  deleteAccount: async (userId, accountId) => {
    try {
      await deleteDoc(doc(db, "users", userId, "accounts", accountId));
    } catch (error) {
      console.error("Errore eliminazione account:", error);
      throw error;
    }
  },

  // MODIFICA UN ACCOUNT
  updateAccount: async (userId, accountId, updateData) => {
    try {
      await updateDoc(doc(db, "users", userId, "accounts", accountId), {
        ...updateData,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error("Errore modifica account:", error);
      throw error;
    }
  }
};

// SERVICIO PER LE TRANSAZIONI
export const transactionsService = {
  // Crea una nuova transazione
  createTransaction: async (userId, transactionData) => {
    try {
      const docRef = await addDoc(collection(db, "users", userId, "transactions"), {
        ...transactionData,
        createdAt: new Date(),
        date: transactionData.date || new Date()
      });
      return { id: docRef.id, ...transactionData };
    } catch (error) {
      console.error("Errore creazione transazione:", error);
      throw error;
    }
  },

  // Recupera tutte le transazioni dell'utente
  getTransactions: async (userId) => {
    try {
      const q = query(
        collection(db, "users", userId, "transactions"),
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Errore recupero transazioni:", error);
      throw error;
    }
  },

  // ELIMINA UNA TRANSAZIONE
  deleteTransaction: async (userId, transactionId) => {
    try {
      await deleteDoc(doc(db, "users", userId, "transactions", transactionId));
    } catch (error) {
      console.error("Errore eliminazione transazione:", error);
      throw error;
    }
  },

  // MODIFICA UNA TRANSAZIONE
  updateTransaction: async (userId, transactionId, updateData) => {
    try {
      await updateDoc(doc(db, "users", userId, "transactions", transactionId), updateData);
    } catch (error) {
      console.error("Errore modifica transazione:", error);
      throw error;
    }
  }
};

// SERVICIO PER LE CATEGORIE
export const categoriesService = {
  // Crea categorie predefinite
  createDefaultCategories: async (userId) => {
    const defaultCategories = [
      { name: 'Spesa', type: 'expense', color: '#ef4444' },
      { name: 'Bollette', type: 'expense', color: '#f59e0b' },
      { name: 'Trasporti', type: 'expense', color: '#84cc16' },
      { name: 'Salute', type: 'expense', color: '#06b6d4' },
      { name: 'Divertimento', type: 'expense', color: '#8b5cf6' },
      { name: 'Stipendio', type: 'income', color: '#10b981' },
      { name: 'Investimenti', type: 'income', color: '#6366f1' },
      { name: 'Regali', type: 'income', color: '#ec4899' }
    ];

    try {
      for (const category of defaultCategories) {
        await addDoc(collection(db, "users", userId, "categories"), {
          ...category,
          createdAt: new Date()
        });
      }
    } catch (error) {
      console.error("Errore creazione categorie predefinite:", error);
      throw error;
    }
  },

  // Recupera tutte le categorie dell'utente
  getCategories: async (userId) => {
    try {
      const q = query(collection(db, "users", userId, "categories"));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Errore recupero categorie:", error);
      throw error;
    }
  }
};

// FUNZIONE PER AGGIORNARE IL SALDO DEL CONTO
export const updateAccountBalance = async (userId, accountId, amount, transactionType) => {
  try {
    const accountRef = doc(db, "users", userId, "accounts", accountId);
    
    // Determina se aggiungere o sottrarre in base al tipo di transazione
    let adjustment = amount;
    if (transactionType === 'expense') {
      adjustment = -amount;
    } else if (transactionType === 'transfer') {
      // Per i trasferimenti, amount può essere positivo o negativo
      adjustment = amount;
    }
    // Per 'income' usiamo amount positivo
    
    await updateDoc(accountRef, {
      balance: increment(adjustment),
      updatedAt: new Date()
    });
    
  } catch (error) {
    console.error("Errore aggiornamento saldo:", error);
    throw error;
  }
};