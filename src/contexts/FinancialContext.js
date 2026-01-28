// src/contexts/FinancialContext.js
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from 'react';

import { useAuth } from './AuthContext';
import {
  db,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  getDoc,
} from '../services/firebase';

// ✅ Export del context (utile se in qualche file lo importi)
export const FinancialContext = createContext(null);

/**
 * Sottocategorie di default per le categorie "note"
 */
const defaultSubCategoryNames = {
  expense: {
    Alimentari: ['Supermercato', 'Alimentari', 'Frutta e Verdura'],
    Trasporti: ['Benzina', 'Mezzi Pubblici', 'Taxi/Uber'],
    Casa: ['Affitto', 'Mutuo', 'Manutenzione'],
    Intrattenimento: ['Cinema', 'Teatro', 'Concerti'],
    Salute: ['Farmacia', 'Visite mediche', 'Palestra'],
    Shopping: ['Abbigliamento', 'Elettronica', 'Articoli per la casa'],
    Ristoranti: ['Pranzo', 'Cena', 'Aperitivo'],
    Bollette: ['Luce', 'Gas', 'Acqua', 'Internet'],
  },
  income: {
    Stipendio: ['Stipendio base', 'Straordinari', 'Bonus'],
    Investimenti: ['Dividendi', 'Interessi', 'Rendite'],
    Freelance: ['Consulenze', 'Progetti', 'Collaborazioni'],
    Regali: ['Compleanni', 'Festività', 'Occasioni'],
    Vendite: ['Prodotti', 'Servizi', 'Usato'],
    Bonus: ['Tredicesima', 'Premi', 'Incentivi'],
  },
};

// Costruisce oggetti sottocategoria a partire da una lista di nomi
const buildSubCategoryObjects = (names, baseColor) => {
  const color = baseColor || '#6b7280';

  return names.map((name) => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name,
    icon: '📋',
    color,
    createdAt: new Date(),
  }));
};

// ✅ Export del Provider
export const FinancialProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();

  // ================== HELPERS: SALDI CONTI ==================
  const getSignedAmount = (type, rawAmount) => {
    const base = parseFloat(rawAmount) || 0;
    if (type === 'expense') return -Math.abs(base);
    if (type === 'income') return Math.abs(base);
    return base;
  };

  /**
   * Aggiorna il saldo di un account leggendo il valore corrente da Firestore.
   * (più sicuro di usare lo state accounts, che può essere stale)
   */
  const adjustAccountBalance = useCallback(async (accountId, delta) => {
    if (!accountId) return;

    const d = parseFloat(delta) || 0;
    if (d === 0) return;

    const accountRef = doc(db, 'accounts', accountId);
    const snap = await getDoc(accountRef);

    if (!snap.exists()) {
      console.warn('⚠️ Account non trovato, impossibile aggiornare saldo:', accountId);
      return;
    }

    const current = parseFloat(snap.data().balance) || 0;
    const next = current + d;

    await updateDoc(accountRef, {
      balance: next,
      updatedAt: serverTimestamp(),
    });
  }, []);

  // ========== CREA CATEGORIE PREDEFINITE (UNA SOLA VOLTA PER UTENTE) ==========
  const createDefaultCategories = useCallback(async () => {
    if (!user) return;

    const flagKey = `defaults_created_${user.uid}`;

    if (localStorage.getItem(flagKey) === '1') {
      console.log('ℹ️ Default categories già inizializzate (localStorage), skip');
      return;
    }

    console.log('🏗️ Creazione categorie predefinite...');

    const defaultCategories = [
      // Uscite
      { name: 'Alimentari', icon: '🍕', color: '#ef4444', type: 'expense' },
      { name: 'Trasporti', icon: '🚗', color: '#3b82f6', type: 'expense' },
      { name: 'Casa', icon: '🏠', color: '#10b981', type: 'expense' },
      { name: 'Intrattenimento', icon: '🎬', color: '#8b5cf6', type: 'expense' },
      { name: 'Salute', icon: '🏥', color: '#ec4899', type: 'expense' },
      { name: 'Shopping', icon: '🛍️', color: '#f59e0b', type: 'expense' },
      // Entrate
      { name: 'Stipendio', icon: '💼', color: '#06b6d4', type: 'income' },
      { name: 'Investimenti', icon: '📈', color: '#84cc16', type: 'income' },
      { name: 'Regali', icon: '🎁', color: '#f97316', type: 'income' },
      { name: 'Freelance', icon: '💻', color: '#6366f1', type: 'income' },
    ];

    try {
      for (const category of defaultCategories) {
        await addDoc(collection(db, 'categories'), {
          ...category,
          userId: user.uid,
          createdAt: serverTimestamp(),
          subCategories: [],
        });
        console.log('✅ Categoria creata:', category.name);
      }

      localStorage.setItem(flagKey, '1');
      console.log('✅ Default categories inizializzate, flag salvato');
    } catch (error) {
      console.error('❌ Errore creazione categorie predefinite:', error);
    }
  }, [user]);

  // ========== CARICAMENTO DATI DA FIREBASE ==========
  useEffect(() => {
    if (!user) {
      setAccounts([]);
      setCategories([]);
      setTransactions([]);
      setLoading(false);
      return;
    }

    console.log('🔄 [useEffect] Inizializzazione listeners Firebase per user:', user.uid);
    setLoading(true);

    // 1) Accounts
    const accountsRef = collection(db, 'accounts');
    const accountsQuery = query(accountsRef, where('userId', '==', user.uid));
    const unsubscribeAccounts = onSnapshot(
      accountsQuery,
      (snapshot) => {
        const accountsData = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
          balance: parseFloat(docSnap.data().balance) || 0,
        }));
        console.log('📊 Accounts caricati:', accountsData.length);
        setAccounts(accountsData);
      },
      (error) => {
        console.error('❌ Errore caricamento accounts:', error);
      }
    );

    // 2) Categories
    const categoriesRef = collection(db, 'categories');
    const categoriesQuery = query(categoriesRef, where('userId', '==', user.uid));
    const unsubscribeCategories = onSnapshot(
      categoriesQuery,
      async (snapshot) => {
        console.log('📸 [onSnapshot Categories] Snapshot ricevuto');
        console.log('   - Numero documenti:', snapshot.docs.length);
        console.log('   - Snapshot vuoto?', snapshot.empty);

        if (snapshot.empty) {
          console.log('🏷️ Nessuna categoria trovata');
          await createDefaultCategories();
          return;
        }

        const updatePromises = [];

        const categoriesData = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();

          // Normalizza: subCategories deve essere sempre array di OGGETTI
          const subCategoriesRaw = data.subCategories || data.subcategories || [];
          let subCategories = subCategoriesRaw.map((sub) =>
            typeof sub === 'string'
              ? {
                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
                  name: sub,
                  icon: '📋',
                  color: data.color || '#6b7280',
                  createdAt: new Date(),
                }
              : sub
          );

          // Se non ci sono sottocategorie, aggiungi quelle di default (una volta)
          if (!subCategories.length) {
            const defaultsForType = defaultSubCategoryNames[data.type] || {};
            const defaultNames = defaultsForType[data.name];

            if (defaultNames && defaultNames.length) {
              subCategories = buildSubCategoryObjects(defaultNames, data.color);

              updatePromises.push(
                updateDoc(doc(db, 'categories', docSnap.id), {
                  subCategories,
                  updatedAt: serverTimestamp(),
                }).catch((err) => {
                  console.error(
                    '❌ Errore aggiornando sottocategorie di default per',
                    data.name,
                    err
                  );
                })
              );
            }
          }

          return {
            id: docSnap.id,
            ...data,
            subCategories,
          };
        });

        if (updatePromises.length) {
          console.log('✨ Aggiunta sottocategorie di default a', updatePromises.length, 'categorie');
          try {
            await Promise.all(updatePromises);
          } catch {
            // errori già loggati
          }
        }

        console.log('🏷️ Categories caricate:', categoriesData.length);
        setCategories(categoriesData);
      },
      (error) => {
        console.error('❌ Errore caricamento categories:', error);
      }
    );

    // 3) Transactions
    const transactionsRef = collection(db, 'transactions');
    const transactionsQuery = query(transactionsRef, where('userId', '==', user.uid));
    const unsubscribeTransactions = onSnapshot(
      transactionsQuery,
      (snapshot) => {
        const transactionsData = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();

          let dateValue = new Date();
          if (data.date) {
            if (typeof data.date.toDate === 'function') {
              dateValue = data.date.toDate();
            } else {
              const parsed = new Date(data.date);
              if (!isNaN(parsed.getTime())) dateValue = parsed;
            }
          }

          return {
            id: docSnap.id,
            ...data,
            amount:
              typeof data.amount === 'string'
                ? parseFloat(data.amount) || 0
                : data.amount || 0,
            date: dateValue,
          };
        });

        transactionsData.sort((a, b) => b.date - a.date);

        console.log('💰 Transactions caricate:', transactionsData.length);
        setTransactions(transactionsData);
        setLoading(false);
      },
      (error) => {
        console.error('❌ Errore caricamento transactions:', error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeAccounts();
      unsubscribeCategories();
      unsubscribeTransactions();
    };
  }, [user, createDefaultCategories]);

  // ========== FUNZIONI ACCOUNTS ==========
  const createAccount = async (accountData) => {
    if (!user) throw new Error('❌ Utente non autenticato');

    const newAccount = {
      ...accountData,
      userId: user.uid,
      createdAt: serverTimestamp(),
      balance: parseFloat(accountData.balance) || 0,
    };

    const docRef = await addDoc(collection(db, 'accounts'), newAccount);
    return { id: docRef.id, ...newAccount };
  };

  const updateAccount = async (accountId, updates) => {
    if (!user) throw new Error('❌ Utente non autenticato');

    const patched = { ...updates };
    if (patched.balance !== undefined) patched.balance = parseFloat(patched.balance) || 0;

    await updateDoc(doc(db, 'accounts', accountId), {
      ...patched,
      updatedAt: serverTimestamp(),
    });
  };

  const deleteAccount = async (accountId) => {
    if (!user) throw new Error('❌ Utente non autenticato');

    const accountTransactions = transactions.filter((t) => t.accountId === accountId);
    if (accountTransactions.length > 0) {
      throw new Error(`❌ Impossibile eliminare: ${accountTransactions.length} transazioni associate`);
    }

    await deleteDoc(doc(db, 'accounts', accountId));
  };

  // ========== FUNZIONI TRANSACTIONS ==========
  const createTransaction = async (transactionData) => {
    if (!user) throw new Error('❌ Utente non autenticato');

    const amount = getSignedAmount(transactionData.type, transactionData.amount);

    const newTransaction = {
      ...transactionData,
      userId: user.uid,
      date: new Date(transactionData.date),
      amount,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'transactions'), newTransaction);

    // Aggiorna saldo conto
    if (transactionData.accountId) {
      await adjustAccountBalance(transactionData.accountId, amount);
    }

    return { id: docRef.id, ...newTransaction };
  };

  const updateTransaction = async (transactionId, updates) => {
    if (!user) throw new Error('❌ Utente non autenticato');

    const transactionRef = doc(db, 'transactions', transactionId);
    const snap = await getDoc(transactionRef);
    if (!snap.exists()) throw new Error('❌ Transazione non trovata');

    const old = snap.data();

    const oldAccountId = old.accountId || null;
    const oldType = old.type || 'expense';
    const oldAmount =
      typeof old.amount === 'string' ? parseFloat(old.amount) || 0 : old.amount || 0;

    const newAccountId = updates.accountId !== undefined ? updates.accountId : oldAccountId;
    const newType = updates.type !== undefined ? updates.type : oldType;

    let newAmount = oldAmount;

    if (updates.amount !== undefined) {
      newAmount = getSignedAmount(newType, updates.amount);
    } else if (updates.type !== undefined && updates.type !== oldType) {
      newAmount = getSignedAmount(newType, Math.abs(oldAmount));
    }

    const patched = { ...updates };

    if (patched.date) patched.date = new Date(patched.date);
    patched.type = newType;
    patched.amount = newAmount;
    patched.accountId = newAccountId;

    await updateDoc(transactionRef, {
      ...patched,
      updatedAt: serverTimestamp(),
    });

    // Aggiorna saldi: stornare vecchio importo e applicare il nuovo
    if (oldAccountId && newAccountId && oldAccountId === newAccountId) {
      const delta = newAmount - oldAmount;
      await adjustAccountBalance(oldAccountId, delta);
    } else {
      if (oldAccountId) await adjustAccountBalance(oldAccountId, -oldAmount);
      if (newAccountId) await adjustAccountBalance(newAccountId, newAmount);
    }
  };

  const deleteTransaction = async (transactionId) => {
    if (!user) throw new Error('❌ Utente non autenticato');

    const transactionRef = doc(db, 'transactions', transactionId);
    const snap = await getDoc(transactionRef);

    if (!snap.exists()) throw new Error('❌ Transazione non trovata');

    const t = snap.data();
    const accountId = t.accountId || null;
    const amount = typeof t.amount === 'string' ? parseFloat(t.amount) || 0 : t.amount || 0;

    await deleteDoc(transactionRef);

    if (accountId) {
      await adjustAccountBalance(accountId, -amount);
    }
  };

  // ========== FUNZIONI CATEGORIES ==========
  const addCategory = async (categoryData) => {
    if (!user) throw new Error('❌ Utente non autenticato');

    const newCategory = {
      ...categoryData,
      userId: user.uid,
      createdAt: serverTimestamp(),
      subCategories: categoryData.subCategories || [],
    };

    const docRef = await addDoc(collection(db, 'categories'), newCategory);
    return { id: docRef.id, ...newCategory };
  };

  const updateCategory = async (categoryId, updates) => {
    if (!user) throw new Error('❌ Utente non autenticato');

    await updateDoc(doc(db, 'categories', categoryId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  };

  const deleteCategory = async (categoryId) => {
    if (!user) throw new Error('Utente non autenticato');
    if (!categoryId) throw new Error('ID categoria non valido o mancante');

    const categoryRef = doc(db, 'categories', categoryId);
    const categorySnap = await getDoc(categoryRef);

    if (!categorySnap.exists()) throw new Error('Categoria non trovata nel database');

    const categoryData = categorySnap.data();
    if (categoryData.userId !== user.uid) {
      throw new Error('Non hai i permessi per eliminare questa categoria');
    }

    await deleteDoc(categoryRef);
  };

  // ========== FUNZIONI SOTTOCATEGORIE ==========
  const addSubCategory = async (categoryId, subCategoryData) => {
    if (!user) throw new Error('❌ Utente non autenticato');

    const categoryRef = doc(db, 'categories', categoryId);
    const categoryDoc = await getDoc(categoryRef);
    if (!categoryDoc.exists()) throw new Error('❌ Categoria non trovata');

    const currentSubCategories = categoryDoc.data().subCategories || [];
    const updatedSubCategories = [
      ...currentSubCategories,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        name: subCategoryData.name,
        icon: subCategoryData.icon || '📋',
        color: subCategoryData.color || '#6b7280',
        createdAt: new Date(),
      },
    ];

    await updateDoc(categoryRef, {
      subCategories: updatedSubCategories,
      updatedAt: serverTimestamp(),
    });
  };

  const removeSubCategory = async (categoryId, subCategoryId) => {
    if (!user) throw new Error('❌ Utente non autenticato');

    const categoryRef = doc(db, 'categories', categoryId);
    const categoryDoc = await getDoc(categoryRef);
    if (!categoryDoc.exists()) throw new Error('❌ Categoria non trovata');

    const currentSubCategories = categoryDoc.data().subCategories || [];
    const updatedSubCategories = currentSubCategories.filter((sub) => sub.id !== subCategoryId);

    await updateDoc(categoryRef, {
      subCategories: updatedSubCategories,
      updatedAt: serverTimestamp(),
    });
  };

  const value = {
    transactions,
    accounts,
    categories,
    loading,

    createAccount,
    updateAccount,
    deleteAccount,

    createTransaction,
    updateTransaction,
    deleteTransaction,

    addCategory,
    updateCategory,
    deleteCategory,

    addSubCategory,
    removeSubCategory,
  };

  return (
    <FinancialContext.Provider value={value}>
      {children}
    </FinancialContext.Provider>
  );
};

// ✅ Export dell'hook
export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (!context) throw new Error('useFinancial deve essere usato dentro FinancialProvider');
  return context;
};

// ✅ (opzionale) default export per compatibilità con eventuali import vecchi
export default FinancialProvider;
