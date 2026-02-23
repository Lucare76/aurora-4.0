// src/App.js
import React, { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthContext';
import { FinancialProvider } from './contexts/FinancialContext';
import { initEmailJS } from './services/emailService';
import AppContent from './components/app/AppContent';
import './App.css';

function App() {
  useEffect(() => {
    initEmailJS();
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
