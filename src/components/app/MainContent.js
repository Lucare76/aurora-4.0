import React from 'react';
import Reports from '../../pages/Reports';
import Transactions from '../../pages/Transactions';
import Accounts from '../../pages/Accounts';
import Categories from '../../pages/Categories';
import Importa from '../../pages/Importa';
import Budgets from '../../pages/Budgets';
import Birthdays from '../../pages/Birthdays';
import SavingsGoals from '../../pages/SavingsGoals';
import AdminApproval from '../../pages/AdminApproval';
import { useAuth } from '../../contexts/AuthContext';
import Header from './Header';
import DashboardContent from './DashboardContent';
import SettingsContent from './SettingsContent';

function MainContent({ activeMenu, setActiveMenu, pendingFilter, setPendingFilter, setSidebarOpen }) {
  const { isAdmin } = useAuth();

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return <DashboardContent setActiveMenu={setActiveMenu} setPendingFilter={setPendingFilter} />;
      case 'accounts':
        return <Accounts />;
      case 'transactions':
        return <Transactions initialFilter={pendingFilter} onFilterConsumed={() => setPendingFilter(null)} />;
      case 'categories':
        return <Categories />;
      case 'reports':
        return <Reports />;
      case 'budgets':
        return <Budgets />;
      case 'savings':
        return <SavingsGoals />;
      case 'import':
        return <Importa />;
      case 'birthdays':
        return <Birthdays />;
      case 'admin':
        if (!isAdmin) return <DashboardContent setActiveMenu={setActiveMenu} setPendingFilter={setPendingFilter} />;
        return <AdminApproval />;
      case 'settings':
        return <SettingsContent />;
      default:
        return <DashboardContent setActiveMenu={setActiveMenu} setPendingFilter={setPendingFilter} />;
    }
  };

  return (
    <div className="main-content">
      <Header setSidebarOpen={setSidebarOpen} />
      <div className="content-area">{renderContent()}</div>
    </div>
  );
}

export default MainContent;
