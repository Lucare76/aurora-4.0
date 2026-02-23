import React from 'react';
import { FiMenu, FiLogOut } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import NotificationBadge from './NotificationBadge';

function Header({ setSidebarOpen }) {
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error('Errore logout:', e);
    }
  };

  return (
    <header className="header">
      <div className="aurora-background">
        <div className="aurora-layer-1"></div>
        <div className="aurora-layer-2"></div>
        <div className="aurora-layer-3"></div>
      </div>

      <div className="header-content">
        <button className="menu-toggle" onClick={() => setSidebarOpen(true)} type="button">
          <FiMenu />
        </button>

        <div className="header-actions">
          <NotificationBadge />

          <button
            className="logout-btn header-logout mobile-only"
            onClick={handleLogout}
            title="Logout"
            type="button"
          >
            <FiLogOut />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
