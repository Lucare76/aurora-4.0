// src/services/recurringService.js
import {
  db,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp
} from './firebase';

/**
 * Aggiunge una transazione ricorrente
 */
export async function addRecurring(userId, data) {
  const docRef = await addDoc(collection(db, 'recurringTransactions'), {
    userId,
    description: data.description || '',
    amount: Math.abs(parseFloat(data.amount) || 0),
    type: data.type || 'expense',
    categoryId: data.categoryId || null,
    categoryName: data.categoryName || '',
    subCategoryId: data.subCategoryId || null,
    subCategoryName: data.subCategoryName || '',
    accountId: data.accountId || null,
    accountName: data.accountName || '',
    frequency: data.frequency || 'monthly', // 'weekly' | 'monthly'
    nextDate: data.nextDate || new Date(),
    lastGenerated: null,
    active: true,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

/**
 * Restituisce tutte le ricorrenze attive dell'utente
 */
export async function getRecurringTransactions(userId) {
  const q = query(
    collection(db, 'recurringTransactions'),
    where('userId', '==', userId),
    where('active', '==', true)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      nextDate: data.nextDate?.toDate ? data.nextDate.toDate() : new Date(data.nextDate)
    };
  });
}

/**
 * Rimuove (disattiva) una ricorrenza — soft delete
 */
export async function removeRecurring(recurringId) {
  await updateDoc(doc(db, 'recurringTransactions', recurringId), {
    active: false
  });
}

/**
 * Elimina definitivamente una ricorrenza da Firestore — hard delete
 */
export async function deleteRecurring(recurringId) {
  await deleteDoc(doc(db, 'recurringTransactions', recurringId));
}

/**
 * Calcola la prossima data in base alla frequenza
 */
function getNextDate(currentDate, frequency) {
  const d = new Date(currentDate);
  if (frequency === 'weekly') {
    d.setDate(d.getDate() + 7);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d;
}

/**
 * Processa le ricorrenze: genera transazioni per quelle con nextDate <= oggi.
 * Ritorna il numero di transazioni generate.
 */
export async function processRecurring(userId, createTransactionFn) {
  const recurrings = await getRecurringTransactions(userId);
  const now = new Date();
  now.setHours(23, 59, 59, 999); // fine giornata

  let generated = 0;

  for (const rec of recurrings) {
    let nextDate = rec.nextDate;

    // Genera transazioni per tutte le date mancate
    while (nextDate <= now) {
      try {
        await createTransactionFn({
          description: rec.description,
          amount: rec.type === 'expense' ? -Math.abs(rec.amount) : Math.abs(rec.amount),
          type: rec.type,
          category: rec.categoryId,
          subCategory: rec.subCategoryId,
          accountId: rec.accountId,
          date: nextDate,
          timestamp: nextDate.getTime(),
          isRecurring: true,
          recurringId: rec.id
        });
        generated++;
      } catch (e) {
        console.error('Errore generazione ricorrente:', e);
      }

      nextDate = getNextDate(nextDate, rec.frequency);
    }

    // Aggiorna nextDate e lastGenerated
    await updateDoc(doc(db, 'recurringTransactions', rec.id), {
      nextDate,
      lastGenerated: new Date()
    });
  }

  return generated;
}