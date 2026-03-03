import React, { useEffect, useRef, useState } from 'react';
import { FiBell } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { getDaysUntilBirthday } from '../../services/birthdaysService';

function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function NotificationBadge({ onOpenBirthdays, onOpenAdmin }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [todayBirthdays, setTodayBirthdays] = useState([]);
  const [seenBirthdayIds, setSeenBirthdayIds] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAdmin } = useAuth();
  const rootRef = useRef(null);

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

  useEffect(() => {
    if (!user?.uid) {
      setSeenBirthdayIds([]);
      return;
    }
    try {
      const raw = localStorage.getItem(`aurora_seen_birthdays_${user.uid}_${getTodayKey()}`);
      const parsed = JSON.parse(raw || '[]');
      setSeenBirthdayIds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setSeenBirthdayIds([]);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDocClick = (event) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpen]);

  const unseenTodayBirthdays = todayBirthdays.filter((b) => !seenBirthdayIds.includes(b.id));

  const totalCount = pendingCount + unseenTodayBirthdays.length;
  const birthdayNames = todayBirthdays.map((b) => b.name).filter(Boolean);
  const titleParts = [];
  if (unseenTodayBirthdays.length > 0) {
    titleParts.push(
      unseenTodayBirthdays.length === 1
        ? `Oggi e' il compleanno di ${birthdayNames[0] || 'una persona'}`
        : `Oggi ci sono ${unseenTodayBirthdays.length} compleanni: ${birthdayNames.join(', ')}`
    );
  }
  if (pendingCount > 0) {
    titleParts.push(`${pendingCount} utenti in attesa di approvazione`);
  }
  if (titleParts.length === 0) {
    titleParts.push('Nessuna notifica');
  }

  const markTodayBirthdaysAsSeen = () => {
    if (todayBirthdays.length > 0) {
      const ids = todayBirthdays.map((b) => b.id).filter(Boolean);
      const merged = Array.from(new Set([...seenBirthdayIds, ...ids]));
      setSeenBirthdayIds(merged);
      try {
        if (user?.uid) {
          localStorage.setItem(
            `aurora_seen_birthdays_${user.uid}_${getTodayKey()}`,
            JSON.stringify(merged)
          );
        }
      } catch {
        // ignore localStorage errors
      }
    }
  };

  const markTodayBirthdaysAsUnseen = () => {
    if (!user?.uid) return;
    setSeenBirthdayIds([]);
    try {
      localStorage.removeItem(`aurora_seen_birthdays_${user.uid}_${getTodayKey()}`);
    } catch {
      // ignore localStorage errors
    }
  };

  const handleBellClick = () => {
    if (!menuOpen) {
      markTodayBirthdaysAsSeen();
    }
    setMenuOpen((prev) => !prev);
  };

  const handleOpenBirthdays = () => {
    setMenuOpen(false);
    if (todayBirthdays.length > 0 && typeof onOpenBirthdays === 'function') {
      onOpenBirthdays();
    }
  };

  const handleOpenAdmin = () => {
    setMenuOpen(false);
    if (pendingCount > 0 && typeof onOpenAdmin === 'function') {
      onOpenAdmin();
    }
  };

  return (
    <div className="notification-root" ref={rootRef}>
      <button
        className="action-btn notification-btn"
        type="button"
        onClick={handleBellClick}
        title={titleParts.join(' | ')}
      >
        <FiBell />
        {totalCount > 0 && <span className="notification-badge">{totalCount}</span>}
      </button>

      {menuOpen && (
        <div className="notification-popover">
          <div className="notification-popover-head">
            <strong>Notifiche</strong>
          </div>

          {todayBirthdays.length > 0 ? (
            <div className="notification-block">
              <div className="notification-block-title">Compleanni oggi ({todayBirthdays.length})</div>
              <div className="notification-list">
                {todayBirthdays.map((b) => {
                  const unseen = !seenBirthdayIds.includes(b.id);
                  return (
                    <div className="notification-list-item" key={b.id}>
                      <span>{b.name || 'Compleanno'}</span>
                      <span className={`notification-pill ${unseen ? 'new' : 'seen'}`}>{unseen ? 'Nuovo' : 'Visto'}</span>
                    </div>
                  );
                })}
              </div>
              <div className="notification-actions-row">
                <button type="button" className="notification-link-btn" onClick={handleOpenBirthdays}>
                  Apri compleanni
                </button>
                <button type="button" className="notification-link-btn" onClick={markTodayBirthdaysAsUnseen}>
                  Segna non letto
                </button>
              </div>
            </div>
          ) : (
            <div className="notification-empty">Nessun compleanno oggi.</div>
          )}

          {pendingCount > 0 && (
            <div className="notification-block">
              <div className="notification-block-title">Admin</div>
              <div className="notification-list-item">
                <span>{pendingCount} utenti in attesa approvazione</span>
              </div>
              <div className="notification-actions-row">
                <button type="button" className="notification-link-btn" onClick={handleOpenAdmin}>
                  Apri approvazioni
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBadge;
