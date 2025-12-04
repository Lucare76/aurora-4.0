import React from 'react';
import { Link } from 'react-router-dom';
import './NotFound.css';

const NotFound = () => {
  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <h1>404</h1>
        <h2>Pagina non trovata</h2>
        <p>La pagina che stai cercando non esiste o è stata spostata.</p>
        <div className="not-found-actions">
          <Link to="/dashboard" className="btn btn-primary">
            Torna alla Dashboard
          </Link>
          <Link to="/transactions" className="btn btn-secondary">
            Vai alle Transazioni
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;