import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { 
  transactionsService, 
  accountsService, 
  categoriesService, 
  updateAccountBalance 
} from '../services/transactionsService';

const FinancialContext = createContext();

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error('useFinancial deve essere usato dentro FinancialProvider');
  }
  return context;
};

export const FinancialProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Funzione per caricare le transazioni
  const loadTransactions = useCallback(async () => {
    if (!user) {
      console.log("❌ Utente non autenticato - loadTransactions");
      return;
    }
    
    try {
      setLoading(true);
      const transactionsData = await transactionsService.getTransactions(user.uid);
      setTransactions(transactionsData);
    } catch (error) {
      console.error("Errore nel caricamento delle transazioni:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Funzione per caricare i conti
  const loadAccounts = useCallback(async () => {
    if (!user) {
      console.log("❌ Utente non autenticato - loadAccounts");
      return [];
    }
    
    try {
      console.log("🔄 Caricamento accounts da Firebase...");
      const accountsData = await accountsService.getAccounts(user.uid);
      console.log("📊 Accounts caricati:", accountsData);
      setAccounts(accountsData);
      return accountsData;
    } catch (error) {
      console.error("Errore nel caricamento dei conti:", error);
      return [];
    }
  }, [user]);

  // Funzione per caricare le categorie
  const loadCategories = useCallback(async () => {
    if (!user) {
      console.log("❌ Utente non autenticato - loadCategories");
      return [];
    }
    
    try {
      const categoriesData = await categoriesService.getCategories(user.uid);
      setCategories(categoriesData);
      return categoriesData;
    } catch (error) {
      console.error("Errore nel caricamento delle categorie:", error);
      return [];
    }
  }, [user]);

  // Funzione per creare conti predefiniti
  const createDefaultAccounts = useCallback(async () => {
    if (!user) {
      console.log("❌ Utente non autenticato - createDefaultAccounts");
      return;
    }
    
    try {
      const defaultAccounts = [
        { name: 'Conto Corrente', type: 'bank', balance: 0, color: '#4f46e5' },
        { name: 'Risparmi', type: 'savings', balance: 0, color: '#06b6d4' },
        { name: 'Contanti', type: 'cash', balance: 0, color: '#10b981' }
      ];

      for (const account of defaultAccounts) {
        await accountsService.createAccount(user.uid, account);
      }
      
      await loadAccounts();
    } catch (error) {
      console.error("Errore creazione conti predefiniti:", error);
    }
  }, [user, loadAccounts]);

  // Funzione per creare una transazione
  const createTransaction = useCallback(async (transactionData) => {
    if (!user) {
      throw new Error("Utente non autenticato");
    }
    
    try {
      console.log("🎯 Creazione transazione:", transactionData);
      
      // 1. Crea la transazione principale
      const newTransaction = await transactionsService.createTransaction(
        user.uid, 
        transactionData
      );
      
      console.log("✅ Transazione creata:", newTransaction);
      
      // 2. Aggiorna lo stato locale delle transazioni
      setTransactions(prev => [newTransaction, ...prev]);
      
      // 3. Gestione saldi per diversi tipi di transazione
      if (transactionData.type === 'transfer' && transactionData.targetAccountId) {
        console.log("🔄 Gestione trasferimento...");
        // TRASFERIMENTO: sottrai dal conto origine e aggiungi al conto destinazione
        await updateAccountBalance(user.uid, transactionData.accountId, -transactionData.amount, 'transfer');
        await updateAccountBalance(user.uid, transactionData.targetAccountId, transactionData.amount, 'transfer');
      } else {
        console.log("💰 Aggiornamento saldo conto:", {
          accountId: transactionData.accountId,
          amount: transactionData.amount,
          type: transactionData.type
        });
        // ENTRATA/USCITA: aggiorna solo il conto selezionato
        await updateAccountBalance(user.uid, transactionData.accountId, transactionData.amount, transactionData.type);
      }
      
      console.log("🔄 Ricaricamento accounts dopo aggiornamento saldo...");
      // 4. Ricarica i conti da Firebase per avere i saldi aggiornati
      const updatedAccounts = await loadAccounts();
      console.log("✅ Accounts ricaricati:", updatedAccounts);
      
      return newTransaction;
    } catch (error) {
      console.error("Errore creazione transazione:", error);
      throw error;
    }
  }, [user, loadAccounts]);

  // Funzione per creare un nuovo conto
  const createAccount = useCallback(async (accountData) => {
    console.log("🔍 Controllo utente in createAccount:", user);
    
    if (!user) {
      throw new Error("Utente non autenticato. Effettua il login per creare un account.");
    }
    
    try {
      console.log("📝 Creazione account con dati:", accountData);
      console.log("👤 User ID:", user.uid);
      
      const newAccount = await accountsService.createAccount(user.uid, accountData);
      console.log("✅ Account creato nel service:", newAccount);
      
      // Ricarica gli account per vedere il nuovo
      await loadAccounts();
      
      console.log("🔄 Account ricaricati dopo creazione");
      return newAccount;
    } catch (error) {
      console.error("❌ Errore creazione conto:", error);
      throw error;
    }
  }, [user, loadAccounts]);

  // FUNZIONE PER ELIMINARE UN CONTO
  const deleteAccount = useCallback(async (accountId) => {
    if (!user) {
      throw new Error("Utente non autenticato");
    }
    
    try {
      console.log("🗑️ Eliminazione account:", accountId);
      
      // 1. Verifica che l'account esista
      const accountToDelete = accounts.find(acc => acc.id === accountId);
      if (!accountToDelete) {
        throw new Error("Account non trovato");
      }

      // 2. Controlla se ci sono transazioni associate a questo account
      const accountTransactions = transactions.filter(
        transaction => transaction.accountId === accountId || transaction.targetAccountId === accountId
      );

      if (accountTransactions.length > 0) {
        throw new Error(
          `Impossibile eliminare il conto. Ci sono ${accountTransactions.length} transazioni associate.`
        );
      }

      // 3. Elimina l'account da Firebase
      await accountsService.deleteAccount(user.uid, accountId);
      
      // 4. Aggiorna lo stato locale
      setAccounts(prev => prev.filter(acc => acc.id !== accountId));
      
      console.log("✅ Account eliminato con successo");
      
    } catch (error) {
      console.error("❌ Errore eliminazione account:", error);
      throw error;
    }
  }, [user, accounts, transactions]);

  // FUNZIONE PER MODIFICARE UN CONTO
  const updateAccount = useCallback(async (accountId, updateData) => {
    if (!user) {
      throw new Error("Utente non autenticato");
    }
    
    try {
      console.log("✏️ Modifica account:", accountId, updateData);
      
      // 1. Aggiorna su Firebase
      await accountsService.updateAccount(user.uid, accountId, updateData);
      
      // 2. Aggiorna stato locale
      setAccounts(prev => prev.map(acc => 
        acc.id === accountId ? { ...acc, ...updateData } : acc
      ));
      
      console.log("✅ Account modificato con successo");
      
    } catch (error) {
      console.error("❌ Errore modifica account:", error);
      throw error;
    }
  }, [user]);

  // FUNZIONE PER ELIMINARE UNA TRANSAZIONE
  const deleteTransaction = useCallback(async (transactionId) => {
    if (!user) {
      throw new Error("Utente non autenticato");
    }
    
    try {
      console.log("🗑️ Eliminazione transazione:", transactionId);
      
      // 1. Prima recupera i dati della transazione per aggiornare i saldi
      const transactionToDelete = transactions.find(t => t.id === transactionId);
      if (!transactionToDelete) {
        throw new Error("Transazione non trovata");
      }

      // 2. Elimina la transazione
      await transactionsService.deleteTransaction(user.uid, transactionId);
      
      // 3. Aggiorna stato locale
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
      
      // 4. Aggiorna i saldi dei conti (inverti l'operazione)
      if (transactionToDelete.type === 'transfer' && transactionToDelete.targetAccountId) {
        // Ripristina saldo per trasferimento
        await updateAccountBalance(user.uid, transactionToDelete.accountId, transactionToDelete.amount, 'transfer');
        await updateAccountBalance(user.uid, transactionToDelete.targetAccountId, -transactionToDelete.amount, 'transfer');
      } else {
        // Ripristina saldo per entrata/uscita (inverti il segno)
        await updateAccountBalance(
          user.uid, 
          transactionToDelete.accountId, 
          -transactionToDelete.amount,
          transactionToDelete.type
        );
      }
      
      // 5. Ricarica i conti per aggiornare i saldi
      await loadAccounts();
      
      console.log("✅ Transazione eliminata con successo");
      
    } catch (error) {
      console.error("❌ Errore eliminazione transazione:", error);
      throw error;
    }
  }, [user, transactions, loadAccounts]);

  // FUNZIONE PER MODIFICARE UNA TRANSAZIONE
  const updateTransaction = useCallback(async (transactionId, updateData) => {
    if (!user) {
      throw new Error("Utente non autenticato");
    }
    
    try {
      console.log("✏️ Modifica transazione:", transactionId, updateData);
      
      // 1. Prima recupera la transazione originale
      const originalTransaction = transactions.find(t => t.id === transactionId);
      if (!originalTransaction) {
        throw new Error("Transazione non trovata");
      }

      // 2. Aggiorna la transazione su Firebase
      await transactionsService.updateTransaction(user.uid, transactionId, updateData);
      
      // 3. Aggiorna stato locale
      setTransactions(prev => prev.map(t => 
        t.id === transactionId ? { ...t, ...updateData } : t
      ));
      
      // 4. Se sono cambiati importi o conti, aggiorna i saldi
      if (updateData.amount !== undefined || updateData.accountId || updateData.type) {
        await loadAccounts(); // Ricarica i conti per aggiornare i saldi
      }
      
      console.log("✅ Transazione modificata con successo");
      
    } catch (error) {
      console.error("❌ Errore modifica transazione:", error);
      throw error;
    }
  }, [user, transactions, loadAccounts]);

  // FUNZIONI PER GESTIRE LE CATEGORIE
  const addCategory = useCallback(async (categoryData) => {
    if (!user) {
      throw new Error("Utente non autenticato");
    }
    
    try {
      console.log("🏷️ Aggiunta categoria:", categoryData);
      
      const newCategory = await categoriesService.addCategory(user.uid, categoryData);
      
      // Aggiorna stato locale
      setCategories(prev => [...prev, newCategory]);
      
      console.log("✅ Categoria aggiunta con successo");
      return newCategory;
    } catch (error) {
      console.error("❌ Errore aggiunta categoria:", error);
      throw error;
    }
  }, [user]);

  const updateCategory = useCallback(async (categoryId, updateData) => {
    if (!user) {
      throw new Error("Utente non autenticato");
    }
    
    try {
      console.log("✏️ Modifica categoria:", categoryId, updateData);
      
      await categoriesService.updateCategory(user.uid, categoryId, updateData);
      
      // Aggiorna stato locale
      setCategories(prev => prev.map(cat => 
        cat.id === categoryId ? { ...cat, ...updateData } : cat
      ));
      
      console.log("✅ Categoria modificata con successo");
    } catch (error) {
      console.error("❌ Errore modifica categoria:", error);
      throw error;
    }
  }, [user]);

  const deleteCategory = useCallback(async (categoryId) => {
    if (!user) {
      throw new Error("Utente non autenticato");
    }
    
    try {
      console.log("🗑️ Eliminazione categoria:", categoryId);
      
      // Verifica se ci sono transazioni che usano questa categoria
      const categoryTransactions = transactions.filter(t => t.category === categoryId);
      
      if (categoryTransactions.length > 0) {
        throw new Error(
          `Impossibile eliminare la categoria. Ci sono ${categoryTransactions.length} transazioni associate.`
        );
      }
      
      await categoriesService.deleteCategory(user.uid, categoryId);
      
      // Aggiorna stato locale
      setCategories(prev => prev.filter(cat => cat.id !== categoryId));
      
      console.log("✅ Categoria eliminata con successo");
    } catch (error) {
      console.error("❌ Errore eliminazione categoria:", error);
      throw error;
    }
  }, [user, transactions]);

  // useEffect per caricare i dati quando l'utente cambia
  useEffect(() => {
    console.log("🔄 FinancialProvider - Stato utente:", user ? "Autenticato" : "Non autenticato");
    
    if (user) {
      console.log("🔄 Caricamento dati finanziari per utente:", user.uid);
      
      const loadUserData = async () => {
        await loadTransactions();
        const userAccounts = await loadAccounts();
        const userCategories = await loadCategories();
        
        if (userAccounts.length === 0) {
          await createDefaultAccounts();
        }
        if (userCategories.length === 0) {
          await categoriesService.createDefaultCategories(user.uid);
          await loadCategories(); // Ricarica dopo aver creato le categorie default
        }
      };
      
      loadUserData();
    } else {
      console.log("🔄 Reset dati finanziari - utente non autenticato");
      setTransactions([]);
      setAccounts([]);
      setCategories([]);
    }
  }, [user, loadTransactions, loadAccounts, loadCategories, createDefaultAccounts]);

  const value = {
    transactions,
    accounts,
    categories,
    loading,
    createTransaction,
    createAccount,
    deleteAccount,
    updateAccount,
    deleteTransaction,
    updateTransaction,
    addCategory,
    updateCategory,
    deleteCategory,
    loadTransactions,
    loadAccounts,
    loadCategories
  };

  return (
    <FinancialContext.Provider value={value}>
      {children}
    </FinancialContext.Provider>
  );
};