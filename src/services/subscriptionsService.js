import {
  addDoc,
  collection,
  db,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where
} from './firebase';

function toDate(value) {
  if (!value) return null;
  if (value && typeof value === 'object' && typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function computeNextDueDate(fromDate, billingCycle) {
  const d = toDate(fromDate) || new Date();
  const out = new Date(d);
  if (billingCycle === 'yearly') {
    out.setFullYear(out.getFullYear() + 1);
    return out;
  }
  if (billingCycle === 'weekly') {
    out.setDate(out.getDate() + 7);
    return out;
  }
  out.setMonth(out.getMonth() + 1);
  return out;
}

export async function getSubscriptions(userId) {
  const q = query(collection(db, 'subscriptions'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        amount: Number(data?.amount) || 0,
        previousAmount: Number(data?.previousAmount) || null,
        priceIncreaseDelta: Number(data?.priceIncreaseDelta) || 0,
        priceIncreasePercent: Number(data?.priceIncreasePercent) || 0,
        priceIncreasedAt: toDate(data?.priceIncreasedAt),
        nextDueDate: toDate(data?.nextDueDate),
        createdAt: toDate(data?.createdAt),
        updatedAt: toDate(data?.updatedAt),
        lastPaidAt: toDate(data?.lastPaidAt)
      };
    })
    .sort((a, b) => {
      const da = a.nextDueDate?.getTime() || Number.MAX_SAFE_INTEGER;
      const db = b.nextDueDate?.getTime() || Number.MAX_SAFE_INTEGER;
      return da - db;
    });
}

export async function createSubscription(userId, payload) {
  const ref = await addDoc(collection(db, 'subscriptions'), {
    userId,
    name: String(payload?.name || '').trim(),
    ownerName: String(payload?.ownerName || '').trim(),
    provider: String(payload?.provider || '').trim(),
    notes: String(payload?.notes || '').trim(),
    accountId: payload?.accountId || null,
    accountName: String(payload?.accountName || '').trim(),
    amount: Math.abs(Number(payload?.amount) || 0),
    previousAmount: null,
    priceIncreaseDelta: 0,
    priceIncreasePercent: 0,
    priceIncreasedAt: null,
    currency: payload?.currency || 'EUR',
    billingCycle: payload?.billingCycle || 'monthly',
    kind: payload?.kind || 'recurring',
    nextDueDate: toDate(payload?.nextDueDate) || new Date(),
    active: payload?.active !== false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastPaidAt: null
  });
  return ref.id;
}

export async function updateSubscription(subscriptionId, patch = {}) {
  await updateDoc(doc(db, 'subscriptions', subscriptionId), {
    ...patch,
    updatedAt: serverTimestamp()
  });
}

export async function deleteSubscription(subscriptionId) {
  await deleteDoc(doc(db, 'subscriptions', subscriptionId));
}

export async function markSubscriptionPaid(subscription) {
  const nextDueDate = computeNextDueDate(subscription?.nextDueDate, subscription?.billingCycle);
  await updateDoc(doc(db, 'subscriptions', subscription.id), {
    lastPaidAt: new Date(),
    nextDueDate,
    updatedAt: serverTimestamp()
  });
}
