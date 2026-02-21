<<<<<<< HEAD
// src/pages/AdminApproval.js
=======
// src/pages/AdminApproval.js - PAGINA PER APPROVARE UTENTI

>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
import React, { useState, useEffect } from 'react';
import { getPendingUsers, approveUser, rejectUser } from '../services/userApprovalService';
import { FiCheck, FiX, FiClock, FiMail, FiUser } from 'react-icons/fi';

function AdminApproval() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approving, setApproving] = useState({});
  const [rejecting, setRejecting] = useState({});

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const loadPendingUsers = async () => {
    setLoading(true);
    setError('');
<<<<<<< HEAD

    const result = await getPendingUsers();

    if (result.success) setPendingUsers(result.users);
    else setError(result.error || 'Errore caricamento utenti');

=======
    
    const result = await getPendingUsers();
    
    if (result.success) {
      setPendingUsers(result.users);
    } else {
      setError(result.error || 'Errore caricamento utenti');
    }
    
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
    setLoading(false);
  };

  const handleApprove = async (userId, userName) => {
<<<<<<< HEAD
    if (approving[userId]) {
      console.log('Approvazione gi� in corso...');
      return;
    }

    if (!window.confirm(`Confermi di voler approvare ${userName}?`)) return;

    setApproving((prev) => ({ ...prev, [userId]: true }));

    try {
      const result = await approveUser(userId);

      if (result.success) {
        alert(`${userName} � stato approvato! Email di notifica inviata.`);
        loadPendingUsers();
      } else {
        alert("Errore durante l'approvazione");
      }
    } catch (err) {
      console.error('Errore approvazione:', err);
      alert("Errore durante l'approvazione");
    } finally {
      setApproving((prev) => ({ ...prev, [userId]: false }));
=======
    // Previeni doppio click
    if (approving[userId]) {
      console.log('⚠️ Approvazione già in corso...');
      return;
    }
    
    if (!window.confirm(`Confermi di voler approvare ${userName}?`)) return;
    
    setApproving(prev => ({ ...prev, [userId]: true }));
    
    try {
      // ✅ L'email viene inviata automaticamente dentro approveUser()
      const result = await approveUser(userId);
      
      if (result.success) {
        alert(`✅ ${userName} è stato approvato! Email di notifica inviata.`);
        loadPendingUsers(); // Ricarica lista
      } else {
        alert('❌ Errore durante l\'approvazione');
      }
    } catch (error) {
      console.error('Errore approvazione:', error);
      alert('❌ Errore durante l\'approvazione');
    } finally {
      setApproving(prev => ({ ...prev, [userId]: false }));
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
    }
  };

  const handleReject = async (userId, userName) => {
<<<<<<< HEAD
    if (rejecting[userId]) {
      console.log('Rifiuto gi� in corso...');
      return;
    }

    const reason = window.prompt(`Perch� vuoi rifiutare ${userName}?\n(Opzionale, sar� inviato via email)`);
    if (reason === null) return;

    setRejecting((prev) => ({ ...prev, [userId]: true }));

    try {
      const result = await rejectUser(userId, reason);

      if (result.success) {
        alert(`${userName} � stato rifiutato.`);
        loadPendingUsers();
      } else {
        alert('Errore durante il rifiuto');
      }
    } catch (err) {
      console.error('Errore rifiuto:', err);
      alert('Errore durante il rifiuto');
    } finally {
      setRejecting((prev) => ({ ...prev, [userId]: false }));
=======
    // Previeni doppio click
    if (rejecting[userId]) {
      console.log('⚠️ Rifiuto già in corso...');
      return;
    }
    
    const reason = window.prompt(
      `Perché vuoi rifiutare ${userName}?\n(Opzionale, sarà inviato via email)`
    );
    
    if (reason === null) return; // Annullato
    
    setRejecting(prev => ({ ...prev, [userId]: true }));
    
    try {
      const result = await rejectUser(userId, reason);
      
      if (result.success) {
        alert(`🚫 ${userName} è stato rifiutato.`);
        loadPendingUsers(); // Ricarica lista
      } else {
        alert('❌ Errore durante il rifiuto');
      }
    } catch (error) {
      console.error('Errore rifiuto:', error);
      alert('❌ Errore durante il rifiuto');
    } finally {
      setRejecting(prev => ({ ...prev, [userId]: false }));
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
<<<<<<< HEAD
=======
    
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="content-page">
      <div className="aurora-background">
        <div className="aurora-layer-1"></div>
        <div className="aurora-layer-2"></div>
        <div className="aurora-layer-3"></div>
      </div>

      <div className="dashboard-content">
        <div className="page-header">
<<<<<<< HEAD
          <h1>Approvazione Utenti</h1>
=======
          <h1>👥 Approvazione Utenti</h1>
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
          <p>Gestisci le richieste di accesso all'applicazione</p>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Caricamento utenti in attesa...</p>
          </div>
        ) : error ? (
          <div className="error-state">
<<<<<<< HEAD
            <p style={{ color: '#ef4444' }}>{error}</p>
            <button onClick={loadPendingUsers} className="btn-retry" type="button">
=======
            <p style={{ color: '#ef4444' }}>❌ {error}</p>
            <button onClick={loadPendingUsers} className="btn-retry">
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
              Riprova
            </button>
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className="empty-state">
<<<<<<< HEAD
            <div className="empty-icon">OK</div>
=======
            <div className="empty-icon">✅</div>
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
            <h3>Nessun utente in attesa</h3>
            <p>Tutti gli utenti sono stati approvati o rifiutati</p>
          </div>
        ) : (
          <div className="users-grid">
<<<<<<< HEAD
            {pendingUsers.map((u) => (
              <div key={u.id} className="user-approval-card">
                <div className="user-header">
                  <div className="user-avatar">
                    {u.photoURL ? <img src={u.photoURL} alt={u.displayName} /> : <FiUser size={32} />}
                  </div>

                  <div className="user-info">
                    <h3>{u.displayName || 'Nome non fornito'}</h3>
                    <div className="user-meta">
                      <span className="meta-item">
                        <FiMail size={14} />
                        {u.email}
                      </span>
                      <span className="meta-item">
                        <FiClock size={14} />
                        {formatDate(u.createdAt)}
=======
            {pendingUsers.map((user) => (
              <div key={user.id} className="user-approval-card">
                <div className="user-header">
                  <div className="user-avatar">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName} />
                    ) : (
                      <FiUser size={32} />
                    )}
                  </div>
                  
                  <div className="user-info">
                    <h3>{user.displayName || 'Nome non fornito'}</h3>
                    <div className="user-meta">
                      <span className="meta-item">
                        <FiMail size={14} />
                        {user.email}
                      </span>
                      <span className="meta-item">
                        <FiClock size={14} />
                        {formatDate(user.createdAt)}
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
                      </span>
                    </div>
                  </div>
                </div>

                <div className="user-actions">
                  <button
                    className="btn-approve"
<<<<<<< HEAD
                    onClick={() => handleApprove(u.id, u.displayName || u.email)}
                    disabled={approving[u.id]}
                    type="button"
                  >
                    <FiCheck />
                    {approving[u.id] ? 'Approvazione...' : 'Approva'}
                  </button>

                  <button
                    className="btn-reject"
                    onClick={() => handleReject(u.id, u.displayName || u.email)}
                    disabled={rejecting[u.id]}
                    type="button"
                  >
                    <FiX />
                    {rejecting[u.id] ? 'Rifiuto...' : 'Rifiuta'}
=======
                    onClick={() => handleApprove(user.id, user.displayName || user.email)}
                    disabled={approving[user.id]}
                    type="button"
                  >
                    <FiCheck />
                    {approving[user.id] ? 'Approvazione...' : 'Approva'}
                  </button>
                  
                  <button
                    className="btn-reject"
                    onClick={() => handleReject(user.id, user.displayName || user.email)}
                    disabled={rejecting[user.id]}
                    type="button"
                  >
                    <FiX />
                    {rejecting[user.id] ? 'Rifiuto...' : 'Rifiuta'}
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="admin-stats">
          <div className="stat-card">
            <div className="stat-value">{pendingUsers.length}</div>
            <div className="stat-label">In Attesa</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminApproval;
<<<<<<< HEAD
=======

/* =====================================================
   CSS PER ADMIN APPROVAL - Aggiungi al tuo App.css
   ===================================================== */

/*
.users-grid {
  display: grid;
  gap: 1.5rem;
  margin: 2rem 0;
}

.user-approval-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.user-approval-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.2);
}

.user-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.user-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-info {
  flex: 1;
}

.user-info h3 {
  color: white;
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

.user-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
}

.user-actions {
  display: flex;
  gap: 1rem;
}

.btn-approve,
.btn-reject {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  border: none;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-approve {
  background: rgba(34, 197, 94, 0.2);
  border: 1px solid rgba(34, 197, 94, 0.5);
  color: #22c55e;
}

.btn-approve:hover:not(:disabled) {
  background: rgba(34, 197, 94, 0.3);
  transform: translateY(-2px);
}

.btn-approve:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-reject {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.5);
  color: #ef4444;
}

.btn-reject:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.3);
  transform: translateY(-2px);
}

.btn-reject:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.admin-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.stat-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 1.5rem;
  text-align: center;
}

.stat-value {
  font-size: 3rem;
  font-weight: 700;
  color: white;
  margin-bottom: 0.5rem;
}

.stat-label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.btn-retry {
  background: rgba(79, 70, 229, 0.2);
  border: 1px solid rgba(79, 70, 229, 0.5);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  cursor: pointer;
  margin-top: 1rem;
}

.btn-retry:hover {
  background: rgba(79, 70, 229, 0.3);
}

@media (max-width: 768px) {
  .user-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .user-actions {
    flex-direction: column;
  }
}
*/
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
