// src/pages/AdminApproval.js
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

    const result = await getPendingUsers();

    if (result.success) setPendingUsers(result.users);
    else setError(result.error || 'Errore caricamento utenti');

    setLoading(false);
  };

  const handleApprove = async (userId, userName) => {
    if (approving[userId]) {
      console.log('Approvazione già in corso...');
      return;
    }

    if (!window.confirm(`Confermi di voler approvare ${userName}?`)) return;

    setApproving((prev) => ({ ...prev, [userId]: true }));

    try {
      const result = await approveUser(userId);

      if (result.success) {
        alert(`${userName} è stato approvato! Email di notifica inviata.`);
        loadPendingUsers();
      } else {
        alert("Errore durante l'approvazione");
      }
    } catch (err) {
      console.error('Errore approvazione:', err);
      alert("Errore durante l'approvazione");
    } finally {
      setApproving((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleReject = async (userId, userName) => {
    if (rejecting[userId]) {
      console.log('Rifiuto già in corso...');
      return;
    }

    const reason = window.prompt(`Perché vuoi rifiutare ${userName}?\n(Opzionale, sarà inviato via email)`);
    if (reason === null) return;

    setRejecting((prev) => ({ ...prev, [userId]: true }));

    try {
      const result = await rejectUser(userId, reason);

      if (result.success) {
        alert(`${userName} è stato rifiutato.`);
        loadPendingUsers();
      } else {
        alert('Errore durante il rifiuto');
      }
    } catch (err) {
      console.error('Errore rifiuto:', err);
      alert('Errore durante il rifiuto');
    } finally {
      setRejecting((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
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
          <h1>Approvazione Utenti</h1>
          <p>Gestisci le richieste di accesso all'applicazione</p>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Caricamento utenti in attesa...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p style={{ color: '#ef4444' }}>{error}</p>
            <button onClick={loadPendingUsers} className="btn-retry" type="button">
              Riprova
            </button>
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">OK</div>
            <h3>Nessun utente in attesa</h3>
            <p>Tutti gli utenti sono stati approvati o rifiutati</p>
          </div>
        ) : (
          <div className="users-grid">
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
                      </span>
                    </div>
                  </div>
                </div>

                <div className="user-actions">
                  <button
                    className="btn-approve"
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
