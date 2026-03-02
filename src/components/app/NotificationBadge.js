import React, { useEffect, useState } from 'react';
import { FiBell } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';

function NotificationBadge() {
  const [pendingCount, setPendingCount] = useState(0);
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    if (!user || !isAdmin) {
      setPendingCount(0);
      return;
    }

    const setupListener = async () => {
      try {
        const { collection, query, where, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('../../services/firebase');

        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('status', '==', 'pending'));

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            setPendingCount(snapshot.size);
          },
          (error) => {
            console.error('Errore conteggio pending:', error);
            setPendingCount(0);
          }
        );

        return unsubscribe;
      } catch (error) {
        console.error('Errore setup listener:', error);
        setPendingCount(0);
      }
    };

    let unsubscribe;
    setupListener().then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [user, isAdmin]);

  if (!isAdmin) return null;

  return (
    <button
      className="action-btn notification-btn"
      type="button"
      title={pendingCount > 0 ? `${pendingCount} utenti in attesa di approvazione` : 'Nessuna notifica'}
    >
      <FiBell />
      {pendingCount > 0 && <span className="notification-badge">{pendingCount}</span>}
    </button>
  );
}

export default NotificationBadge;
