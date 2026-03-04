import React, { Suspense, lazy } from 'react';
import Transactions from '../../pages/Transactions';
import Accounts from '../../pages/Accounts';
import Categories from '../../pages/Categories';
import Budgets from '../../pages/Budgets';
import Birthdays from '../../pages/Birthdays';
import SavingsGoals from '../../pages/SavingsGoals';
import Recurring from '../../pages/Recurring';
import Subscriptions from '../../pages/Subscriptions';
import AdminApproval from '../../pages/AdminApproval';
import { useAuth } from '../../contexts/AuthContext';
import Header from './Header';
import DashboardContent from './DashboardContent';
import SettingsContent from './SettingsContent';
import QuickAddFab from './QuickAddFab';

const Reports = lazy(() => import('../../pages/Reports'));
const Importa = lazy(() => import('../../pages/Importa'));

const LazyFallback = () => (
  <div className="loading-state">
    <div className="loading-spinner" />
  </div>
);

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
        return (
          <Suspense fallback={<LazyFallback />}>
            <Reports />
          </Suspense>
        );
      case 'budgets':
        return <Budgets />;
      case 'savings':
        return <SavingsGoals />;
      case 'recurring':
        return <Recurring />;
      case 'subscriptions':
        return <Subscriptions />;
      case 'import':
        return (
          <Suspense fallback={<LazyFallback />}>
            <Importa />
          </Suspense>
        );
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
      <Header setSidebarOpen={setSidebarOpen} setActiveMenu={setActiveMenu} />
      <div className="content-area">{renderContent()}</div>
      <QuickAddFab setActiveMenu={setActiveMenu} />
    </div>
  );
}

export default MainContent;
