import React, { useEffect, useState } from 'react';
import { FiBell } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { getDaysUntilBirthday } from '../../services/birthdaysService';

function NotificationBadge({ onOpenBirthdays, onOpenAdmin }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [todayBirthdays, setTodayBirthdays] = useState([]);
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

  useEffect(() => {
    if (!user?.uid) {
      setTodayBirthdays([]);
      return;
    }

    const setupBirthdaysListener = async () => {
      try {
        const { collection, query, where, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('../../services/firebase');
        const q = query(collection(db, 'birthdays'), where('userId', '==', user.uid));

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const list = snapshot.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .filter((b) => getDaysUntilBirthday(b?.date) === 0);
            setTodayBirthdays(list);
          },
          (error) => {
            console.error('Errore caricamento compleanni di oggi:', error);
            setTodayBirthdays([]);
          }
        );

        return unsubscribe;
      } catch (error) {
        console.error('Errore setup listener compleanni:', error);
        setTodayBirthdays([]);
      }
    };

    let unsubscribe;
    setupBirthdaysListener().then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user?.uid]);

  const totalCount = pendingCount + todayBirthdays.length;
  const birthdayNames = todayBirthdays.map((b) => b.name).filter(Boolean);
  const titleParts = [];
  if (todayBirthdays.length > 0) {
    titleParts.push(
      todayBirthdays.length === 1
        ? `Oggi e' il compleanno di ${birthdayNames[0] || 'una persona'}`
        : `Oggi ci sono ${todayBirthdays.length} compleanni: ${birthdayNames.join(', ')}`
    );
  }
  if (pendingCount > 0) {
    titleParts.push(`${pendingCount} utenti in attesa di approvazione`);
  }
  if (titleParts.length === 0) {
    titleParts.push('Nessuna notifica');
  }

  const handleClick = () => {
    if (todayBirthdays.length > 0 && typeof onOpenBirthdays === 'function') {
      onOpenBirthdays();
      return;
    }
    if (pendingCount > 0 && typeof onOpenAdmin === 'function') {
      onOpenAdmin();
    }
  };

  return (
    <button
      className="action-btn notification-btn"
      type="button"
      onClick={handleClick}
      title={titleParts.join(' | ')}
    >
      <FiBell />
      {totalCount > 0 && <span className="notification-badge">{totalCount}</span>}
    </button>
  );
}

export default NotificationBadge;
