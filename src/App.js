// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import Reports from './pages/Reports';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import Categories from './pages/Categories';
import Importa from './pages/Importa';
import Budgets from './pages/Budgets';
import Birthdays from './pages/Birthdays';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FinancialProvider, useFinancial } from './contexts/FinancialContext';

import { getBudgetsByMonth } from './services/budgetsService';
import { initEmailJS } from './services/emailService';

import {
  FiHome,
  FiCreditCard,
  FiBarChart2,
  FiUpload,
  FiGift,
  FiSettings,
  FiDollarSign,
  FiUser,
  FiBell,
  FiMenu,
  FiX,
  FiPieChart,
  FiLogOut
} from 'react-icons/fi';

import { WiDaySunny } from 'react-icons/wi';
import './App.css';

// ==================== COMPONENTE LOGIN PREMIUM ====================
function Login() {
  const { loginWithGoogle, login, signup, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '', displayName: '' });
  const [loading, setLoading] = useState(false);
  const [activePanel, setActivePanel] = useState('login');
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    if (authLoading) return;
    try {
      setLoading(true);
      setError('');
      const res = await loginWithGoogle();
      if (res && res.success === false) setError(res.error || 'Errore login Google');
    } catch (e) {
      console.error('Errore Google login:', e);
      setError('Errore durante il login con Google: ' + (e?.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (authLoading) return;

    setLoading(true);
    setError('');

    try {
      if (activePanel === 'login') {
        const res = await login(formData.email, formData.password);
        if (res && res.success === false) setError(res.error || 'Errore login');
      } else {
        const res = await signup(formData.email, formData.password, { displayName: formData.displayName });
        if (res && res.success === false) setError(res.error || 'Errore registrazione');
      }
    } catch (err) {
      console.error('Errore autenticazione:', err);
      setError(
        `Errore durante ${activePanel === 'login' ? 'il login' : 'la registrazione'}: ${err?.message || ''}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

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
        <div>Caricamento autenticazione...</div>
      </div>
    );
  }

  return (
    <div className="login-page-premium">
      <div className="aurora-background">
        <div className="aurora-layer-1"></div>
        <div className="aurora-layer-2"></div>
        <div className="aurora-layer-3"></div>
        <div className="floating-particles">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                '--delay': `${i * 0.5}s`,
                '--duration': `${15 + i * 2}s`,
                '--size': `${20 + i * 3}px`,
                left: `${Math.random() * 100}%`
              }}
            />
          ))}
        </div>
      </div>

      <div className="login-container-premium">
        <div className="login-card-premium">
          <div className="login-header">
            <div className="logo-premium">
              <div className="logo-icon-premium">
                <div className="aurora-glow-premium"></div>
                <div className="logo-sparkle">✨</div>
                🌅
              </div>
              <div className="logo-text-premium">
                <h1>Aurora</h1>
                <span className="version">4.0</span>
              </div>
            </div>
            <p className="tagline">La rivoluzione nella tua contabilità familiare</p>
          </div>

          <div className="auth-tabs">
            <button
              className={`tab ${activePanel === 'login' ? 'active' : ''}`}
              onClick={() => setActivePanel('login')}
              type="button"
            >
              Accedi
            </button>
            <button
              className={`tab ${activePanel === 'register' ? 'active' : ''}`}
              onClick={() => setActivePanel('register')}
              type="button"
            >
              Registrati
            </button>
          </div>

          <div className="auth-content">
            {activePanel === 'login' ? (
              <>
                <div className="welcome-message">
                  <h2>Bentornato! 👋</h2>
                  <p>Accedi al tuo spazio finanziario personale</p>
                </div>

                <button
                  className="google-login-btn-premium"
                  onClick={handleGoogleLogin}
                  disabled={loading || authLoading}
                  type="button"
                >
                  <div className="google-btn-content">
                    <div className="google-icon-wrapper">
                      <svg className="google-icon" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    </div>
                    <span>{loading ? 'Accesso in corso...' : 'Continua con Google'}</span>
                  </div>
                  <div className="btn-glow" />
                </button>

                <div className="divider-premium">
                  <span>oppure con email</span>
                </div>

                {error && (
                  <div
                    style={{
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      padding: 10,
                      borderRadius: 6,
                      marginBottom: 10,
                      textAlign: 'center'
                    }}
                  >
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form-premium">
                  <div className="form-group-premium">
                    <input
                      type="email"
                      name="email"
                      placeholder=" "
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="form-input-premium"
                      disabled={loading}
                    />
                    <label className="form-label">Email</label>
                    <div className="input-decoration" />
                  </div>

                  <div className="form-group-premium">
                    <input
                      type="password"
                      name="password"
                      placeholder=" "
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="form-input-premium"
                      disabled={loading}
                    />
                    <label className="form-label">Password</label>
                    <div className="input-decoration" />
                  </div>

                  <button type="submit" className="auth-submit-btn-premium" disabled={loading || authLoading}>
                    <span className="btn-text">
                      {loading ? (
                        <>
                          <div className="loading-spinner" />
                          Accesso in corso...
                        </>
                      ) : (
                        'Accedi al Dashboard'
                      )}
                    </span>
                    <div className="btn-shine" />
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="welcome-message">
                  <h2>Unisciti a Noi! 🚀</h2>
                  <p>Crea il tuo spazio finanziario personalizzato</p>
                </div>

                {error && (
                  <div
                    style={{
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      padding: 10,
                      borderRadius: 6,
                      marginBottom: 10,
                      textAlign: 'center'
                    }}
                  >
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form-premium">
                  <div className="form-group-premium">
                    <input
                      type="text"
                      name="displayName"
                      placeholder=" "
                      value={formData.displayName}
                      onChange={handleChange}
                      required
                      className="form-input-premium"
                      disabled={loading}
                    />
                    <label className="form-label">Nome e Cognome</label>
                    <div className="input-decoration" />
                  </div>

                  <div className="form-group-premium">
                    <input
                      type="email"
                      name="email"
                      placeholder=" "
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="form-input-premium"
                      disabled={loading}
                    />
                    <label className="form-label">Email</label>
                    <div className="input-decoration" />
                  </div>

                  <div className="form-group-premium">
                    <input
                      type="password"
                      name="password"
                      placeholder=" "
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="form-input-premium"
                      disabled={loading}
                      minLength={6}
                    />
                    <label className="form-label">Password (min. 6 caratteri)</label>
                    <div className="input-decoration" />
                  </div>

                  <button
                    type="submit"
                    className="auth-submit-btn-premium register"
                    disabled={loading || authLoading}
                  >
                    <span className="btn-text">
                      {loading ? (
                        <>
                          <div className="loading-spinner" />
                          Creazione account...
                        </>
                      ) : (
                        'Crea il Mio Account'
                      )}
                    </span>
                    <div className="btn-shine" />
                  </button>
                </form>

                <div className="features-grid">
                  <div className="feature-item">
                    <div className="feature-icon">💰</div>
                    <span>Gestione Multi-Conto</span>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon">📊</div>
                    <span>Report Intelligenti</span>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon">🎁</div>
                    <span>Promemoria Compleanni</span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="login-footer">
            <p>
              {activePanel === 'login' ? 'Nuovo su Aurora? ' : 'Hai già un account? '}
              <button
                type="button"
                className="switch-btn-premium"
                onClick={() => setActivePanel(activePanel === 'login' ? 'register' : 'login')}
              >
                {activePanel === 'login' ? 'Crea un account' : 'Accedi'}
              </button>
            </p>
          </div>
        </div>

        <div className="features-panel">
          <div className="features-content">
            <h3>Scopri Aurora 4.0</h3>
            <div className="feature-list">
              <div className="feature-highlight">
                <div className="highlight-icon">🌅</div>
                <div className="highlight-text">
                  <strong>Design Aurora</strong>
                  <span>Interfaccia ispirata alle luci del nord</span>
                </div>
              </div>
              <div className="feature-highlight">
                <div className="highlight-icon">🤖</div>
                <div className="highlight-text">
                  <strong>AI Integrata</strong>
                  <span>Analisi intelligente delle tue finanze</span>
                </div>
              </div>
              <div className="feature-highlight">
                <div className="highlight-icon">📱</div>
                <div className="highlight-text">
                  <strong>Multi-Device</strong>
                  <span>Sincronizzazione in tempo reale</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ==================== SIDEBAR ====================
function Sidebar({ activeMenu, setActiveMenu, sidebarOpen, setSidebarOpen }) {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', icon: <FiHome />, label: 'Dashboard', color: '#4f46e5' },
    { id: 'accounts', icon: <FiCreditCard />, label: 'Conti', color: '#06b6d4' },
    { id: 'transactions', icon: <FiDollarSign />, label: 'Transazioni', color: '#10b981' },
    { id: 'categories', icon: <FiBarChart2 />, label: 'Categorie', color: '#8b5cf6' },
    { id: 'reports', icon: <FiBarChart2 />, label: 'Report', color: '#f59e0b' },
    { id: 'budgets', icon: <FiPieChart />, label: 'Budget', color: '#22c55e' },
    { id: 'import', icon: <FiUpload />, label: 'Importa', color: '#ef4444' },
    { id: 'birthdays', icon: <FiGift />, label: 'Compleanni', color: '#ec4899' },
    { id: 'settings', icon: <FiSettings />, label: 'Impostazioni', color: '#6b7280' }
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error('Errore logout:', e);
    }
  };

  return (
    <>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <div className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="aurora-background">
          <div className="aurora-layer-1"></div>
          <div className="aurora-layer-2"></div>
          <div className="aurora-layer-3"></div>
        </div>

        <div className="sidebar-content">
          <div className="sidebar-header">
            <div className="logo">
              <div className="logo-icon">
                <div className="aurora-glow"></div>🌅
              </div>
              <div className="logo-text">
                <h2>Aurora</h2>
                <span>4.0</span>
              </div>
            </div>
            <button className="close-sidebar" onClick={() => setSidebarOpen(false)} type="button">
              <FiX />
            </button>
          </div>

          <nav className="sidebar-nav">
            {menuItems.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${activeMenu === item.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveMenu(item.id);
                  setSidebarOpen(false);
                }}
                style={{ '--accent-color': item.color }}
                type="button"
              >
                <div className="nav-icon-wrapper">{item.icon}</div>
                <span className="nav-label">{item.label}</span>
                <div className="nav-indicator" />
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="weather-card">
              <WiDaySunny className="weather-icon" />
              <div className="weather-info">
                <div className="weather-temp">22°C</div>
                <div className="weather-location">Roma, Sole</div>
              </div>
            </div>

            <div className="user-card">
              <div className="user-avatar">
                {user?.photoURL ? <img src={user.photoURL} alt="Avatar" className="avatar-img" /> : <FiUser />}
              </div>
              <div className="user-info">
                <div className="user-name">{user?.displayName || 'Utente'}</div>
                <div className="user-status">Online</div>
              </div>
              <button className="logout-btn" onClick={handleLogout} title="Logout" type="button">
                <FiLogOut />
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

// ==================== HEADER ====================
function Header({ setSidebarOpen }) {
  const { user } = useAuth();
  const { accounts } = useFinancial();
  const totalBalance = (accounts || []).reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

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

        <div className="header-search">
          <input type="text" placeholder="Cerca transazioni, conti..." className="search-input" />
        </div>

        <div className="header-actions">
          <button className="action-btn notification-btn" type="button">
            <FiBell />
            <span className="notification-badge">3</span>
          </button>

          <div className="quick-stats">
            <div className="quick-stat">
              <span className="stat-label">Saldo</span>
              <span className="stat-value">€ {totalBalance.toFixed(2)}</span>
            </div>
          </div>

          <div className="user-welcome">
            Ciao, <strong>{user?.displayName?.split(' ')[0] || 'Utente'}</strong>!
          </div>
        </div>
      </div>
    </header>
  );
}

// ==================== DASHBOARD ====================
function DashboardContent() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { user } = useAuth();
  const { transactions = [], accounts = [], categories = [] } = useFinancial();

  const currentMonthIndex = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentMonthNumber = currentMonthIndex + 1;

  const [budgets, setBudgets] = useState([]);
  const [budgetsLoading, setBudgetsLoading] = useState(false);
  const [budgetsError, setBudgetsError] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadBudgets() {
      if (!user?.uid) return;

      setBudgetsLoading(true);
      setBudgetsError('');
      try {
        const data = await getBudgetsByMonth(user.uid, currentYear, currentMonthNumber);
        if (mounted) setBudgets(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Errore budgets:', e);
        if (mounted) setBudgetsError(e?.message || 'Errore caricamento budgets');
      } finally {
        if (mounted) setBudgetsLoading(false);
      }
    }

    loadBudgets();
    return () => {
      mounted = false;
    };
  }, [user?.uid, currentYear, currentMonthNumber]);

  const parseDate = (date) => {
    if (!date) return new Date();
    if (date && typeof date === 'object' && typeof date.toDate === 'function') return date.toDate();
    if (date instanceof Date) return date;
    return new Date(date);
  };

  const getAmount = (t) => {
    const n = Number(t?.amount);
    return Number.isFinite(n) ? n : 0;
  };

  const getType = (t) => {
    if (t?.type === 'income' || t?.type === 'expense' || t?.type === 'transfer') return t.type;
    return getAmount(t) >= 0 ? 'income' : 'expense';
  };

  const getAccountName = (t) => {
    const acc = accounts.find((a) => a.id === t?.accountId);
    return acc?.name || 'Conto';
  };

  const getCategoryName = (t) => {
    const raw = t?.categoryId || t?.category;
    if (!raw) return 'Senza categoria';

    const found = categories.find((c) => c.id === raw);
    if (found?.name) return found.name;

    if (typeof raw === 'string') return raw;
    return 'Senza categoria';
  };

  const getSubCategoryName = (t) => {
    const raw = t?.subCategoryId || t?.subCategory || t?.subcategory;
    if (!raw) return '';

    const catRaw = t?.categoryId || t?.category;
    const catObj =
      categories.find((c) => c.id === catRaw) ||
      categories.find((c) => (c.name || '').toLowerCase() === String(catRaw || '').toLowerCase());

    const subs = catObj?.subCategories || catObj?.subcategories || catObj?.children || [];
    const found =
      subs.find((s) => s?.id === raw) ||
      subs.find((s) => String(s?.name || '').toLowerCase() === String(raw || '').toLowerCase());

    if (found?.name) return found.name;
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
    return '';
  };

  const getDisplayName = (t) => {
    const desc = (t?.description || '').trim();
    const cat = getCategoryName(t);
    const sub = getSubCategoryName(t);
    const acc = getAccountName(t);
    const catLabel = sub ? `${cat} / ${sub}` : cat;
    if (desc) return `${desc} • ${catLabel}`;
    return `${catLabel} • ${acc}`;
  };

  const getTransactionIcon = (t) => {
    const type = getType(t);
    if (type === 'income') return '💼';
    if (type === 'transfer') return '🔄';
    return '💸';
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const transactionDate = parseDate(date);
    const diffMs = now - transactionDate;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Adesso';
    if (diffMinutes < 60) return `${diffMinutes} min fa`;
    if (diffHours < 24) return `${diffHours} ore fa`;
    if (diffDays === 1) return '1 giorno fa';
    return `${diffDays} giorni fa`;
  };

  const monthlyTransactions = transactions.filter((t) => {
    const d = parseDate(t.date);
    return d.getMonth() === currentMonthIndex && d.getFullYear() === currentYear;
  });

  const monthlyIncome = monthlyTransactions
    .filter((t) => getType(t) === 'income')
    .reduce((sum, t) => sum + Math.abs(getAmount(t)), 0);

  const monthlyExpenses = monthlyTransactions
    .filter((t) => getType(t) === 'expense')
    .reduce((sum, t) => sum + Math.abs(getAmount(t)), 0);

  const monthlySavings = monthlyIncome - monthlyExpenses;
  const totalBalance = accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);

  const recentTransactions = [...transactions]
    .sort((a, b) => parseDate(b.date) - parseDate(a.date))
    .slice(0, 4);

  const monthlyExpenseByCategoryKey = monthlyTransactions
    .filter((t) => getType(t) === 'expense')
    .reduce((acc, t) => {
      const key = t?.categoryId || t?.categoryName || t?.category || 'Senza categoria';
      acc[key] = (acc[key] || 0) + Math.abs(getAmount(t));
      return acc;
    }, {});

  const labelForCategoryKey = (key) => {
    const found = categories.find((c) => c.id === key);
    return found?.name || key;
  };

  const budgetByCategoryKey = (budgets || []).reduce((acc, b) => {
    const key = b?.categoryId || b?.categoryName || 'Senza categoria';
    const val = Number(b?.amount ?? b?.budget ?? 0) || 0;
    acc[key] = val;
    return acc;
  }, {});

  const budgetAlerts = Object.keys(budgetByCategoryKey)
    .map((key) => {
      const budget = budgetByCategoryKey[key] || 0;
      const spent = monthlyExpenseByCategoryKey[key] || 0;
      const pct = budget > 0 ? spent / budget : 0;

      let level = 'ok';
      if (budget > 0 && pct >= 1) level = 'over';
      else if (budget > 0 && pct >= 0.75) level = 'warn';

      return { key, label: labelForCategoryKey(key), budget, spent, pct, level };
    })
    .sort((a, b) => b.pct - a.pct);

  return (
    <div className="content-page">
      <div className="aurora-background">
        <div className="aurora-layer-1"></div>
        <div className="aurora-layer-2"></div>
        <div className="aurora-layer-3"></div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <div className="header-main">
            <h1>Buongiorno, {user?.displayName?.split(' ')[0] || 'Utente'}! 👋</h1>
            <div className="current-time">
              {currentTime.toLocaleDateString('it-IT', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
              <br />
              <span className="time">{currentTime.toLocaleTimeString('it-IT')}</span>
            </div>
          </div>
          <div className="header-stats">
            <div className="mini-stat">
              <div className="mini-value">€ {monthlyIncome.toFixed(2)}</div>
              <div className="mini-label">Entrate Mese</div>
            </div>
            <div className="mini-stat">
              <div className="mini-value">€ {monthlyExpenses.toFixed(2)}</div>
              <div className="mini-label">Uscite Mese</div>
            </div>
          </div>
        </div>

        <div className="financial-overview">
          <div className="finance-card total-balance">
            <div className="card-graphic">
              <div className="floating-coins">💰💵💶</div>
            </div>
            <div className="card-content">
              <h3>Saldo Totale</h3>
              <div className="amount">€ {totalBalance.toFixed(2)}</div>
              <div className="trend positive">{accounts.length} conti attivi</div>
            </div>
          </div>

          <div className="finance-card cash-flow">
            <div className="card-graphic">
              <div className="flow-animation" />
            </div>
            <div className="card-content">
              <h3>Cash Flow Mensile</h3>
              <div className="amount">€ {monthlySavings.toFixed(2)}</div>
              <div className={`trend ${monthlySavings >= 0 ? 'positive' : 'negative'}`}>
                {monthlySavings >= 0 ? 'Positivo' : 'Negativo'}
              </div>
            </div>
          </div>

          <div className="finance-card budget">
            <div className="card-graphic">
              <div className="progress-ring">
                <div className="progress-fill" style={{ '--progress': '75%' }} />
              </div>
            </div>
            <div className="card-content">
              <h3>Transazioni Mese</h3>
              <div className="amount">{monthlyTransactions.length} operazioni</div>
              <div className="trend">{transactions.length} totali</div>
            </div>
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">Alert Budget 📌</h2>

          {budgetsLoading ? (
            <div className="empty-state">
              <p>Caricamento budget...</p>
            </div>
          ) : budgetsError ? (
            <div className="empty-state">
              <p style={{ color: '#dc2626' }}>Errore: {budgetsError}</p>
            </div>
          ) : !budgets?.length ? (
            <div className="empty-state">
              <p>Nessun budget impostato per questo mese.</p>
              <p style={{ opacity: 0.8, marginTop: 6 }}>Vai su "Budget" per aggiungerne uno.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {budgetAlerts.slice(0, 6).map((a) => {
                const badge = a.level === 'over' ? '🔴 Superato' : a.level === 'warn' ? '🟠 In arrivo' : '🟢 OK';
                const border =
                  a.level === 'over'
                    ? '2px solid #ef4444'
                    : a.level === 'warn'
                    ? '2px solid #f59e0b'
                    : '2px solid #22c55e';

                return (
                  <div
                    key={a.key}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border,
                      borderRadius: 12,
                      padding: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontWeight: 700 }}>
                        {a.label}
                        <span style={{ marginLeft: 10, fontWeight: 600, opacity: 0.9 }}>{badge}</span>
                      </div>
                      <div style={{ opacity: 0.85, marginTop: 4 }}>
                        Speso: € {a.spent.toFixed(2)} / Budget: € {a.budget.toFixed(2)}
                      </div>
                    </div>

                    <div style={{ fontWeight: 800, fontSize: 16 }}>
                      {a.budget > 0 ? `${Math.round(a.pct * 100)}%` : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="section">
          <h2 className="section-title">Attività Recente ⚡</h2>
          {recentTransactions.length > 0 ? (
            <div className="activity-timeline">
              {recentTransactions.map((transaction) => {
                const type = getType(transaction);
                const amount = getAmount(transaction);

                return (
                  <div key={transaction.id} className="activity-item">
                    <div className={`activity-icon ${type}`}>{getTransactionIcon(transaction)}</div>

                    <div className="activity-details">
                      <div className="activity-name">{getDisplayName(transaction)}</div>
                      <div className="activity-time">{getTimeAgo(transaction.date)}</div>
                    </div>

                    <div className={`activity-amount ${type === 'income' ? 'positive' : 'negative'}`}>
                      {type === 'income' ? '+' : '-'}€{Math.abs(amount).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <p>Nessuna transazione recente. Inizia a tracciare le tue finanze!</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ==================== SETTINGS ====================
function SettingsContent() {
  const { user } = useAuth();

  return (
    <div className="content-page">
      <div className="aurora-background">
        <div className="aurora-layer-1"></div>
        <div className="aurora-layer-2"></div>
        <div className="aurora-layer-3"></div>
      </div>

      <div className="dashboard-content">
        <div className="page-header">
          <h1>Impostazioni ⚙️</h1>
          <p>Personalizza Aurora 4.0 secondo le tue preferenze</p>
        </div>

        <div className="settings-grid">
          <div className="setting-section">
            <h3>Profilo Utente</h3>
            <div className="user-profile-info">
              <div className="profile-avatar">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="avatar-img" />
                ) : (
                  <FiUser size={40} />
                )}
              </div>
              <div className="profile-details">
                <h4>{user?.displayName || 'Utente'}</h4>
                <p>{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// ==================== MAIN CONTENT ====================
function MainContent({ activeMenu, setSidebarOpen }) {
  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return <DashboardContent />;
      case 'accounts':
        return <Accounts />;
      case 'transactions':
        return <Transactions />;
      case 'categories':
        return <Categories />;
      case 'reports':
        return <Reports />;
      case 'budgets':
        return <Budgets />;
      case 'import':
        return <Importa />;
      case 'birthdays':
        return <Birthdays />;
      case 'settings':
        return <SettingsContent />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <div className="main-content">
      <Header setSidebarOpen={setSidebarOpen} />
      <div className="content-area">{renderContent()}</div>
    </div>
  );
}

// ==================== APP CONTENT ====================
function AppContent() {
  const MENU_STORAGE_KEY = 'aurora_active_menu';

  const [activeMenu, setActiveMenu] = useState(() => {
    try {
      return localStorage.getItem(MENU_STORAGE_KEY) || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading: authLoading } = useAuth();

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

  return (
    <div className="app">
      <Sidebar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      <MainContent activeMenu={activeMenu} setSidebarOpen={setSidebarOpen} />
    </div>
  );
}

// ==================== APP PRINCIPALE ====================
function App() {
  // Inizializza EmailJS all'avvio (solo se configurato)
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