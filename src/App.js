// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FinancialProvider } from './contexts/FinancialContext';
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
  FiLogOut
} from 'react-icons/fi';
import { 
  WiDaySunny
} from 'react-icons/wi';
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
      setError(`Errore durante ${activePanel === 'login' ? 'il login' : 'la registrazione'}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f8fafc'
      }}>
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
            <div key={i} className="particle" style={{
              '--delay': `${i * 0.5}s`,
              '--duration': `${15 + i * 2}s`,
              '--size': `${20 + i * 3}px`,
              left: `${Math.random() * 100}%`
            }}></div>
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
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
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
                  <div style={{
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    padding: '10px',
                    borderRadius: '6px',
                    marginBottom: '10px',
                    textAlign: 'center'
                  }}>
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
                  <div style={{
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    padding: '10px',
                    borderRadius: '6px',
                    marginBottom: '10px',
                    textAlign: 'center'
                  }}>
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
      {sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
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
            <button 
              className="close-sidebar"
              onClick={() => setSidebarOpen(false)}
            >
              <FiX />
            </button>
          </div>

          <nav className="sidebar-nav">
            {menuItems.map(item => (
              <button
                key={item.id}
                className={`nav-item ${activeMenu === item.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveMenu(item.id);
                  setSidebarOpen(false);
                }}
                style={{ '--accent-color': item.color }}
              >
                <div className="nav-icon-wrapper">
                  {item.icon}
                </div>
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

  return (
    <header className="header">
      {/* Background Aurora */}
      <div className="aurora-background">
        <div className="aurora-layer-1"></div>
        <div className="aurora-layer-2"></div>
        <div className="aurora-layer-3"></div>
      </div>
      
      <div className="header-content">
        <button 
          className="menu-toggle"
          onClick={() => setSidebarOpen(true)}
        >
          <FiMenu />
        </button>
        
        <div className="header-search">
          <input 
            type="text" 
            placeholder="Cerca transazioni, conti..."
            className="search-input"
          />
        </div>

        <div className="header-actions">
          <button className="action-btn notification-btn">
            <FiBell />
            <span className="notification-badge">3</span>
          </button>
          
          <div className="quick-stats">
            <div className="quick-stat">
              <span className="stat-label">Saldo</span>
              <span className="stat-value">€ 2.450</span>
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
function DashboardContent() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { user } = useAuth();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const financialData = {
    monthly: {
      income: 2850,
      expenses: 1620,
      savings: 1230
    },
    accounts: [
      { name: 'Conto Corrente', balance: 2450, color: '#4f46e5' },
      { name: 'Risparmi', balance: 8560, color: '#06b6d4' },
      { name: 'Investimenti', balance: 12400, color: '#10b981' }
    ],
    recentActivity: [
      { type: 'food', name: 'Supermercato', amount: -85.40, time: '2 ore fa' },
      { type: 'salary', name: 'Stipendio', amount: 2850.00, time: '1 giorno fa' },
      { type: 'bill', name: 'Bolletta Luce', amount: -65.30, time: '2 giorni fa' },
      { type: 'shopping', name: 'Amazon', amount: -42.50, time: '3 giorni fa' }
    ]
  };

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
              <div className="mini-value">€ {financialData.monthly.income}</div>
              <div className="mini-label">Entrate Mese</div>
            </div>
            <div className="mini-stat">
              <div className="mini-value">€ {financialData.monthly.expenses}</div>
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
              <div className="amount">€ 23.410,00</div>
              <div className="trend positive">+12% vs mese scorso</div>
            </div>
          </div>

          <div className="finance-card cash-flow">
            <div className="card-graphic">
              <div className="flow-animation"></div>
            </div>
            <div className="card-content">
              <h3>Cash Flow Mensile</h3>
              <div className="amount">€ 1.230,00</div>
              <div className="trend positive">+8% positivo</div>
            </div>
          </div>

          <div className="finance-card budget">
            <div className="card-graphic">
              <div className="progress-ring">
                <div className="progress-fill" style={{ '--progress': '75%' }}></div>
              </div>
            </div>
            <div className="card-content">
              <h3>Budget Mensile</h3>
              <div className="amount">75% utilizzato</div>
              <div className="trend warning">€ 420 rimanenti</div>
            </div>
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">I Tuoi Conti 💰</h2>
          <div className="accounts-grid">
            {financialData.accounts.map((account, index) => (
              <div key={index} className="account-card">
                <div 
                  className="account-color" 
                  style={{ backgroundColor: account.color }}
                ></div>
                <div className="account-info">
                  <div className="account-name">{account.name}</div>
                  <div className="account-balance">€ {account.balance.toLocaleString()}</div>
                </div>
                <div className="account-actions">
                  <button className="btn-icon"><FiPieChart /></button>
                  <button className="btn-icon"><FiTrendingUp /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">Attività Recente ⚡</h2>
          <div className="activity-timeline">
            {financialData.recentActivity.map((activity, index) => (
              <div key={index} className="activity-item">
                <div className={`activity-icon ${activity.type}`}>
                  {activity.type === 'food' && '🛒'}
                  {activity.type === 'salary' && '💼'}
                  {activity.type === 'bill' && '🏠'}
                  {activity.type === 'shopping' && '📦'}
                </div>
                <div className="activity-details">
                  <div className="activity-name">{activity.name}</div>
                  <div className="activity-time">{activity.time}</div>
                </div>
                <div className={`activity-amount ${activity.amount > 0 ? 'positive' : 'negative'}`}>
                  {activity.amount > 0 ? '+' : ''}{activity.amount}€
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== COMPONENTI PAGINE ====================
function ReportsContent() {
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
          <h1>Report e Statistiche 📊</h1>
          <p>Analisi approfondite delle tue finanze</p>
        </div>
        <div className="content-placeholder">
          <h3>Contenuto Report - In sviluppo</h3>
        </div>
      </div>
    </div>
  );
}

function ImportContent() {
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
      {/* Background Aurora */}
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
      {/* Background Aurora */}
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
      case 'dashboard': return <DashboardContent />;
      case 'accounts': return <Accounts />;
      case 'transactions': return <Transactions />;
      case 'categories': return <Categories />;
      case 'reports': return <ReportsContent />;
      case 'import': return <ImportContent />;
      case 'birthdays': return <BirthdaysContent />;
      case 'settings': return <SettingsContent />;
      default: return <DashboardContent />;
    }
  };

  return (
    <div className="main-content">
      <Header setSidebarOpen={setSidebarOpen} />
      <div className="content-area">
        {renderContent()}
      </div>
    </div>
  );
}

// ==================== APP CONTENT PRINCIPALE ====================
function AppContent() {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading: authLoading } = useAuth();

  console.log("🔍 AppContent - Stato utente:", user ? `Autenticato (${user.uid})` : "Non autenticato");

  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f8fafc'
      }}>
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
      <MainContent 
        activeMenu={activeMenu} 
        setSidebarOpen={setSidebarOpen}
      />
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