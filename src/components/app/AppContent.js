import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';
import MainContent from './MainContent';
import Login from './Login';
import PendingApproval from './PendingApproval';
import OnboardingTour from './OnboardingTour';

function AppContent() {
  const MENU_STORAGE_KEY = 'aurora_active_menu';

  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [pendingFilter, setPendingFilter] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, userSettings, setUserSettings, loading: authLoading, userApprovalStatus, logout } = useAuth();

  useEffect(() => {
    try {
      localStorage.setItem(MENU_STORAGE_KEY, activeMenu);
    } catch {
      // ignore
    }
  }, [activeMenu]);

  useEffect(() => {
    if (!user) {
      setActiveMenu('dashboard');
      try {
        localStorage.setItem(MENU_STORAGE_KEY, 'dashboard');
      } catch {
        // ignore
      }
    }
  }, [user]);

  if (authLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#f8fafc'
        }}
      >
        <div>Caricamento...</div>
      </div>
    );
  }

  if (!user) return <Login />;

  if (userApprovalStatus && !userApprovalStatus.approved) {
    return <PendingApproval user={user} onLogout={logout} />;
  }

  return (
    <div className="app">
      <Sidebar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      <MainContent
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        pendingFilter={pendingFilter}
        setPendingFilter={setPendingFilter}
        setSidebarOpen={setSidebarOpen}
      />
      <OnboardingTour
        user={user}
        userSettings={userSettings}
        setUserSettings={setUserSettings}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
      />
    </div>
  );
}

export default AppContent;
