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

function toDate(value) {
  if (!value) return null;
  if (value && typeof value === 'object' && typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getDaysUntilDate(targetDate) {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const targetStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const diffMs = targetStart.getTime() - todayStart.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function NotificationBadge({ onOpenBirthdays, onOpenSubscriptions, onOpenAdmin }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [todayBirthdays, setTodayBirthdays] = useState([]);
  const [todaySubscriptions, setTodaySubscriptions] = useState([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);
  const [upcomingSubscriptions, setUpcomingSubscriptions] = useState([]);
  const [seenBirthdayIds, setSeenBirthdayIds] = useState([]);
  const [seenSubscriptionIds, setSeenSubscriptionIds] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loadingBirthdays, setLoadingBirthdays] = useState(false);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [loadingPending, setLoadingPending] = useState(false);
  const [birthdaysError, setBirthdaysError] = useState('');
  const [subscriptionsError, setSubscriptionsError] = useState('');
  const [pendingError, setPendingError] = useState('');
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [historyItems, setHistoryItems] = useState([]);
  const { user, isAdmin } = useAuth();
  const rootRef = useRef(null);

  const appendHistory = (entry) => {
    if (!user?.uid) return;
    const item = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      at: new Date().toISOString(),
      ...entry
    };
    setHistoryItems((prev) => {
      const next = [item, ...prev].slice(0, 20);
      try {
        localStorage.setItem(`aurora_notification_history_${user.uid}`, JSON.stringify(next));
      } catch {
        // ignore localStorage errors
      }
      return next;
    });
  };

  useEffect(() => {
    if (!user || !isAdmin) {
      setPendingCount(0);
      setLoadingPending(false);
      setPendingError('');
      return;
    }

    const setupListener = async () => {
      try {
        setLoadingPending(true);
        setPendingError('');
        const { collection, query, where, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('../../services/firebase');

        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('status', '==', 'pending'));

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            setPendingCount(snapshot.size);
            setLoadingPending(false);
          },
          (error) => {
            console.error('Errore conteggio pending:', error);
            setPendingCount(0);
            setLoadingPending(false);
            setPendingError('Impossibile caricare approvazioni admin.');
          }
        );

        return unsubscribe;
      } catch (error) {
        console.error('Errore setup listener:', error);
        setPendingCount(0);
        setLoadingPending(false);
        setPendingError('Impossibile inizializzare notifiche admin.');
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
      setLoadingBirthdays(false);
      setBirthdaysError('');
      return;
    }

    const setupBirthdaysListener = async () => {
      try {
        setLoadingBirthdays(true);
        setBirthdaysError('');
        const { collection, query, where, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('../../services/firebase');
        const q = query(collection(db, 'birthdays'), where('userId', '==', user.uid));

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const all = snapshot.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .map((b) => ({ ...b, daysUntil: getDaysUntilBirthday(b?.date) }))
              .filter((b) => Number.isFinite(b.daysUntil));
            const todayList = all.filter((b) => b.daysUntil === 0);
            const upcomingList = all
              .filter((b) => b.daysUntil > 0 && b.daysUntil <= 7)
              .sort((a, b) => a.daysUntil - b.daysUntil);
            setTodayBirthdays(todayList);
            setUpcomingBirthdays(upcomingList);
            setLoadingBirthdays(false);
          },
          (error) => {
            console.error('Errore caricamento compleanni di oggi:', error);
            setTodayBirthdays([]);
            setUpcomingBirthdays([]);
            setLoadingBirthdays(false);
            setBirthdaysError('Impossibile caricare i compleanni di oggi.');
          }
        );

        return unsubscribe;
      } catch (error) {
        console.error('Errore setup listener compleanni:', error);
        setTodayBirthdays([]);
        setUpcomingBirthdays([]);
        setLoadingBirthdays(false);
        setBirthdaysError('Impossibile inizializzare notifiche compleanni.');
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
      setHistoryItems([]);
      return;
    }
    try {
      const raw = localStorage.getItem(`aurora_notification_history_${user.uid}`);
      const parsed = JSON.parse(raw || '[]');
      setHistoryItems(Array.isArray(parsed) ? parsed : []);
    } catch {
      setHistoryItems([]);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setTodaySubscriptions([]);
      setLoadingSubscriptions(false);
      setSubscriptionsError('');
      return;
    }

    const setupSubscriptionsListener = async () => {
      try {
        setLoadingSubscriptions(true);
        setSubscriptionsError('');
        const { collection, query, where, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('../../services/firebase');
        const q = query(collection(db, 'subscriptions'), where('userId', '==', user.uid));

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const today = new Date();
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const all = snapshot.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .filter((s) => s.active !== false)
              .map((s) => {
                const due = toDate(s.nextDueDate);
                if (!due) return { ...s, dueDate: null, daysUntil: null };
                const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate());
                return { ...s, dueDate: dueStart, daysUntil: getDaysUntilDate(dueStart) };
              })
              .filter((s) => s.dueDate && Number.isFinite(s.daysUntil));

            const todayList = all.filter((s) => isSameDay(s.dueDate, todayStart));
            const upcomingList = all
              .filter((s) => s.daysUntil > 0 && s.daysUntil <= 7)
              .sort((a, b) => a.daysUntil - b.daysUntil);

            setTodaySubscriptions(todayList);
            setUpcomingSubscriptions(upcomingList);
            setLoadingSubscriptions(false);
          },
          (error) => {
            console.error('Errore caricamento abbonamenti di oggi:', error);
            setTodaySubscriptions([]);
            setUpcomingSubscriptions([]);
            setLoadingSubscriptions(false);
            setSubscriptionsError('Impossibile caricare abbonamenti in scadenza oggi.');
          }
        );

        return unsubscribe;
      } catch (error) {
        console.error('Errore setup listener abbonamenti:', error);
        setTodaySubscriptions([]);
        setUpcomingSubscriptions([]);
        setLoadingSubscriptions(false);
        setSubscriptionsError('Impossibile inizializzare notifiche abbonamenti.');
      }
    };

    let unsubscribe;
    setupSubscriptionsListener().then((unsub) => {
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
    if (!user?.uid) {
      setSeenSubscriptionIds([]);
      return;
    }
    try {
      const raw = localStorage.getItem(`aurora_seen_subscriptions_${user.uid}_${getTodayKey()}`);
      const parsed = JSON.parse(raw || '[]');
      setSeenSubscriptionIds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setSeenSubscriptionIds([]);
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
  const unseenTodaySubscriptions = todaySubscriptions.filter((s) => !seenSubscriptionIds.includes(s.id));
  const hasUpcoming = upcomingBirthdays.length > 0 || upcomingSubscriptions.length > 0;

  const totalCount = pendingCount + unseenTodayBirthdays.length + unseenTodaySubscriptions.length;
  const birthdayNames = todayBirthdays.map((b) => b.name).filter(Boolean);
  const subscriptionNames = todaySubscriptions.map((s) => s.name).filter(Boolean);
  const titleParts = [];
  if (unseenTodaySubscriptions.length > 0) {
    titleParts.push(
      unseenTodaySubscriptions.length === 1
        ? `Oggi scade ${subscriptionNames[0] || 'un abbonamento'}`
        : `Oggi scadono ${unseenTodaySubscriptions.length} abbonamenti: ${subscriptionNames.join(', ')}`
    );
  }
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
      appendHistory({
        type: 'birthday_seen',
        label: `Segnati visti ${todayBirthdays.length} compleanni`
      });
    }
  };

  const markTodaySubscriptionsAsSeen = () => {
    if (todaySubscriptions.length > 0) {
      const ids = todaySubscriptions.map((s) => s.id).filter(Boolean);
      const merged = Array.from(new Set([...seenSubscriptionIds, ...ids]));
      setSeenSubscriptionIds(merged);
      try {
        if (user?.uid) {
          localStorage.setItem(
            `aurora_seen_subscriptions_${user.uid}_${getTodayKey()}`,
            JSON.stringify(merged)
          );
        }
      } catch {
        // ignore localStorage errors
      }
      appendHistory({
        type: 'subscription_seen',
        label: `Segnati visti ${todaySubscriptions.length} abbonamenti`
      });
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
    appendHistory({
      type: 'birthday_unseen',
      label: 'Compleanni segnati non letti'
    });
  };

  const markTodaySubscriptionsAsUnseen = () => {
    if (!user?.uid) return;
    setSeenSubscriptionIds([]);
    try {
      localStorage.removeItem(`aurora_seen_subscriptions_${user.uid}_${getTodayKey()}`);
    } catch {
      // ignore localStorage errors
    }
    appendHistory({
      type: 'subscription_unseen',
      label: 'Abbonamenti segnati non letti'
    });
  };

  const handleBellClick = () => {
    if (!menuOpen) {
      markTodayBirthdaysAsSeen();
      markTodaySubscriptionsAsSeen();
    }
    setMenuOpen((prev) => !prev);
  };

  const handleOpenBirthdays = () => {
    setMenuOpen(false);
    if (todayBirthdays.length > 0 && typeof onOpenBirthdays === 'function') {
      appendHistory({
        type: 'open_birthdays',
        label: 'Aperta sezione compleanni'
      });
      onOpenBirthdays();
    }
  };

  const handleOpenSubscriptions = () => {
    setMenuOpen(false);
    if (todaySubscriptions.length > 0 && typeof onOpenSubscriptions === 'function') {
      appendHistory({
        type: 'open_subscriptions',
        label: 'Aperta sezione abbonamenti'
      });
      onOpenSubscriptions();
    }
  };

  const handleOpenAdmin = () => {
    setMenuOpen(false);
    if (pendingCount > 0 && typeof onOpenAdmin === 'function') {
      appendHistory({
        type: 'open_admin',
        label: 'Aperta sezione approvazioni admin'
      });
      onOpenAdmin();
    }
  };

  const showSubscriptionsToday = notificationFilter === 'all' || notificationFilter === 'urgent' || notificationFilter === 'subscriptions';
  const showBirthdaysToday = notificationFilter === 'all' || notificationFilter === 'urgent' || notificationFilter === 'birthdays';
  const showAdmin = notificationFilter === 'all' || notificationFilter === 'admin';
  const showUpcoming = notificationFilter === 'all' || notificationFilter === 'upcoming';

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

          <div className="notification-filter-row">
            <button type="button" className={`notification-filter-chip ${notificationFilter === 'all' ? 'active' : ''}`} onClick={() => setNotificationFilter('all')}>Tutte</button>
            <button type="button" className={`notification-filter-chip ${notificationFilter === 'urgent' ? 'active' : ''}`} onClick={() => setNotificationFilter('urgent')}>Urgenti</button>
            <button type="button" className={`notification-filter-chip ${notificationFilter === 'subscriptions' ? 'active' : ''}`} onClick={() => setNotificationFilter('subscriptions')}>Abbonamenti</button>
            <button type="button" className={`notification-filter-chip ${notificationFilter === 'birthdays' ? 'active' : ''}`} onClick={() => setNotificationFilter('birthdays')}>Compleanni</button>
            <button type="button" className={`notification-filter-chip ${notificationFilter === 'upcoming' ? 'active' : ''}`} onClick={() => setNotificationFilter('upcoming')}>Prossimi 7g</button>
            {isAdmin && <button type="button" className={`notification-filter-chip ${notificationFilter === 'admin' ? 'active' : ''}`} onClick={() => setNotificationFilter('admin')}>Admin</button>}
          </div>

          {showSubscriptionsToday && (loadingSubscriptions ? (
            <div className="notification-empty">Caricamento abbonamenti oggi...</div>
          ) : subscriptionsError ? (
            <div className="notification-error">{subscriptionsError}</div>
          ) : todaySubscriptions.length > 0 ? (
            <div className="notification-block">
              <div className="notification-block-title">Abbonamenti in scadenza oggi ({todaySubscriptions.length})</div>
              <div className="notification-list">
                {todaySubscriptions.map((s) => {
                  const unseen = !seenSubscriptionIds.includes(s.id);
                  return (
                    <div className="notification-list-item" key={s.id}>
                      <span>{s.name || 'Abbonamento'}</span>
                      <span className={`notification-pill ${unseen ? 'new' : 'seen'}`}>{unseen ? 'Nuovo' : 'Visto'}</span>
                    </div>
                  );
                })}
              </div>
              <div className="notification-actions-row">
                <button type="button" className="notification-link-btn" onClick={handleOpenSubscriptions}>
                  Apri abbonamenti
                </button>
                <button type="button" className="notification-link-btn" onClick={markTodaySubscriptionsAsUnseen}>
                  Segna non letto
                </button>
              </div>
            </div>
          ) : (
            <div className="notification-empty">Nessun abbonamento in scadenza oggi.</div>
          ))}

          {showBirthdaysToday && (loadingBirthdays ? (
            <div className="notification-empty">Caricamento compleanni...</div>
          ) : birthdaysError ? (
            <div className="notification-error">{birthdaysError}</div>
          ) : todayBirthdays.length > 0 ? (
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
          ))}

          {isAdmin && showAdmin && loadingPending && <div className="notification-empty">Caricamento notifiche admin...</div>}
          {isAdmin && showAdmin && !!pendingError && <div className="notification-error">{pendingError}</div>}
          {isAdmin && showAdmin && pendingCount > 0 && (
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

          {showUpcoming && hasUpcoming && (
            <div className="notification-block">
              <div className="notification-block-title">Prossimi 7 giorni</div>
              <div className="notification-list">
                {upcomingSubscriptions.map((s) => (
                  <div className="notification-list-item" key={`up-sub-${s.id}`}>
                    <span>{s.name || 'Abbonamento'}</span>
                    <span className="notification-list-item-meta">Abbonamento tra {s.daysUntil}g</span>
                  </div>
                ))}
                {upcomingBirthdays.map((b) => (
                  <div className="notification-list-item" key={`up-bday-${b.id}`}>
                    <span>{b.name || 'Compleanno'}</span>
                    <span className="notification-list-item-meta">Compleanno tra {b.daysUntil}g</span>
                  </div>
                ))}
              </div>
              <div className="notification-actions-row">
                {upcomingSubscriptions.length > 0 && (
                  <button type="button" className="notification-link-btn" onClick={handleOpenSubscriptions}>
                    Apri abbonamenti
                  </button>
                )}
                {upcomingBirthdays.length > 0 && (
                  <button type="button" className="notification-link-btn" onClick={handleOpenBirthdays}>
                    Apri compleanni
                  </button>
                )}
              </div>
            </div>
          )}

          {historyItems.length > 0 && notificationFilter === 'all' && (
            <div className="notification-block">
              <div className="notification-block-title">Cronologia recente</div>
              <div className="notification-list">
                {historyItems.slice(0, 5).map((h) => (
                  <div className="notification-list-item" key={h.id}>
                    <span>{h.label || 'Azione notifica'}</span>
                    <span className="notification-list-item-meta">
                      {new Date(h.at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBadge;
