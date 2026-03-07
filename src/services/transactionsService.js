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
  if (typeof next.currency === 'string') {
    next.currency = next.currency.trim().toUpperCase().slice(0, 5);
  }
  return next;
};

const mapUpdateError = (error) => {
  const code = String(error?.code || '').toLowerCase();
  const mapped = new Error(error?.message || 'Errore aggiornamento transazione');
  mapped.originalCode = code || null;
  if (code.includes('unauthenticated')) {
    mapped.httpStatus = 401;
    mapped.message = 'Sessione scaduta. Effettua di nuovo il login.';
    return mapped;
  }
  if (code.includes('permission-denied')) {
    mapped.httpStatus = 403;
    mapped.message = 'Permessi insufficienti per aggiornare la transazione.';
    return mapped;
  }
  if (code.includes('invalid-argument') || code.includes('failed-precondition')) {
    mapped.httpStatus = 422;
    mapped.message = 'Payload update non valido.';
    return mapped;
  }
  mapped.httpStatus = 500;
  return mapped;
};

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
      const transactionRef = doc(db, 'users', userId, 'transactions', transactionId);
      const normalized = normalizeUpdateData(updateData);
      const payload = { ...normalized, updatedAt: serverTimestamp() };
      const maxRetries = 1;
      for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        try {
          await withTimeout(updateDoc(transactionRef, payload), UPDATE_TIMEOUT_MS);
          return;
        } catch (error) {
          if (attempt < maxRetries && isRetryableError(error)) {
            console.warn('[transactionsService.updateTransaction] retry', {
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
      const mapped = mapUpdateError(error);
      console.error('[transactionsService.updateTransaction] failed', {
        txId: transactionId,
        code: mapped.originalCode || null,
        httpStatus: mapped.httpStatus || 500
      });
      throw mapped;
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
