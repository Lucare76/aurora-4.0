import React from 'react';

function PendingApproval({ user, onLogout }) {
  return (
    <div className="pending-approval-page">
      <div className="aurora-background">
        <div className="aurora-layer-1"></div>
        <div className="aurora-layer-2"></div>
        <div className="aurora-layer-3"></div>
      </div>

      <div className="pending-approval-container">
        <div className="pending-approval-card">
          <div className="approval-icon">⏳</div>

          <h1>Account in Attesa di Approvazione</h1>

          <div className="approval-message">
            <p>
              Ciao <strong>{user?.displayName || 'Utente'}</strong>! 👋
            </p>
            <p>
              Il tuo account è stato creato con successo ma è in attesa di approvazione da parte
              dell'amministratore.
            </p>
            <p>
              Riceverai una email a <strong>{user?.email}</strong> non appena il tuo account verrà attivato.
            </p>
          </div>

          <div className="approval-info">
            <div className="info-item">
              <span className="info-icon">📧</span>
              <div>
                <strong>Email registrata</strong>
                <p>{user?.email}</p>
              </div>
            </div>

            <div className="info-item">
              <span className="info-icon">⏱️</span>
              <div>
                <strong>Tempo di attesa</strong>
                <p>Di solito entro 24 ore</p>
              </div>
            </div>
          </div>

          <div className="approval-actions">
            <button className="btn-logout" onClick={onLogout} type="button">
              Logout
            </button>
          </div>

          <div className="approval-footer">
            <p>Hai bisogno di aiuto? Contatta l'amministratore</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PendingApproval;
