// src/services/savingsGoalsService.js
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
 * Recupera tutti gli obiettivi di risparmio dell'utente.
 */
export async function getSavingsGoals(userId) {
  if (!userId) return [];

  const q = query(
    collection(db, "savingsGoals"),
    where("userId", "==", userId)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Crea un nuovo obiettivo di risparmio.
 */
export async function createSavingsGoal(userId, data) {
  if (!userId) throw new Error("userId mancante");

  const docRef = await addDoc(collection(db, "savingsGoals"), {
    userId,
    name: data.name || "",
    targetAmount: Number(data.targetAmount) || 0,
    currentAmount: Number(data.currentAmount) || 0,
    deadline: data.deadline || null,
    icon: data.icon || "🎯",
    color: data.color || "#4f46e5",
    accountId: data.accountId || null,
    notes: data.notes || "",
    completed: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return docRef.id;
}

/**
 * Aggiorna campi di un obiettivo.
 */
export async function updateSavingsGoal(goalId, updates) {
  if (!goalId) throw new Error("goalId mancante");

  await updateDoc(doc(db, "savingsGoals", goalId), {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

/**
 * Elimina un obiettivo.
 */
export async function deleteSavingsGoal(goalId) {
  if (!goalId) throw new Error("goalId mancante");
  await deleteDoc(doc(db, "savingsGoals", goalId));
}

/**
 * Versa un importo nell'obiettivo (incrementa currentAmount).
 */
export async function depositToGoal(goalId, amount) {
  if (!goalId) throw new Error("goalId mancante");
  const num = Number(amount) || 0;
  if (num <= 0) throw new Error("Importo non valido");

  const snap = await getDoc(doc(db, "savingsGoals", goalId));
  if (!snap.exists()) throw new Error("Obiettivo non trovato");

  const current = Number(snap.data().currentAmount) || 0;
  const target = Number(snap.data().targetAmount) || 0;
  const newAmount = current + num;

  await updateDoc(doc(db, "savingsGoals", goalId), {
    currentAmount: newAmount,
    completed: newAmount >= target && target > 0,
    updatedAt: serverTimestamp()
  });

  return newAmount;
}

/**
 * Preleva un importo dall'obiettivo (decrementa currentAmount).
 */
export async function withdrawFromGoal(goalId, amount) {
  if (!goalId) throw new Error("goalId mancante");
  const num = Number(amount) || 0;
  if (num <= 0) throw new Error("Importo non valido");

  const snap = await getDoc(doc(db, "savingsGoals", goalId));
  if (!snap.exists()) throw new Error("Obiettivo non trovato");

  const current = Number(snap.data().currentAmount) || 0;
  const target = Number(snap.data().targetAmount) || 0;
  const newAmount = Math.max(0, current - num);

  await updateDoc(doc(db, "savingsGoals", goalId), {
    currentAmount: newAmount,
    completed: newAmount >= target && target > 0,
    updatedAt: serverTimestamp()
  });

  return newAmount;
}
