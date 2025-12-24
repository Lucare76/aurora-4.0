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

const FinancialContext = createContext();

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

export const FinancialProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // ========== CREA CATEGORIE PREDEFINITE (UNA SOLA VOLTA PER UTENTE) ==========
  const createDefaultCategories = useCallback(async () => {
    if (!user) return;

    const flagKey = `defaults_created_${user.uid}`;

    // Se già create su questo browser, non ricreare
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
          subCategories: [], // coerente (array di oggetti, ma vuoto va bene)
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

    // 1. Accounts
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

    // 2. Categories
    const categoriesRef = collection(db, 'categories');
    const categoriesQuery = query(categoriesRef, where('userId', '==', user.uid));

    const unsubscribeCategories = onSnapshot(
      categoriesQuery,
      async (snapshot) => {
        console.log('📸 [onSnapshot Categories] Snapshot ricevuto');
        console.log('   - Numero documenti:', snapshot.docs.length);
        console.log('   - Snapshot vuoto?', snapshot.empty);

        // Se non ci sono categorie, inizializza solo se NON è già stato fatto
        if (snapshot.empty) {
          console.log('🏷️ Nessuna categoria trovata');
          await createDefaultCategories();
          return;
        }

        const updatePromises = [];

        const categoriesData = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();

          // Normalizza: subCategories deve essere sempre array di OGGETTI
          let subCategoriesRaw = data.subCategories || data.subcategories || [];
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
                  console.error('❌ Errore aggiornando sottocategorie di default per', data.name, err);
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

    // 3. Transactions
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
              if (!isNaN(parsed.getTime())) {
                dateValue = parsed;
              }
            }
          }

          return {
            id: docSnap.id,
            ...data,
            amount: typeof data.amount === 'string' ? parseFloat(data.amount) || 0 : data.amount || 0,
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

    const baseAmount = parseFloat(transactionData.amount) || 0;

    let amount = baseAmount;
    if (transactionData.type === 'expense') amount = -Math.abs(baseAmount);
    else if (transactionData.type === 'income') amount = Math.abs(baseAmount);

    const newTransaction = {
      ...transactionData,
      userId: user.uid,
      date: new Date(transactionData.date),
      amount,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'transactions'), newTransaction);

    if (transactionData.accountId) {
      const account = accounts.find((acc) => acc.id === transactionData.accountId);
      if (account) {
        const newBalance = (parseFloat(account.balance) || 0) + amount;
        await updateAccount(account.id, { balance: newBalance });
      }
    }

    return { id: docRef.id, ...newTransaction };
  };

  const updateTransaction = async (transactionId, updates) => {
    if (!user) throw new Error('❌ Utente non autenticato');

    const patched = { ...updates };

    if (patched.amount !== undefined && patched.type) {
      const baseAmount = parseFloat(patched.amount) || 0;
      patched.amount = patched.type === 'expense' ? -Math.abs(baseAmount) : Math.abs(baseAmount);
    }

    if (patched.date) patched.date = new Date(patched.date);

    await updateDoc(doc(db, 'transactions', transactionId), {
      ...patched,
      updatedAt: serverTimestamp(),
    });
  };

  const deleteTransaction = async (transactionId) => {
    if (!user) throw new Error('❌ Utente non autenticato');

    const transactionToDelete = transactions.find((t) => t.id === transactionId);
    if (!transactionToDelete) throw new Error('❌ Transazione non trovata');

    await deleteDoc(doc(db, 'transactions', transactionId));
  };

  // ========== FUNZIONI CATEGORIES ==========
  const addCategory = async (categoryData) => {
    if (!user) throw new Error('❌ Utente non autenticato');

    const newCategory = {
      ...categoryData,
      userId: user.uid,
      createdAt: serverTimestamp(),
      // subCategories sempre array di OGGETTI
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
    if (categoryData.userId !== user.uid) throw new Error('Non hai i permessi per eliminare questa categoria');

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

  return <FinancialContext.Provider value={value}>{children}</FinancialContext.Provider>;
};

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (!context) throw new Error('useFinancial deve essere usato dentro FinancialProvider');
  return context;
};
