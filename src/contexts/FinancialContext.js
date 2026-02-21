// src/contexts/FinancialContext.js
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
<<<<<<< HEAD
  getDoc,
  getDocs // ✅ aggiunto
=======
  getDoc
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
} from '../services/firebase';

export const FinancialContext = createContext(null);

/**
 * Sottocategorie di default per categorie note
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
    Bollette: ['Luce', 'Gas', 'Acqua', 'Internet']
  },
  income: {
    Stipendio: ['Stipendio base', 'Straordinari', 'Bonus'],
    Investimenti: ['Dividendi', 'Interessi', 'Rendite'],
    Freelance: ['Consulenze', 'Progetti', 'Collaborazioni'],
    Regali: ['Compleanni', 'Festività', 'Occasioni'],
    Vendite: ['Prodotti', 'Servizi', 'Usato'],
    Bonus: ['Tredicesima', 'Premi', 'Incentivi']
  }
};

const buildSubCategoryObjects = (names, baseColor) => {
  const color = baseColor || '#6b7280';
  return names.map((name) => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name,
    icon: '📋',
    color,
    createdAt: new Date()
  }));
};

<<<<<<< HEAD
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `tr_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const parseAmountSafe = (v) => (typeof v === 'string' ? parseFloat(v) || 0 : v || 0);

const toJsDate = (d) => {
  if (!d) return new Date();
  if (d instanceof Date) return d;
  if (typeof d?.toDate === 'function') return d.toDate();
  const parsed = new Date(d);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

=======
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
export const FinancialProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();

  // ----------------------------
  // Helpers importi / tipi
  // ----------------------------
  const getSignedAmount = useCallback((type, rawAmount) => {
    const base = parseFloat(rawAmount) || 0;
    if (type === 'expense') return -Math.abs(base);
    if (type === 'income') return Math.abs(base);
    return base;
  }, []);

  // ----------------------------
  // Helpers lookup per salvataggio coerente
  // ----------------------------
  const resolveAccount = useCallback(
    (accountId) => {
      if (!accountId) return { accountId: null, accountName: '' };
      const a = accounts.find((x) => x.id === accountId);
      return { accountId, accountName: a?.name || '' };
    },
    [accounts]
  );

  const resolveCategory = useCallback(
    (categoryIdOrName) => {
      if (!categoryIdOrName) return { categoryId: null, categoryName: 'Senza categoria' };

      // se è un ID
      const byId = categories.find((c) => c.id === categoryIdOrName);
      if (byId) return { categoryId: byId.id, categoryName: byId.name };

      // se è un nome
      const byName = categories.find(
        (c) => (c.name || '').toLowerCase() === String(categoryIdOrName).toLowerCase()
      );
      if (byName) return { categoryId: byName.id, categoryName: byName.name };

      // fallback: stringa
      return { categoryId: null, categoryName: String(categoryIdOrName) };
    },
    [categories]
  );

  const resolveSubCategory = useCallback(
    (categoryId, subCategoryIdOrName) => {
      if (!subCategoryIdOrName) return { subCategoryId: null, subCategoryName: '' };

      const cat = categories.find((c) => c.id === categoryId);
      const subs = cat?.subCategories || [];

      // se è id
      const byId = subs.find((s) => s.id === subCategoryIdOrName);
      if (byId) return { subCategoryId: byId.id, subCategoryName: byId.name };

      // se è nome
      const byName = subs.find(
        (s) => (s.name || '').toLowerCase() === String(subCategoryIdOrName).toLowerCase()
      );
      if (byName) return { subCategoryId: byName.id, subCategoryName: byName.name };

      // fallback
      return { subCategoryId: null, subCategoryName: String(subCategoryIdOrName) };
    },
    [categories]
  );

  // ----------------------------
  // Aggiornamento saldo conto (safe)
  // ----------------------------
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
      updatedAt: serverTimestamp()
    });
  }, []);

<<<<<<< HEAD
  const applyBalanceAdjustForChange = useCallback(
    async (oldAccountId, oldAmount, newAccountId, newAmount) => {
      const oldAcc = oldAccountId || null;
      const newAcc = newAccountId || null;

      const oldAmt = parseAmountSafe(oldAmount);
      const newAmt = parseAmountSafe(newAmount);

      if (oldAcc && newAcc && oldAcc === newAcc) {
        const delta = newAmt - oldAmt;
        if (delta !== 0) await adjustAccountBalance(oldAcc, delta);
        return;
      }

      if (oldAcc) await adjustAccountBalance(oldAcc, -oldAmt);
      if (newAcc) await adjustAccountBalance(newAcc, newAmt);
    },
    [adjustAccountBalance]
  );

  // ----------------------------
  // Trova transazione gemella del giroconto
  // ----------------------------
  const findTransferPeer = useCallback(
    async (transferId, excludeTransactionId) => {
      if (!user || !transferId) return null;

      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', user.uid),
        where('transferId', '==', transferId)
      );

      const snap = await getDocs(q);
      const peerDoc = snap.docs.find((d) => d.id !== excludeTransactionId);
      if (!peerDoc) return null;

      return { id: peerDoc.id, ...peerDoc.data() };
    },
    [user]
  );

=======
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
  // ----------------------------
  // Default categories (una volta)
  // ----------------------------
  const createDefaultCategories = useCallback(async () => {
    if (!user) return;

    const flagKey = `defaults_created_${user.uid}`;
    if (localStorage.getItem(flagKey) === '1') return;

    const defaultCategories = [
      { name: 'Alimentari', icon: '🍕', color: '#ef4444', type: 'expense' },
      { name: 'Trasporti', icon: '🚗', color: '#3b82f6', type: 'expense' },
      { name: 'Casa', icon: '🏠', color: '#10b981', type: 'expense' },
      { name: 'Intrattenimento', icon: '🎬', color: '#8b5cf6', type: 'expense' },
      { name: 'Salute', icon: '🏥', color: '#ec4899', type: 'expense' },
      { name: 'Shopping', icon: '🛍️', color: '#f59e0b', type: 'expense' },
      { name: 'Stipendio', icon: '💼', color: '#06b6d4', type: 'income' },
      { name: 'Investimenti', icon: '📈', color: '#84cc16', type: 'income' },
      { name: 'Regali', icon: '🎁', color: '#f97316', type: 'income' },
      { name: 'Freelance', icon: '💻', color: '#6366f1', type: 'income' }
    ];

    try {
      for (const category of defaultCategories) {
        await addDoc(collection(db, 'categories'), {
          ...category,
          userId: user.uid,
          createdAt: serverTimestamp(),
          subCategories: []
        });
      }
      localStorage.setItem(flagKey, '1');
    } catch (error) {
      console.error('❌ Errore creazione categorie predefinite:', error);
    }
  }, [user]);

  // ----------------------------
  // Caricamento dati Firebase
  // ----------------------------
  useEffect(() => {
    if (!user) {
      setAccounts([]);
      setCategories([]);
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Accounts
    const accountsQuery = query(collection(db, 'accounts'), where('userId', '==', user.uid));
    const unsubscribeAccounts = onSnapshot(
      accountsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          balance: parseFloat(d.data().balance) || 0
        }));
<<<<<<< HEAD
        data.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'it-IT'));
=======
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
        setAccounts(data);
      },
      (error) => console.error('❌ Errore caricamento accounts:', error)
    );

    // Categories
    const categoriesQuery = query(collection(db, 'categories'), where('userId', '==', user.uid));
    const unsubscribeCategories = onSnapshot(
      categoriesQuery,
      async (snapshot) => {
        if (snapshot.empty) {
          await createDefaultCategories();
          return;
        }

        const updatePromises = [];

        const data = snapshot.docs.map((docSnap) => {
          const c = docSnap.data();
          const subRaw = c.subCategories || c.subcategories || [];
          let subCategories = subRaw.map((sub) =>
            typeof sub === 'string'
              ? {
                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
                  name: sub,
                  icon: '📋',
                  color: c.color || '#6b7280',
                  createdAt: new Date()
                }
              : sub
          );

          // default subs
          if (!subCategories.length) {
            const defaultsForType = defaultSubCategoryNames[c.type] || {};
            const defaultNames = defaultsForType[c.name];
            if (defaultNames?.length) {
              subCategories = buildSubCategoryObjects(defaultNames, c.color);
              updatePromises.push(
                updateDoc(doc(db, 'categories', docSnap.id), {
                  subCategories,
                  updatedAt: serverTimestamp()
                }).catch(() => {})
              );
            }
          }

          return { id: docSnap.id, ...c, subCategories };
        });

        if (updatePromises.length) {
          try {
            await Promise.all(updatePromises);
          } catch {
            // ignore
          }
        }

<<<<<<< HEAD
        // ✅ Ordina alfabeticamente per nome
data.sort((a, b) => a.name.localeCompare(b.name));

=======
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
        setCategories(data);
      },
      (error) => console.error('❌ Errore caricamento categories:', error)
    );

    // Transactions
    const transactionsQuery = query(collection(db, 'transactions'), where('userId', '==', user.uid));
    const unsubscribeTransactions = onSnapshot(
      transactionsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => {
          const t = docSnap.data();

          // normalizza date
          let dateValue = new Date();
          if (t.date) {
            if (typeof t.date.toDate === 'function') dateValue = t.date.toDate();
            else {
              const parsed = new Date(t.date);
              if (!Number.isNaN(parsed.getTime())) dateValue = parsed;
            }
          }

          return {
            id: docSnap.id,
            ...t,
            amount: typeof t.amount === 'string' ? parseFloat(t.amount) || 0 : t.amount || 0,
            date: dateValue
          };
        });

        data.sort((a, b) => b.date - a.date);
        setTransactions(data);
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

  // ----------------------------
  // Accounts CRUD
  // ----------------------------
  const createAccount = async (accountData) => {
    if (!user) throw new Error('❌ Utente non autenticato');

    const newAccount = {
      ...accountData,
      userId: user.uid,
      createdAt: serverTimestamp(),
      balance: parseFloat(accountData.balance) || 0
    };

    const docRef = await addDoc(collection(db, 'accounts'), newAccount);
    return { id: docRef.id, ...newAccount };
  };

  const updateAccount = async (accountId, updates) => {
    if (!user) throw new Error('❌ Utente non autenticato');

    const patched = { ...updates };
    if (patched.balance !== undefined) patched.balance = parseFloat(patched.balance) || 0;

    await updateDoc(doc(db, 'accounts', accountId), { ...patched, updatedAt: serverTimestamp() });
  };

  const deleteAccount = async (accountId) => {
    if (!user) throw new Error('❌ Utente non autenticato');

    const accountTransactions = transactions.filter((t) => t.accountId === accountId);
    if (accountTransactions.length > 0) {
      throw new Error(`❌ Impossibile eliminare: ${accountTransactions.length} transazioni associate`);
    }

    await deleteDoc(doc(db, 'accounts', accountId));
  };

  // ----------------------------
<<<<<<< HEAD
  // Transactions CRUD
=======
  // Transactions CRUD (FIX salvataggio)
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
  // ----------------------------
  const createTransaction = async (transactionData) => {
    if (!user) throw new Error('❌ Utente non autenticato');

    // date: se manca, usa adesso
    const dateObj = transactionData?.date ? new Date(transactionData.date) : new Date();
    const safeDate = Number.isNaN(dateObj.getTime()) ? new Date() : dateObj;

    // tipo + amount signed
    const type = transactionData.type || 'expense';
    const amount = getSignedAmount(type, transactionData.amount);

    // resolve account/category/subcategory (salvo sia ID che name)
    const { accountId, accountName } = resolveAccount(transactionData.accountId);

    const rawCategory = transactionData.categoryId || transactionData.category;
    const { categoryId, categoryName } = resolveCategory(rawCategory);

    const rawSub = transactionData.subCategoryId || transactionData.subCategory || transactionData.subcategory;
    const { subCategoryId, subCategoryName } = resolveSubCategory(categoryId, rawSub);

    const newTransaction = {
      ...transactionData,

      userId: user.uid,

      // canonical fields
      type,
      amount,
      date: safeDate,

      accountId: accountId || null,
      accountName: accountName || '',

      categoryId: categoryId || null,
      categoryName: categoryName || 'Senza categoria',

      subCategoryId: subCategoryId || null,
      subCategoryName: subCategoryName || '',

      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'transactions'), newTransaction);

    // aggiorna saldo
    if (accountId) await adjustAccountBalance(accountId, amount);

    return { id: docRef.id, ...newTransaction };
  };

<<<<<<< HEAD
  /**
   * ✅ Giroconto: crea 2 transazioni collegate (expense + income).
   * Ritorna { transferId, fromTransactionId, toTransactionId }
   */
  const createTransfer = async ({ amount, fromAccountId, toAccountId, description, date }) => {
    if (!user) throw new Error('❌ Utente non autenticato');

    const abs = Math.abs(parseFloat(amount) || 0);
    if (!abs) throw new Error('Inserisci un importo valido');
    if (!fromAccountId || !toAccountId) throw new Error('Seleziona conto origine e destinazione');
    if (fromAccountId === toAccountId) throw new Error('I conti devono essere diversi');

    const safeDate = toJsDate(date);
    const transferId = generateId();

    const fromAcc = accounts.find((a) => a.id === fromAccountId);
    const toAcc = accounts.find((a) => a.id === toAccountId);
    const autoDesc = `Giroconto${fromAcc && toAcc ? `: ${fromAcc.name} → ${toAcc.name}` : ''}`;
    const finalDesc = (description || '').trim() || autoDesc;

    let createdFrom = null;

    try {
      // 1) uscita
      createdFrom = await createTransaction({
        description: finalDesc,
        amount: abs,
        type: 'expense',
        category: null,
        subCategory: null,
        accountId: fromAccountId,
        date: safeDate,
        timestamp: safeDate.getTime(),
        isTransfer: true,
        transferId,
        transferPeerAccountId: toAccountId,
        // opzionale: label chiara (non è una categoria vera)
        categoryName: 'Giroconto'
      });

      // 2) entrata
      const createdTo = await createTransaction({
        description: finalDesc,
        amount: abs,
        type: 'income',
        category: null,
        subCategory: null,
        accountId: toAccountId,
        date: safeDate,
        timestamp: safeDate.getTime(),
        isTransfer: true,
        transferId,
        transferPeerAccountId: fromAccountId,
        categoryName: 'Giroconto'
      });

      return { transferId, fromTransactionId: createdFrom.id, toTransactionId: createdTo.id };
    } catch (err) {
      // rollback best-effort se si rompe a metà
      try {
        if (createdFrom?.id) {
          const ref = doc(db, 'transactions', createdFrom.id);
          await deleteDoc(ref);

          // createTransaction ha già modificato il saldo: lo annullo
          const applied = getSignedAmount('expense', abs); // negativo
          await adjustAccountBalance(fromAccountId, -applied); // quindi +abs
        }
      } catch {
        // ignore
      }
      throw err;
    }
  };

=======
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
  const updateTransaction = async (transactionId, updates) => {
    if (!user) throw new Error('❌ Utente non autenticato');

    const transactionRef = doc(db, 'transactions', transactionId);
    const snap = await getDoc(transactionRef);
    if (!snap.exists()) throw new Error('❌ Transazione non trovata');

    const old = snap.data();

<<<<<<< HEAD
    // ✅ GIROCONTO: aggiorna anche la gemella
    if (old.isTransfer && old.transferId) {
      const peer = await findTransferPeer(old.transferId, transactionId);
      if (!peer?.id) throw new Error('❌ Giroconto incompleto: transazione collegata non trovata');

      // individua gamba expense (from) e income (to)
      const thisType = old.type || '';

const thisIsExpense = thisType === 'expense';
const thisIsIncome = thisType === 'income';


      // fallback (se dati sporchi): decide in base al segno dell'importo
      const fallbackThisIsExpense = !thisIsIncome && parseAmountSafe(old.amount) < 0;

      const expenseLeg = (thisIsExpense || fallbackThisIsExpense) ? { id: transactionId, ...old } : { id: peer.id, ...peer };
      const incomeLeg = (expenseLeg.id === transactionId) ? { id: peer.id, ...peer } : { id: transactionId, ...old };

      const oldFromAccountId = expenseLeg.accountId || null;
      const oldToAccountId = incomeLeg.accountId || null;

      // nuovo importo (sempre assoluto)
      const nextAbs =
        updates.amount !== undefined
          ? Math.abs(parseFloat(updates.amount) || 0)
          : Math.abs(parseAmountSafe(expenseLeg.amount));

      if (!nextAbs) throw new Error('Inserisci un importo valido');

      // nuova data
      const nextDate = updates.date !== undefined ? toJsDate(updates.date) : toJsDate(old.date);

      // descrizione (stessa su entrambe)
      const nextDescription =
        updates.description !== undefined
          ? String(updates.description || '').trim()
          : String(old.description || '').trim();

      // se aggiornano from/to account, prevale esplicitamente
      let nextFromAccountId = oldFromAccountId;
      let nextToAccountId = oldToAccountId;

      if (updates.fromAccountId !== undefined || updates.toAccountId !== undefined) {
        if (updates.fromAccountId !== undefined) nextFromAccountId = updates.fromAccountId || null;
        if (updates.toAccountId !== undefined) nextToAccountId = updates.toAccountId || null;
      } else if (updates.accountId !== undefined) {
        // compatibilita': se arriva solo accountId, vale per LA GAMBA modificata
        const targetAcc = updates.accountId || null;
        if (!targetAcc) throw new Error('Seleziona un conto valido');

        if (expenseLeg.id === transactionId) nextFromAccountId = targetAcc;
        else nextToAccountId = targetAcc;
      }

      if (!nextFromAccountId || !nextToAccountId) {
        throw new Error('Giroconto: conti non validi');
      }
      if (nextFromAccountId === nextToAccountId) {
        throw new Error('Conto origine e conto destinazione devono essere diversi');
      }

      // risolvi nomi conti
      const fromResolved = resolveAccount(nextFromAccountId);
      const toResolved = resolveAccount(nextToAccountId);

      // costruisci patch per entrambe
      const expenseAmountNew = getSignedAmount('expense', nextAbs); // negativo
      const incomeAmountNew = getSignedAmount('income', nextAbs); // positivo

      const expensePatch = {
        description: nextDescription,
        type: 'expense',
        amount: expenseAmountNew,
        date: nextDate,
        timestamp: nextDate.getTime(),

        accountId: fromResolved.accountId || null,
        accountName: fromResolved.accountName || '',

        // forza neutralità categorie
        categoryId: null,
        categoryName: 'Giroconto',
        subCategoryId: null,
        subCategoryName: '',

        isTransfer: true,
        transferId: old.transferId,
        transferPeerAccountId: toResolved.accountId,

        updatedAt: serverTimestamp()
      };

      const incomePatch = {
        description: nextDescription,
        type: 'income',
        amount: incomeAmountNew,
        date: nextDate,
        timestamp: nextDate.getTime(),

        accountId: toResolved.accountId || null,
        accountName: toResolved.accountName || '',

        categoryId: null,
        categoryName: 'Giroconto',
        subCategoryId: null,
        subCategoryName: '',

        isTransfer: true,
        transferId: old.transferId,
        transferPeerAccountId: fromResolved.accountId,

        updatedAt: serverTimestamp()
      };

      // valori old (signed)
      const expenseAmountOld = parseAmountSafe(expenseLeg.amount);
      const incomeAmountOld = parseAmountSafe(incomeLeg.amount);

      // aggiorna documenti
      const expenseRef = doc(db, 'transactions', expenseLeg.id);
      const incomeRef = doc(db, 'transactions', incomeLeg.id);

      await Promise.all([updateDoc(expenseRef, expensePatch), updateDoc(incomeRef, incomePatch)]);

      // aggiorna saldi (storna old e applica nuovo)
      await applyBalanceAdjustForChange(oldFromAccountId, expenseAmountOld, nextFromAccountId, expenseAmountNew);
      await applyBalanceAdjustForChange(oldToAccountId, incomeAmountOld, nextToAccountId, incomeAmountNew);

      return;
    }

    // ----------------------------
    // ✅ NORMALE (come prima)
    // ----------------------------

=======
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
    // vecchi valori
    const oldAccountId = old.accountId || null;
    const oldAmount = typeof old.amount === 'string' ? parseFloat(old.amount) || 0 : old.amount || 0;
    const oldType = old.type || 'expense';

    // nuovi valori (se non presenti, mantieni old)
    const newType = updates.type !== undefined ? updates.type : oldType;

    // amount
    let newAmount = oldAmount;
    if (updates.amount !== undefined) {
      newAmount = getSignedAmount(newType, updates.amount);
    } else if (updates.type !== undefined && updates.type !== oldType) {
      newAmount = getSignedAmount(newType, Math.abs(oldAmount));
    }

    // date
    let newDate = old.date;
    if (updates.date !== undefined) {
      const d = new Date(updates.date);
      newDate = Number.isNaN(d.getTime()) ? new Date() : d;
    }

    // account
    const newAccountId = updates.accountId !== undefined ? updates.accountId : oldAccountId;
    const { accountId: resolvedAccId, accountName } = resolveAccount(newAccountId);

    // category/subcategory
    const rawCategory = updates.categoryId ?? updates.category ?? old.categoryId ?? old.category ?? null;
    const { categoryId, categoryName } = resolveCategory(rawCategory);

    const rawSub =
      updates.subCategoryId ??
      updates.subCategory ??
      updates.subcategory ??
      old.subCategoryId ??
      old.subCategory ??
      old.subcategory ??
      null;

    const { subCategoryId, subCategoryName } = resolveSubCategory(categoryId, rawSub);

    const patched = {
      ...updates,

      type: newType,
      amount: newAmount,
      date: newDate,

      accountId: resolvedAccId || null,
      accountName: accountName || '',

      categoryId: categoryId || null,
      categoryName: categoryName || 'Senza categoria',

      subCategoryId: subCategoryId || null,
      subCategoryName: subCategoryName || '',

      updatedAt: serverTimestamp()
    };

    await updateDoc(transactionRef, patched);

    // aggiorna saldi (storna old e applica nuovo)
    if (oldAccountId && resolvedAccId && oldAccountId === resolvedAccId) {
      const delta = newAmount - oldAmount;
      await adjustAccountBalance(oldAccountId, delta);
    } else {
      if (oldAccountId) await adjustAccountBalance(oldAccountId, -oldAmount);
      if (resolvedAccId) await adjustAccountBalance(resolvedAccId, newAmount);
    }
  };

  const deleteTransaction = async (transactionId) => {
    if (!user) throw new Error('❌ Utente non autenticato');

    const transactionRef = doc(db, 'transactions', transactionId);
    const snap = await getDoc(transactionRef);
    if (!snap.exists()) throw new Error('❌ Transazione non trovata');

    const t = snap.data();
    const accountId = t.accountId || null;
<<<<<<< HEAD
    const amount = parseAmountSafe(t.amount);

    // ✅ GIROCONTO: elimina anche la gemella
    if (t.isTransfer && t.transferId) {
      const peer = await findTransferPeer(t.transferId, transactionId);

      // elimina questa
      await deleteDoc(transactionRef);
      if (accountId) await adjustAccountBalance(accountId, -amount);

      // elimina peer
      if (peer?.id) {
        const peerRef = doc(db, 'transactions', peer.id);
        const peerAccountId = peer.accountId || null;
        const peerAmount = parseAmountSafe(peer.amount);

        await deleteDoc(peerRef);
        if (peerAccountId) await adjustAccountBalance(peerAccountId, -peerAmount);
      }

      return;
    }

    // ✅ NORMALE
    await deleteDoc(transactionRef);
=======
    const amount = typeof t.amount === 'string' ? parseFloat(t.amount) || 0 : t.amount || 0;

    await deleteDoc(transactionRef);

>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
    if (accountId) await adjustAccountBalance(accountId, -amount);
  };

  // ----------------------------
  // Categories CRUD
  // ----------------------------
  const addCategory = async (categoryData) => {
    if (!user) throw new Error('❌ Utente non autenticato');

    const newCategory = {
      ...categoryData,
      userId: user.uid,
      createdAt: serverTimestamp(),
      subCategories: categoryData.subCategories || []
    };

    const docRef = await addDoc(collection(db, 'categories'), newCategory);
    return { id: docRef.id, ...newCategory };
  };

  const updateCategory = async (categoryId, updates) => {
    if (!user) throw new Error('❌ Utente non autenticato');
    await updateDoc(doc(db, 'categories', categoryId), { ...updates, updatedAt: serverTimestamp() });
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

  // ----------------------------
  // Subcategories
  // ----------------------------
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
        createdAt: new Date()
      }
    ];

    await updateDoc(categoryRef, { subCategories: updatedSubCategories, updatedAt: serverTimestamp() });
  };

  const removeSubCategory = async (categoryId, subCategoryId) => {
    if (!user) throw new Error('❌ Utente non autenticato');

    const categoryRef = doc(db, 'categories', categoryId);
    const categoryDoc = await getDoc(categoryRef);
    if (!categoryDoc.exists()) throw new Error('❌ Categoria non trovata');

    const currentSubCategories = categoryDoc.data().subCategories || [];
    const updatedSubCategories = currentSubCategories.filter((sub) => sub.id !== subCategoryId);

    await updateDoc(categoryRef, { subCategories: updatedSubCategories, updatedAt: serverTimestamp() });
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
<<<<<<< HEAD
    createTransfer, // ✅ esposto
=======
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
    updateTransaction,
    deleteTransaction,

    addCategory,
    updateCategory,
    deleteCategory,

    addSubCategory,
<<<<<<< HEAD
    removeSubCategory,

    // Helpers esposti per recurring
    resolveAccount,
    resolveCategory,
    resolveSubCategory
=======
    removeSubCategory
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
  };

  return <FinancialContext.Provider value={value}>{children}</FinancialContext.Provider>;
};

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (!context) throw new Error('useFinancial deve essere usato dentro FinancialProvider');
  return context;
};

export default FinancialProvider;
