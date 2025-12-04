// src/contexts/FinancialContext.js - VERSIONE CORRETTA
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
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
  getDoc
} from '../services/firebase';

const FinancialContext = createContext();

export const FinancialProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // ========== CREA CATEGORIE PREDEFINITE ==========
  const createDefaultCategories = useCallback(async () => {
    if (!user) return;
    
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
      { name: 'Freelance', icon: '💻', color: '#6366f1', type: 'income' }
    ];

    for (const category of defaultCategories) {
      try {
        await addDoc(collection(db, 'categories'), {
          ...category,
          userId: user.uid,
          createdAt: serverTimestamp(),
          subCategories: []
        });
        console.log('✅ Categoria creata:', category.name);
      } catch (error) {
        console.error('❌ Errore creazione categoria:', category.name, error);
      }
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

    setLoading(true);

    // 1. Carica Accounts
    const accountsRef = collection(db, 'accounts');
    const accountsQuery = query(accountsRef, where('userId', '==', user.uid));
    const unsubscribeAccounts = onSnapshot(accountsQuery, (snapshot) => {
      const accountsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        balance: parseFloat(doc.data().balance) || 0
      }));
      console.log('📊 Accounts caricati:', accountsData.length);
      setAccounts(accountsData);
    });

    // 2. Carica Categories
    const categoriesRef = collection(db, 'categories');
    const categoriesQuery = query(categoriesRef, where('userId', '==', user.uid));
    const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
      if (snapshot.empty) {
        console.log('🏷️ Nessuna categoria trovata, creo quelle predefinite');
        createDefaultCategories();
      } else {
        const categoriesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          subCategories: doc.data().subCategories || []
        }));
        console.log('🏷️ Categories caricate:', categoriesData.length);
        setCategories(categoriesData);
      }
    });

    // 3. Carica Transactions
    const transactionsRef = collection(db, 'transactions');
    const transactionsQuery = query(
      transactionsRef, 
      where('userId', '==', user.uid)
    );
    
    const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      const transactionsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          amount: typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount || 0,
          date: data.date?.toDate() || new Date(data.date) || new Date()
        };
      });
      
      transactionsData.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      console.log('💰 Transactions caricate:', transactionsData.length);
      setTransactions(transactionsData);
      setLoading(false);
    });

    return () => {
      unsubscribeAccounts();
      unsubscribeCategories();
      unsubscribeTransactions();
    };
  }, [user, createDefaultCategories]); // Aggiunto createDefaultCategories

  // ========== FUNZIONI ACCOUNTS ==========
  const createAccount = async (accountData) => {
    console.log('🎯 Creazione account:', accountData);
    
    if (!user) throw new Error('❌ Utente non autenticato');
    
    const newAccount = {
      ...accountData,
      userId: user.uid,
      createdAt: serverTimestamp(),
      balance: parseFloat(accountData.balance) || 0
    };
    
    const docRef = await addDoc(collection(db, 'accounts'), newAccount);
    console.log('✅ Account creato con ID:', docRef.id);
    
    return { id: docRef.id, ...newAccount };
  };

  const updateAccount = async (accountId, updates) => {
    console.log('✏️ Aggiornamento account:', accountId, updates);
    
    if (!user) throw new Error('❌ Utente non autenticato');
    
    if (updates.balance !== undefined) {
      updates.balance = parseFloat(updates.balance) || 0;
    }
    
    await updateDoc(doc(db, 'accounts', accountId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Account aggiornato');
  };

  const deleteAccount = async (accountId) => {
    console.log('🗑️ Eliminazione account:', accountId);
    
    if (!user) throw new Error('❌ Utente non autenticato');
    
    const accountTransactions = transactions.filter(
      t => t.accountId === accountId
    );
    
    if (accountTransactions.length > 0) {
      throw new Error(`❌ Impossibile eliminare: ${accountTransactions.length} transazioni associate`);
    }
    
    await deleteDoc(doc(db, 'accounts', accountId));
    console.log('✅ Account eliminato');
  };

  // ========== FUNZIONI TRANSACTIONS ==========
  const createTransaction = async (transactionData) => {
    console.log('🎯 Creazione transazione:', transactionData);
    
    if (!user) throw new Error('❌ Utente non autenticato');
    
    const amount = transactionData.type === 'expense' 
      ? -Math.abs(parseFloat(transactionData.amount) || 0)
      : Math.abs(parseFloat(transactionData.amount) || 0);
    
    const newTransaction = {
      ...transactionData,
      userId: user.uid,
      date: new Date(transactionData.date),
      amount: amount,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'transactions'), newTransaction);
    console.log('✅ Transazione creata con ID:', docRef.id);
    
    if (transactionData.accountId) {
      const account = accounts.find(acc => acc.id === transactionData.accountId);
      if (account) {
        const newBalance = (parseFloat(account.balance) || 0) + amount;
        console.log('💰 Aggiornamento saldo account:', account.name, 'da', account.balance, 'a', newBalance);
        await updateAccount(account.id, { balance: newBalance });
      }
    }
    
    return { id: docRef.id, ...newTransaction };
  };

  const updateTransaction = async (transactionId, updates) => {
    console.log('✏️ Aggiornamento transazione:', transactionId, updates);
    
    if (!user) throw new Error('❌ Utente non autenticato');
    
    if (updates.amount !== undefined) {
      const amount = updates.type === 'expense' 
        ? -Math.abs(parseFloat(updates.amount) || 0)
        : Math.abs(parseFloat(updates.amount) || 0);
      updates.amount = amount;
    }
    
    if (updates.date) {
      updates.date = new Date(updates.date);
    }
    
    await updateDoc(doc(db, 'transactions', transactionId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Transazione aggiornata');
  };

  const deleteTransaction = async (transactionId) => {
    console.log('🗑️ Eliminazione transazione:', transactionId);
    
    if (!user) throw new Error('❌ Utente non autenticato');
    
    const transactionToDelete = transactions.find(t => t.id === transactionId);
    if (!transactionToDelete) {
      throw new Error('❌ Transazione non trovata');
    }
    
    await deleteDoc(doc(db, 'transactions', transactionId));
    console.log('✅ Transazione eliminata');
  };

  // ========== FUNZIONI CATEGORIES ==========
  const addCategory = async (categoryData) => {
    console.log('🏷️ Aggiunta categoria:', categoryData);
    
    if (!user) throw new Error('❌ Utente non autenticato');
    
    const newCategory = {
      ...categoryData,
      userId: user.uid,
      createdAt: serverTimestamp(),
      subCategories: categoryData.subCategories || []
    };
    
    const docRef = await addDoc(collection(db, 'categories'), newCategory);
    console.log('✅ Categoria aggiunta con ID:', docRef.id);
    
    return { id: docRef.id, ...newCategory };
  };

  const updateCategory = async (categoryId, updates) => {
    console.log('✏️ Aggiornamento categoria:', categoryId, updates);
    
    if (!user) throw new Error('❌ Utente non autenticato');
    
    await updateDoc(doc(db, 'categories', categoryId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Categoria aggiornata');
  };

  const deleteCategory = async (categoryId) => {
    console.log('🗑️ Eliminazione categoria:', categoryId);
    
    if (!user) throw new Error('❌ Utente non autenticato');
    
    const categoryTransactions = transactions.filter(t => t.category === categoryId);
    
    if (categoryTransactions.length > 0) {
      throw new Error(`❌ Impossibile eliminare: ${categoryTransactions.length} transazioni associate`);
    }
    
    await deleteDoc(doc(db, 'categories', categoryId));
    console.log('✅ Categoria eliminata');
  };

  // ========== FUNZIONI SOTTOCATEGORIE ==========
  const addSubCategory = async (categoryId, subCategoryData) => {
    console.log('➕ Aggiunta sottocategoria:', categoryId, subCategoryData);
    
    if (!user) throw new Error('❌ Utente non autenticato');
    
    const categoryRef = doc(db, 'categories', categoryId);
    const categoryDoc = await getDoc(categoryRef);
    
    if (!categoryDoc.exists()) {
      throw new Error('❌ Categoria non trovata');
    }
    
    const currentSubCategories = categoryDoc.data().subCategories || [];
    const updatedSubCategories = [...currentSubCategories, {
      id: Date.now().toString(),
      name: subCategoryData.name,
      icon: subCategoryData.icon || '📋',
      color: subCategoryData.color || '#6b7280',
      createdAt: new Date()
    }];
    
    await updateDoc(categoryRef, {
      subCategories: updatedSubCategories,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Sottocategoria aggiunta');
  };

  const removeSubCategory = async (categoryId, subCategoryId) => {
    console.log('➖ Rimozione sottocategoria:', categoryId, subCategoryId);
    
    if (!user) throw new Error('❌ Utente non autenticato');
    
    const categoryRef = doc(db, 'categories', categoryId);
    const categoryDoc = await getDoc(categoryRef);
    
    if (!categoryDoc.exists()) {
      throw new Error('❌ Categoria non trovata');
    }
    
    const currentSubCategories = categoryDoc.data().subCategories || [];
    const updatedSubCategories = currentSubCategories.filter(
      sub => sub.id !== subCategoryId
    );
    
    await updateDoc(categoryRef, {
      subCategories: updatedSubCategories,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Sottocategoria rimossa');
  };

  const value = {
    // Dati
    transactions,
    accounts,
    categories,
    loading,
    
    // Accounts
    createAccount,
    updateAccount,
    deleteAccount,
    
    // Transactions
    createTransaction,
    updateTransaction,
    deleteTransaction,
    
    // Categories
    addCategory,
    updateCategory,
    deleteCategory,
    
    // SubCategories
    addSubCategory,
    removeSubCategory
  };

  return (
    <FinancialContext.Provider value={value}>
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error('useFinancial deve essere usato dentro FinancialProvider');
  }
  return context;
};