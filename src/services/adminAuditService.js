import { addDoc, collection, db, serverTimestamp } from './firebase';

export async function logAdminAuditEvent({
  adminUid,
  action,
  target = '',
  details = {}
}) {
  if (!adminUid || !action) return;
  try {
    await addDoc(collection(db, 'adminAuditLogs'), {
      adminUid,
      action,
      target,
      details,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Errore scrittura audit log admin:', error);
  }
}
