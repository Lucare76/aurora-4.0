// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FinancialProvider, useFinancial } from './contexts/FinancialContext';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import Categories from './pages/Categories';
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
  FiTrendingUp,
  FiPieChart,
  FiLogOut,
  FiDownload,
  FiPrinter,
  FiCalendar
} from 'react-icons/fi';
import { WiDaySunny } from 'react-icons/wi';
import './App.css';

// ==================== COMPONENTE LOGIN PREMIUM ====================
function Login() {
  const { loginWithGoogle, login, signup, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: ''
  });
  const [loading, setLoading] = useState(false);
  const [activePanel, setActivePanel] = useState('login');
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    if (authLoading) return;
    try {
      setLoading(true);
      setError('');
      await loginWithGoogle();
    } catch (error) {
      console.error('Errore Google login:', error);
      setError('Errore durante il login con Google: ' + error.message);
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
        await login(formData.email, formData.password);
      } else {
        await signup(formData.email, formData.password, formData.displayName);
      }
    } catch (error) {
      console.error('Errore autenticazione:', error);
      setError(
        `Errore durante ${activePanel === 'login' ? 'il login' : 'la registrazione'}: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

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
      {/* Background Animato */}
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
            ></div>
          ))}
        </div>
      </div>

      <div className="login-container-premium">
        {/* Card Principale */}
        <div className="login-card-premium">
          {/* Header con Logo Animato */}
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

          {/* Tabs Login/Registrazione */}
          <div className="auth-tabs">
            <button
              className={`tab ${activePanel === 'login' ? 'active' : ''}`}
              onClick={() => setActivePanel('login')}
            >
              Accedi
            </button>
            <button
              className={`tab ${activePanel === 'register' ? 'active' : ''}`}
              onClick={() => setActivePanel('register')}
            >
              Registrati
            </button>
          </div>

          {/* Contenuto Dinamico */}
          <div className="auth-content">
            {activePanel === 'login' ? (
              <>
                {/* Login Panel */}
                <div className="welcome-message">
                  <h2>Bentornato! 👋</h2>
                  <p>Accedi al tuo spazio finanziario personale</p>
                </div>

                <button
                  className="google-login-btn-premium"
                  onClick={handleGoogleLogin}
                  disabled={loading || authLoading}
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
                  <div className="btn-glow"></div>
                </button>

                <div className="divider-premium">
                  <span>oppure con email</span>
                </div>

                {error && (
                  <div
                    style={{
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      padding: '10px',
                      borderRadius: '6px',
                      marginBottom: '10px',
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
                    <div className="input-decoration"></div>
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
                    <div className="input-decoration"></div>
                  </div>

                  <button
                    type="submit"
                    className="auth-submit-btn-premium"
                    disabled={loading || authLoading}
                  >
                    <span className="btn-text">
                      {loading ? (
                        <>
                          <div className="loading-spinner"></div>
                          Accesso in corso...
                        </>
                      ) : (
                        'Accedi al Dashboard'
                      )}
                    </span>
                    <div className="btn-shine"></div>
                  </button>
                </form>
              </>
            ) : (
              <>
                {/* Register Panel */}
                <div className="welcome-message">
                  <h2>Unisciti a Noi! 🚀</h2>
                  <p>Crea il tuo spazio finanziario personalizzato</p>
                </div>

                {error && (
                  <div
                    style={{
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      padding: '10px',
                      borderRadius: '6px',
                      marginBottom: '10px',
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
                    <div className="input-decoration"></div>
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
                    <div className="input-decoration"></div>
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
                      minLength={6}
                      disabled={loading}
                    />
                    <label className="form-label">Password (min. 6 caratteri)</label>
                    <div className="input-decoration"></div>
                  </div>

                  <button
                    type="submit"
                    className="auth-submit-btn-premium register"
                    disabled={loading || authLoading}
                  >
                    <span className="btn-text">
                      {loading ? (
                        <>
                          <div className="loading-spinner"></div>
                          Creazione account...
                        </>
                      ) : (
                        'Crea il Mio Account'
                      )}
                    </span>
                    <div className="btn-shine"></div>
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

          {/* Footer */}
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

        {/* Side Panel con Features */}
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

// ==================== COMPONENTE SIDEBAR AURORA ====================
function Sidebar({ activeMenu, setActiveMenu, sidebarOpen, setSidebarOpen }) {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', icon: <FiHome />, label: 'Dashboard', color: '#4f46e5' },
    { id: 'accounts', icon: <FiCreditCard />, label: 'Conti', color: '#06b6d4' },
    { id: 'transactions', icon: <FiDollarSign />, label: 'Transazioni', color: '#10b981' },
    { id: 'categories', icon: <FiBarChart2 />, label: 'Categorie', color: '#8b5cf6' },
    { id: 'reports', icon: <FiBarChart2 />, label: 'Report', color: '#f59e0b' },
    { id: 'import', icon: <FiUpload />, label: 'Importa', color: '#ef4444' },
    { id: 'birthdays', icon: <FiGift />, label: 'Compleanni', color: '#ec4899' },
    { id: 'settings', icon: <FiSettings />, label: 'Impostazioni', color: '#6b7280' }
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Errore durante il logout:', error);
    }
  };

  return (
    <>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <div className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        {/* Background Aurora */}
        <div className="aurora-background">
          <div className="aurora-layer-1"></div>
          <div className="aurora-layer-2"></div>
          <div className="aurora-layer-3"></div>
        </div>

        <div className="sidebar-content">
          <div className="sidebar-header">
            <div className="logo">
              <div className="logo-icon">
                <div className="aurora-glow"></div>
                🌅
              </div>
              <div className="logo-text">
                <h2>Aurora</h2>
                <span>4.0</span>
              </div>
            </div>
            <button className="close-sidebar" onClick={() => setSidebarOpen(false)}>
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
              >
                <div className="nav-icon-wrapper">{item.icon}</div>
                <span className="nav-label">{item.label}</span>
                <div className="nav-indicator"></div>
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
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="avatar-img" />
                ) : (
                  <FiUser />
                )}
              </div>
              <div className="user-info">
                <div className="user-name">{user?.displayName || 'Utente'}</div>
                <div className="user-status">Online</div>
              </div>
              <button className="logout-btn" onClick={handleLogout} title="Logout">
                <FiLogOut />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ==================== COMPONENTE HEADER AURORA ====================
function Header({ setSidebarOpen }) {
  const { user } = useAuth();
  const { accounts } = useFinancial();

  // Calcola il saldo totale reale
  const totalBalance = accounts.reduce((sum, account) => sum + (account.balance || 0), 0);

  return (
    <header className="header">
      {/* Background Aurora */}
      <div className="aurora-background">
        <div className="aurora-layer-1"></div>
        <div className="aurora-layer-2"></div>
        <div className="aurora-layer-3"></div>
      </div>

      <div className="header-content">
        <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
          <FiMenu />
        </button>

        <div className="header-search">
          <input type="text" placeholder="Cerca transazioni, conti..." className="search-input" />
        </div>

        <div className="header-actions">
          <button className="action-btn notification-btn">
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
// ==================== COMPONENTE DASHBOARD AURORA ====================
// ==================== COMPONENTE DASHBOARD AURORA ====================
function DashboardContent() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { user } = useAuth();
  const { transactions, accounts, categories } = useFinancial();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ---- Helpers robusti (date Firestore + importi) ----
  const parseDate = (date) => {
    if (!date) return new Date();
    if (date && typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
      return date.toDate(); // Firestore Timestamp
    }
    if (date instanceof Date) return date;
    return new Date(date);
  };

  const getAmount = (t) => {
    const n = Number(t?.amount);
    return Number.isFinite(n) ? n : 0;
  };

  // Se type non c'è, lo deduco dal segno dell'importo
  const getType = (t) => {
    if (t?.type === 'income' || t?.type === 'expense' || t?.type === 'transfer') return t.type;
    return getAmount(t) >= 0 ? 'income' : 'expense';
  };

  const getAccountName = (t) => {
    const acc = accounts.find((a) => a.id === t?.accountId);
    return acc?.name || 'Conto';
  };

  // t.category potrebbe essere ID oppure nome (o categoryId)
  const getCategoryName = (t) => {
  const raw = t?.categoryId || t?.category;
  if (!raw) return 'Senza categoria';

  const found = categories.find((c) => c.id === raw);
  if (found?.name) return found.name;

  if (typeof raw === 'string') return raw;
  return 'Senza categoria';
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
const getSubCategoryName = (t) => {
  const raw = t?.subCategoryId || t?.subCategory || t?.subcategory;
  if (!raw) return '';

  // 1) Trovo la categoria (per cercare dentro le sue sottocategorie)
  const catRaw = t?.categoryId || t?.category;
  const catObj =
    categories.find((c) => c.id === catRaw) ||
    categories.find((c) => (c.name || '').toLowerCase() === String(catRaw || '').toLowerCase());

  const subs = catObj?.subCategories || catObj?.subcategories || catObj?.children || [];

  // 2) Se raw è un ID (stringa), cerco match per id o per name
  const found =
    subs.find((s) => s?.id === raw) ||
    subs.find((s) => String(s?.name || '').toLowerCase() === String(raw || '').toLowerCase());

  if (found?.name) return found.name;

  // 3) Fallback: se NON ho trovato nulla, allora lo tratto come testo (legacy)
  if (typeof raw === 'string' && raw.trim()) return raw.trim();

  return '';
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

  // ---- Statistiche mese corrente (robuste) ----
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyTransactions = transactions.filter((t) => {
    const d = parseDate(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const monthlyIncome = monthlyTransactions
    .filter((t) => getType(t) === 'income')
    .reduce((sum, t) => sum + Math.abs(getAmount(t)), 0);

  const monthlyExpenses = monthlyTransactions
    .filter((t) => getType(t) === 'expense')
    .reduce((sum, t) => sum + Math.abs(getAmount(t)), 0);

  const monthlySavings = monthlyIncome - monthlyExpenses;

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

  // Ultime 4 transazioni (robuste)
  const recentTransactions = [...transactions]
    .sort((a, b) => parseDate(b.date) - parseDate(a.date))
    .slice(0, 4);

  return (
    <div className="content-page">
      {/* Background Aurora */}
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
              <div className="flow-animation"></div>
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
                <div className="progress-fill" style={{ '--progress': '75%' }}></div>
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
          <h2 className="section-title">I Tuoi Conti 💰</h2>
          {accounts.length > 0 ? (
            <div className="accounts-grid">
              {accounts.map((account) => (
                <div key={account.id} className="account-card">
                  <div
                    className="account-color"
                    style={{ backgroundColor: account.color || '#4f46e5' }}
                  ></div>
                  <div className="account-info">
                    <div className="account-name">{account.name}</div>
                    <div className="account-balance">€ {(account.balance || 0).toFixed(2)}</div>
                  </div>
                  <div className="account-actions">
                    <button className="btn-icon">
                      <FiPieChart />
                    </button>
                    <button className="btn-icon">
                      <FiTrendingUp />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>Nessun conto disponibile. Crea il tuo primo conto!</p>
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
                    <div className={`activity-icon ${type}`}>
                      {getTransactionIcon(transaction)}
                    </div>

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
// ==================== COMPONENTE REPORTS CON GRAFICI ====================
function ReportsContent() {
  const { transactions, accounts, categories = [] } = useFinancial();

  // ---- Helpers (robusti: Firestore Timestamp + Date + string) ----
  const parseDate = (date) => {
    if (!date) return new Date();
    if (date && typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
      return date.toDate();
    }
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

  // ✅ UNICA getCategoryName
  const getCategoryName = (t) => {
    const raw = t?.categoryId || t?.category;
    if (!raw) return 'Senza categoria';

    const byId = categories.find((c) => c.id === raw);
    if (byId?.name) return byId.name;

    if (typeof raw === 'string') return raw;
    return 'Senza categoria';
  };

  const getSubCategoryName = (t) => {
  const raw = t?.subCategoryId || t?.subCategory || t?.subcategory;
  if (!raw) return '';

  // se è già un nome leggibile (no ID)
  if (typeof raw === 'string' && !raw.includes('-') && raw.length < 30) {
    return raw;
  }

  const catId = t?.categoryId || t?.category;
  const catObj = categories.find((c) => c.id === catId);

  const subs = catObj?.subCategories || [];

  const found = subs.find(
    (s) => s.id === raw || s.name === raw
  );

  return found?.name || '';
};

  const getDisplayName = (t) => {
    const desc = (t?.description || '').trim();
    if (desc) return desc;

    const cat = getCategoryName(t);
    const sub = getSubCategoryName(t);
    const acc = getAccountName(t);

    const catLabel = sub ? `${cat} / ${sub}` : cat;
    return `${catLabel} • ${acc}`;
  };

  const getTransactionIcon = (t) => {
    const type = getType(t);
    if (type === 'income') return '💼';
    if (type === 'transfer') return '🔄';
    return '💸';
  };

  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [activeReport, setActiveReport] = useState('overview');

  // ✅ Filtra transazioni per data (usa parseDate!)
  useEffect(() => {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    endDate.setHours(23, 59, 59, 999);

    const filtered = transactions.filter((t) => {
      const transDate = parseDate(t.date);
      return transDate >= startDate && transDate <= endDate;
    });

    setFilteredTransactions(filtered);
  }, [transactions, dateRange]);

  // ✅ Calcola statistiche (usa getType/getAmount)
  const calculateStats = () => {
    const income = filteredTransactions
      .filter((t) => getType(t) === 'income')
      .reduce((sum, t) => sum + Math.abs(getAmount(t)), 0);

    const expenses = filteredTransactions
      .filter((t) => getType(t) === 'expense')
      .reduce((sum, t) => sum + Math.abs(getAmount(t)), 0);

    return { income, expenses, net: income - expenses };
  };

  const { income, expenses, net } = calculateStats();

  // ✅ Spese per categoria + sottocategoria
  const expensesByCategory = filteredTransactions
  .filter(t => getType(t) === 'expense')
  .reduce((acc, t) => {
    const cat = getCategoryName(t);
    const sub = getSubCategoryName(t);
    const label = sub ? `${cat} / ${sub}` : cat;

    acc[label] = (acc[label] || 0) + Math.abs(getAmount(t));
    return acc;
  }, {});

  // ✅ Transazioni mensili per grafico (usa parseDate!)
  const getMonthlyData = () => {
    const months = [];
    const monthlyData = { income: [], expenses: [] };

    const currentDate = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = d.toLocaleDateString('it-IT', { month: 'short' });
      months.push(`${monthName} ${d.getFullYear()}`);

      const monthTransactions = transactions.filter((t) => {
        const td = parseDate(t.date);
        return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth();
      });

      const monthIncome = monthTransactions
        .filter((t) => getType(t) === 'income')
        .reduce((sum, t) => sum + Math.abs(getAmount(t)), 0);

      const monthExpenses = monthTransactions
        .filter((t) => getType(t) === 'expense')
        .reduce((sum, t) => sum + Math.abs(getAmount(t)), 0);

      monthlyData.income.push(monthIncome);
      monthlyData.expenses.push(monthExpenses);
    }

    return { months, data: monthlyData };
  };

  const { months, data: monthlyData } = getMonthlyData();
  const maxValue = Math.max(...monthlyData.income, ...monthlyData.expenses, 100);

  const prepareCategoryChartData = () => {
    const sorted = Object.entries(expensesByCategory).sort(([, a], [, b]) => b - a);

    const top = sorted.slice(0, 8);
    const other = sorted.slice(8);
    const otherTotal = other.reduce((sum, [, amount]) => sum + amount, 0);

    const chartData = top.map(([category, amount]) => ({
      category,
      amount,
      percentage: expenses > 0 ? (amount / expenses) * 100 : 0
    }));

    if (otherTotal > 0) {
      chartData.push({
        category: 'Altre',
        amount: otherTotal,
        percentage: expenses > 0 ? (otherTotal / expenses) * 100 : 0
      });
    }

    return chartData;
  };

  const categoryChartData = prepareCategoryChartData();

  const exportToCSV = () => {
    const headers = ['Data', 'Descrizione', 'Categoria', 'Tipo', 'Importo', 'Conto'];

    const csvData = filteredTransactions.map((t) => {
      const cat = getCategoryName(t);
      const sub = getSubCategoryName(t);
      const catLabel = sub ? `${cat} / ${sub}` : cat;

      return [
        parseDate(t.date).toISOString().split('T')[0],
        `"${(t.description || '').replaceAll('"', '""')}"`,
        `"${catLabel.replaceAll('"', '""')}"`,
        getType(t) === 'income' ? 'Entrata' : 'Uscita',
        String(getAmount(t)),
        `"${getAccountName(t).replaceAll('"', '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...csvData.map((row) => row.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `report_aurora_${dateRange.start}_${dateRange.end}.csv`;
    link.click();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const MonthlyChart = () => (
    <div className="chart-container">
      <div className="chart-header">
        <h4>Andamento Mensile</h4>
        <span className="chart-subtitle">Ultimi 12 mesi</span>
      </div>
      <div className="chart-bars">
        {months.map((month, index) => (
          <div key={month} className="chart-bar-group">
            <div className="month-label">{month}</div>
            <div className="bars-container">
              {monthlyData.income[index] > 0 && (
                <div
                  className="bar income-bar"
                  style={{
                    height: `${(monthlyData.income[index] / maxValue) * 100}%`,
                    width: '40%'
                  }}
                  title={`Entrate: €${monthlyData.income[index].toFixed(2)}`}
                >
                  <div className="bar-value">€{monthlyData.income[index].toFixed(0)}</div>
                </div>
              )}
              {monthlyData.expenses[index] > 0 && (
                <div
                  className="bar expense-bar"
                  style={{
                    height: `${(monthlyData.expenses[index] / maxValue) * 100}%`,
                    width: '40%'
                  }}
                  title={`Uscite: €${monthlyData.expenses[index].toFixed(2)}`}
                >
                  <div className="bar-value">€{monthlyData.expenses[index].toFixed(0)}</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <div className="legend-item">
          <div className="legend-color income-legend"></div>
          <span>Entrate</span>
        </div>
        <div className="legend-item">
          <div className="legend-color expense-legend"></div>
          <span>Uscite</span>
        </div>
      </div>
    </div>
  );

  const CategoryPieChart = () => {
    const colors = [
      '#4f46e5',
      '#06b6d4',
      '#10b981',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
      '#ec4899',
      '#14b8a6',
      '#f97316',
      '#84cc16'
    ];

    const totalAngle = 360;
    let currentAngle = 0;

    return (
      <div className="pie-chart-container">
        <div className="pie-chart-header">
          <h4>Distribuzione Spese per Categoria</h4>
          <span className="chart-subtitle">Top categorie</span>
        </div>
        <div className="pie-chart-wrapper">
          <div className="pie-chart">
            {categoryChartData.map((item, index) => {
              const angle = (item.percentage / 100) * totalAngle;
              const sliceStyle = {
                background: `conic-gradient(${colors[index % colors.length]} 0deg ${angle}deg, transparent ${angle}deg 360deg)`,
                transform: `rotate(${currentAngle}deg)`
              };

              currentAngle += angle;

              return (
                <div key={item.category} className="pie-slice" style={sliceStyle}>
                  <div className="pie-slice-inner"></div>
                </div>
              );
            })}
            <div className="pie-center">
              <div className="pie-center-value">€{expenses.toFixed(0)}</div>
              <div className="pie-center-label">Totale</div>
            </div>
          </div>

          <div className="pie-legend">
            {categoryChartData.map((item, index) => (
              <div key={item.category} className="pie-legend-item">
                <div
                  className="pie-legend-color"
                  style={{ backgroundColor: colors[index % colors.length] }}
                ></div>
                <div className="pie-legend-info">
                  <span className="pie-legend-name">{item.category}</span>
                  <span className="pie-legend-value">
                    €{item.amount.toFixed(2)} ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // --- UI (lascia il tuo JSX originale sotto, qui non lo cambio) ---
  return (
    <div className="content-page">
      {/* Background Aurora */}
      <div className="aurora-background">
        <div className="aurora-layer-1"></div>
        <div className="aurora-layer-2"></div>
        <div className="aurora-layer-3"></div>
      </div>

      <div className="dashboard-content">
        <div className="page-header">
          <h1>📊 Report Finanziari Avanzati</h1>
          <p>Analisi dettagliate e grafici delle tue finanze</p>
        </div>

        {/* Filtri e controlli */}
        <div className="reports-controls">
          <div className="date-range-controls">
            <div className="control-group">
              <FiCalendar />
              <label>Periodo Analisi:</label>
              <div className="date-inputs">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="date-input"
                />
                <span className="date-separator">al</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="date-input"
                />
              </div>
            </div>
          </div>

          <div className="report-type-tabs">
            <button
              className={`tab-btn ${activeReport === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveReport('overview')}
            >
              <FiPieChart /> Panoramica
            </button>
            <button
              className={`tab-btn ${activeReport === 'expenses' ? 'active' : ''}`}
              onClick={() => setActiveReport('expenses')}
            >
              <FiTrendingUp /> Analisi Spese
            </button>
            <button
              className={`tab-btn ${activeReport === 'trends' ? 'active' : ''}`}
              onClick={() => setActiveReport('trends')}
            >
              <FiBarChart2 /> Trend Mensili
            </button>
          </div>
        </div>

        {/* Statistiche principali */}
        <div className="reports-main-stats">
          <div className="main-stat">
            <div className="main-stat-icon">💰</div>
            <div className="main-stat-content">
              <div className="main-stat-value">€{net.toFixed(2)}</div>
              <div className="main-stat-label">Saldo Netto Periodo</div>
            </div>
          </div>
          <div className="main-stat">
            <div className="main-stat-icon">📈</div>
            <div className="main-stat-content">
              <div className="main-stat-value positive">€{income.toFixed(2)}</div>
              <div className="main-stat-label">Entrate Totali</div>
            </div>
          </div>
          <div className="main-stat">
            <div className="main-stat-icon">📉</div>
            <div className="main-stat-content">
              <div className="main-stat-value negative">€{expenses.toFixed(2)}</div>
              <div className="main-stat-label">Uscite Totali</div>
            </div>
          </div>
          <div className="main-stat">
            <div className="main-stat-icon">📋</div>
            <div className="main-stat-content">
              <div className="main-stat-value">{filteredTransactions.length}</div>
              <div className="main-stat-label">Transazioni</div>
            </div>
          </div>
        </div>

        {/* Contenuto report attivo */}
        <div className="report-content-area">
          {activeReport === 'overview' && (
            <div className="overview-content">
              <div className="charts-row">
                <div className="chart-card full-width">
                  <MonthlyChart />
                </div>
              </div>

              <div className="charts-row">
                <div className="chart-card">
                  <CategoryPieChart />
                </div>
              </div>
            </div>
          )}

          {activeReport === 'expenses' && (
            <div className="expenses-content">
              <div className="expenses-header">
                <h3>Analisi Dettagliata delle Spese</h3>
                <p>
                  Periodo: {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
                </p>
              </div>

              <div className="expenses-grid">
                <div className="expenses-chart">
                  <CategoryPieChart />
                </div>

                <div className="expenses-breakdown">
                  <h4>Dettaglio per Categoria</h4>
                  <div className="breakdown-list">
                    {Object.entries(expensesByCategory)
                      .sort(([, a], [, b]) => b - a)
                      .map(([category, amount]) => {
                        const percentage = expenses > 0 ? (amount / expenses) * 100 : 0;
                        return (
                          <div key={category} className="breakdown-item">
                            <div className="breakdown-category">
                              <span>{category}</span>
                            </div>
                            <div className="breakdown-details">
                              <div className="breakdown-bar">
                                <div
                                  className="breakdown-bar-fill"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <div className="breakdown-numbers">
                                <span className="breakdown-amount">€{amount.toFixed(2)}</span>
                                <span className="breakdown-percentage">{percentage.toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeReport === 'trends' && (
            <div className="trends-content">
              <div className="trends-header">
                <h3>Trend e Andamento Mensile</h3>
                <p>Analisi degli ultimi 12 mesi</p>
              </div>

              <div className="trends-chart-container">
                <MonthlyChart />
              </div>
            </div>
          )}
        </div>

        {/* Azioni */}
        <div className="reports-actions">
          <button onClick={exportToCSV} className="action-btn primary-btn">
            <FiDownload />
            Esporta CSV
          </button>
          <button onClick={() => window.print()} className="action-btn secondary-btn">
            <FiPrinter />
            Stampa Report
          </button>
        </div>
      </div>
    </div>
  );
}
// ==================== COMPONENTI PAGINE ====================
function ImportContent() {
  return (
    <div className="content-page">
      <div className="aurora-background">
        <div className="aurora-layer-1"></div>
        <div className="aurora-layer-2"></div>
        <div className="aurora-layer-3"></div>
      </div>

      <div className="dashboard-content">
        <div className="page-header">
          <h1>Importa Dati 📥</h1>
          <p>Carica estratti conto dai tuoi conti bancari</p>
        </div>
        <div className="content-placeholder">
          <h3>Contenuto Import - In sviluppo</h3>
        </div>
      </div>
    </div>
  );
}

function BirthdaysContent() {
  return (
    <div className="content-page">
      <div className="aurora-background">
        <div className="aurora-layer-1"></div>
        <div className="aurora-layer-2"></div>
        <div className="aurora-layer-3"></div>
      </div>

      <div className="dashboard-content">
        <div className="page-header">
          <h1>Compleanni e Promemoria 🎁</h1>
          <p>Non dimenticare mai più un compleanno importante</p>
        </div>
        <div className="content-placeholder">
          <h3>Contenuto Compleanni - In sviluppo</h3>
        </div>
      </div>
    </div>
  );
}

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
        return <ReportsContent />;
      case 'import':
        return <ImportContent />;
      case 'birthdays':
        return <BirthdaysContent />;
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

// ==================== APP CONTENT PRINCIPALE ====================
function AppContent() {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading: authLoading } = useAuth();

  console.log('🔍 AppContent - Stato utente:', user ? `Autenticato (${user.uid})` : 'Non autenticato');

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

  if (!user) {
    return <Login />;
  }

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
