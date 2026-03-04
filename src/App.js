// src/App.js
import React, { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthContext';
import { FinancialProvider } from './contexts/FinancialContext';
import { initEmailJS } from './services/emailService';
import { logRuntimeIssue } from './utils/reliability';
import AppContent from './components/app/AppContent';
import './App.css';

function App() {
  useEffect(() => {
    initEmailJS();

    const onUnhandledRejection = (event) => {
      logRuntimeIssue(event?.reason || 'Unhandled promise rejection', 'unhandled_rejection');
    };
    const onWindowError = (event) => {
      logRuntimeIssue(event?.error || event?.message || 'Window error', 'window_error');
    };

    window.addEventListener('unhandledrejection', onUnhandledRejection);
    window.addEventListener('error', onWindowError);
    return () => {
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      window.removeEventListener('error', onWindowError);
    };
  }, []);

  return (
    <Router>
      <AuthProvider>
        <FinancialProvider>
          <AppContent />
        </FinancialProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
