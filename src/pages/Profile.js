import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import './Profile.css';

const Profile = () => {
  const { currentUser } = useContext(AuthContext);
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = () => {
    // Qui va la logica per salvare le modifiche
    setMessage('Profilo aggiornato con successo!');
    setIsEditing(false);
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="profile-page">
      <h1>Il Tuo Profilo</h1>
      
      <div className="profile-card">
        <div className="profile-header">
          <div className="avatar">
            {currentUser?.name?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
          </div>
          <div className="profile-info">
            <h2>{currentUser?.name || 'Utente'}</h2>
            <p>{currentUser?.email}</p>
          </div>
        </div>

        {message && (
          <div className="success-message">
            {message}
          </div>
        )}

        <div className="profile-details">
          <div className="detail-item">
            <span className="label">Nome:</span>
            {isEditing ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="edit-input"
              />
            ) : (
              <span className="value">{currentUser?.name || 'Non impostato'}</span>
            )}
          </div>

          <div className="detail-item">
            <span className="label">Email:</span>
            <span className="value">{currentUser?.email}</span>
          </div>

          <div className="detail-item">
            <span className="label">ID Utente:</span>
            <span className="value code">{currentUser?.uid?.substring(0, 8)}...</span>
          </div>

          <div className="detail-item">
            <span className="label">Data Registrazione:</span>
            <span className="value">Non disponibile</span>
          </div>
        </div>

        <div className="profile-actions">
          {isEditing ? (
            <>
              <button onClick={handleSave} className="btn btn-primary">
                Salva Modifiche
              </button>
              <button onClick={() => setIsEditing(false)} className="btn btn-secondary">
                Annulla
              </button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} className="btn btn-primary">
              Modifica Profilo
            </button>
          )}
        </div>
      </div>

      <div className="account-actions">
        <h3>Azioni Account</h3>
        <div className="actions-grid">
          <button className="action-btn">
            <span className="icon">🔐</span>
            <span>Cambia Password</span>
          </button>
          <button className="action-btn">
            <span className="icon">📧</span>
            <span>Modifica Email</span>
          </button>
          <button className="action-btn danger">
            <span className="icon">🗑️</span>
            <span>Elimina Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;