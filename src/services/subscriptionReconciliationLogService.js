import {
  addDoc,
  collection,
  db,
  getDocs,
  query,
  serverTimestamp,
  where
} from './firebase';

function toDate(value) {
  if (!value) return null;
  if (value && typeof value === 'object' && typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createSubscriptionReconciliationLog(userId, payload = {}) {
  if (!userId) throw new Error('Utente non valido');

  const amount = Math.abs(Number(payload?.amount) || 0);
  const actionAt = toDate(payload?.actionAt) || new Date();

  const ref = await addDoc(collection(db, 'subscriptionReconciliationLogs'), {
    userId,
    actionType: String(payload?.actionType || '').trim(), // createTransaction | createPayment
    mode: String(payload?.mode || 'single').trim(), // single | bulk
    status: String(payload?.status || 'success').trim(), // success | error
    subscriptionId: String(payload?.subscriptionId || '').trim(),
    subscriptionName: String(payload?.subscriptionName || '').trim(),
    sourceId: String(payload?.sourceId || '').trim(), // paymentId | transactionId
    amount,
    currency: payload?.currency || 'EUR',
    notes: String(payload?.notes || '').trim(),
    errorMessage: String(payload?.errorMessage || '').trim(),
    actionAt,
    createdAt: serverTimestamp()
  });

  return ref.id;
}

export async function getSubscriptionReconciliationLogs(userId) {
  const q = query(collection(db, 'subscriptionReconciliationLogs'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        amount: Number(data?.amount) || 0,
        actionAt: toDate(data?.actionAt),
        createdAt: toDate(data?.createdAt)
      };
    })
    .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
}
