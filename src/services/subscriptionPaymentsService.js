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

export async function createSubscriptionPayment(userId, payload = {}) {
  const amount = Math.abs(Number(payload?.amount) || 0);
  if (!userId || !payload?.subscriptionId || amount <= 0) {
    throw new Error('Dati pagamento non validi');
  }
  const paidAt = toDate(payload?.paidAt) || new Date();

  const ref = await addDoc(collection(db, 'subscriptionPayments'), {
    userId,
    subscriptionId: payload.subscriptionId,
    subscriptionName: String(payload?.subscriptionName || '').trim(),
    ownerName: String(payload?.ownerName || '').trim(),
    provider: String(payload?.provider || '').trim(),
    method: String(payload?.method || 'manual').trim(),
    notes: String(payload?.notes || '').trim(),
    amount,
    currency: payload?.currency || 'EUR',
    paidAt,
    createdAt: serverTimestamp()
  });

  return ref.id;
}

export async function getSubscriptionPayments(userId) {
  const q = query(collection(db, 'subscriptionPayments'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        amount: Number(data?.amount) || 0,
        paidAt: toDate(data?.paidAt),
        createdAt: toDate(data?.createdAt)
      };
    })
    .sort((a, b) => {
      const ad = a.paidAt?.getTime() || 0;
      const bd = b.paidAt?.getTime() || 0;
      return bd - ad;
    });
}
