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

const UPDATE_TIMEOUT_MS = 12000;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const withTimeout = async (promise, ms) => {
  let timeoutId = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const err = new Error(`Timeout updateTransaction dopo ${ms}ms`);
      err.code = 'deadline-exceeded';
      reject(err);
    }, ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};
const isRetryableError = (error) => {
  const code = String(error?.code || '').toLowerCase();
  const msg = String(error?.message || '').toLowerCase();
  return (
    code.includes('unavailable') ||
    code.includes('deadline-exceeded') ||
    code.includes('aborted') ||
    code.includes('resource-exhausted') ||
    msg.includes('network') ||
    msg.includes('failed to fetch')
  );
};
const normalizeUpdateData = (data = {}) => {
  const next = { ...data };
  if (Object.prototype.hasOwnProperty.call(next, 'amount')) {
    const n = Number(next.amount);
    if (!Number.isFinite(n)) {
      const err = new Error('Importo non valido');
      err.code = 'invalid-argument';
      throw err;
    }
    next.amount = n;
  }
  if (Object.prototype.hasOwnProperty.call(next, 'date')) {
    const d = next.date instanceof Date ? next.date : new Date(next.date);
    if (Number.isNaN(d.getTime())) {
      const err = new Error('Data non valida');
      err.code = 'invalid-argument';
      throw err;
    }
    next.date = d;
  }
  if (typeof next.description === 'string') {
    next.description = next.description.trim().slice(0, 240);
  }
  return next;
};

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
    if (!userId) {
      const err = new Error('userId mancante');
      err.httpStatus = 401;
      throw err;
    }
    if (!transactionId) {
      const err = new Error('transactionId mancante');
      err.httpStatus = 422;
      throw err;
    }
    try {
      const payload = normalizeUpdateData(updateData);
      const txRef = doc(db, "users", userId, "transactions", transactionId);
      const maxRetries = 1;
      for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        try {
          await withTimeout(updateDoc(txRef, payload), UPDATE_TIMEOUT_MS);
          return;
        } catch (error) {
          if (attempt < maxRetries && isRetryableError(error)) {
            console.warn('[firebase.transactionsService.updateTransaction] retry', {
              txId: transactionId,
              attempt: attempt + 1,
              code: error?.code || null
            });
            await wait(300 * (attempt + 1));
            continue;
          }
          throw error;
        }
      }
    } catch (error) {
      const code = String(error?.code || '').toLowerCase();
      const httpStatus = code.includes('unauthenticated')
        ? 401
        : code.includes('permission-denied')
        ? 403
        : (code.includes('invalid-argument') || code.includes('failed-precondition'))
        ? 422
        : 500;
      console.error('[firebase.transactionsService.updateTransaction] failed', {
        txId: transactionId,
        code: error?.code || null,
        httpStatus
      });
      error.httpStatus = httpStatus;
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
