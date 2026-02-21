// src/services/budgetsService.js
import {
  db,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  serverTimestamp
} from "./firebase";

/**
 * Recupera i budget per un mese specifico.
 * year: 2026
 * month: 1-12
 */
export async function getBudgetsByMonth(userId, year, month) {
  if (!userId) return [];

  const q = query(
    collection(db, "budgets"),
    where("userId", "==", userId),
    where("year", "==", year),
    where("month", "==", month)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Alias di compatibilità: se in App.js o altrove ti è rimasto
 * import { getBudgetsForDashboard } ...
 * non va in errore.
 */
export const getBudgetsForDashboard = getBudgetsByMonth;

/**
 * Crea o aggiorna il budget per una categoria nel mese.
 * Se esiste già, lo aggiorna (upsert logico).
 */
<<<<<<< HEAD
export async function upsertBudget(userId, year, month, categoryId, amount, categoryName = "") {
=======
export async function upsertBudget(userId, year, month, categoryId, amount) {
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
  if (!userId) throw new Error("userId mancante");
  if (!categoryId) throw new Error("categoryId mancante");

  const safeAmount = Number(amount) || 0;

  // Cerca se esiste già un budget per quella categoria e mese
  const q = query(
    collection(db, "budgets"),
    where("userId", "==", userId),
    where("year", "==", year),
    where("month", "==", month),
    where("categoryId", "==", categoryId)
  );

  const snap = await getDocs(q);

  // update
  if (!snap.empty) {
    const existing = snap.docs[0];
    await updateDoc(doc(db, "budgets", existing.id), {
      amount: safeAmount,
<<<<<<< HEAD
      categoryName: categoryName || "",
=======
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
      updatedAt: serverTimestamp()
    });
    return existing.id;
  }

  // create
  const docRef = await addDoc(collection(db, "budgets"), {
    userId,
    year,
    month,
    categoryId,
<<<<<<< HEAD
    categoryName: categoryName || "",
=======
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
    amount: safeAmount,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return docRef.id;
}

export async function deleteBudget(budgetId) {
  if (!budgetId) throw new Error("budgetId mancante");
  await deleteDoc(doc(db, "budgets", budgetId));
}

/**
 * (Opzionale) lettura singolo budget
 */
export async function getBudget(budgetId) {
  if (!budgetId) return null;
  const snap = await getDoc(doc(db, "budgets", budgetId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}
