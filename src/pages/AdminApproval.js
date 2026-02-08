// src/pages/AdminApproval.js - PAGINA PER APPROVARE UTENTI

import React, { useState, useEffect } from 'react';
import { getPendingUsers, approveUser, rejectUser } from '../services/userApprovalService';
import { FiCheck, FiX, FiClock, FiMail, FiUser } from 'react-icons/fi';

function AdminApproval() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const loadPendingUsers = async () => {
    setLoading(true);
    setError('');
    
    const result = await getPendingUsers();
    
    if (result.success) {
      setPendingUsers(result.users);
    } else {
      setError(result.error || 'Errore caricamento utenti');
    }
    
    setLoading(false);
  };

  const handleApprove = async (userId, userName) => {
    if (!window.confirm(`Confermi di voler approvare ${userName}?`)) return;
    
    const result = await approveUser(userId);
    
    if (result.success) {
      alert(`✅ ${userName} è stato approvato!`);
      loadPendingUsers(); // Ricarica lista
    } else {
      alert('❌ Errore durante l\'approvazione');
    }
  };

  const handleReject = async (userId, userName) => {
    const reason = window.prompt(
      `Perché vuoi rifiutare ${userName}?\n(Opzionale, sarà inviato via email)`
    );
    
    if (reason === null) return; // Annullato
    
    const result = await rejectUser(userId, reason);
    
    if (result.success) {
      alert(`🚫 ${userName} è stato rifiutato`);
      loadPendingUsers(); // Ricarica lista
    } else {
      alert('❌ Errore durante il rifiuto');
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
          <h1>👥 Approvazione Utenti</h1>
          <p>Gestisci le richieste di accesso all'applicazione</p>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Caricamento utenti in attesa...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p style={{ color: '#ef4444' }}>❌ {error}</p>
            <button onClick={loadPendingUsers} className="btn-retry">
              Riprova
            </button>
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <h3>Nessun utente in attesa</h3>
            <p>Tutti gli utenti sono stati approvati o rifiutati</p>
          </div>
        ) : (
          <div className="users-grid">
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
                      </span>
                    </div>
                  </div>
                </div>

                <div className="user-actions">
                  <button
                    className="btn-approve"
                    onClick={() => handleApprove(user.id, user.displayName || user.email)}
                    type="button"
                  >
                    <FiCheck />
                    Approva
                  </button>
                  
                  <button
                    className="btn-reject"
                    onClick={() => handleReject(user.id, user.displayName || user.email)}
                    type="button"
                  >
                    <FiX />
                    Rifiuta
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

.btn-approve:hover {
  background: rgba(34, 197, 94, 0.3);
  transform: translateY(-2px);
}

.btn-reject {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.5);
  color: #ef4444;
}

.btn-reject:hover {
  background: rgba(239, 68, 68, 0.3);
  transform: translateY(-2px);
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