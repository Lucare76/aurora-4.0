// src/App.js
<<<<<<< HEAD
import React, { useState, useEffect, useMemo } from 'react';
=======
import React, { useState, useEffect } from 'react';
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
import { BrowserRouter as Router } from 'react-router-dom';

import Reports from './pages/Reports';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import Categories from './pages/Categories';
import Importa from './pages/Importa';
import Budgets from './pages/Budgets';
import Birthdays from './pages/Birthdays';
<<<<<<< HEAD
import SavingsGoals from './pages/SavingsGoals';
=======
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
import AdminApproval from './pages/AdminApproval';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FinancialProvider, useFinancial } from './contexts/FinancialContext';

import { getBudgetsByMonth } from './services/budgetsService';
<<<<<<< HEAD
import { getBirthdays, getDaysUntilBirthday, calculateAge } from './services/birthdaysService';
=======
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
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
  FiLogOut,
  FiShield,
  FiMail,
<<<<<<< HEAD
  FiCheck,
  FiTarget
} from 'react-icons/fi';

import { WiDaySunny, WiCloudy, WiRain, WiSnow, WiThunderstorm, WiFog, WiDayCloudy } from 'react-icons/wi';
import { getCurrencySymbol } from './utils/currency';
import {
  getMonthComparison,
  getTopGrowingCategory,
  getAnomalies,
  getSavingsRate,
  getProjectedExpenses
} from './services/insightsService';
import { processRecurring } from './services/recurringService';
=======
  FiCheck
} from 'react-icons/fi';

import { WiDaySunny } from 'react-icons/wi';
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
import './App.css';

// ==================== PENDING APPROVAL COMPONENT ====================
function PendingApproval({ user, onLogout }) {
  return (
    <div className="pending-approval-page">
      <div className="aurora-background">
        <div className="aurora-layer-1"></div>
        <div className="aurora-layer-2"></div>
        <div className="aurora-layer-3"></div>
      </div>

      <div className="pending-approval-container">
        <div className="pending-approval-card">
          <div className="approval-icon">⏳</div>
<<<<<<< HEAD

          <h1>Account in Attesa di Approvazione</h1>

=======
          
          <h1>Account in Attesa di Approvazione</h1>
          
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
          <div className="approval-message">
            <p>
              Ciao <strong>{user?.displayName || 'Utente'}</strong>! 👋
            </p>
            <p>
<<<<<<< HEAD
              Il tuo account è stato creato con successo ma è in attesa di approvazione da parte
              dell'amministratore.
            </p>
            <p>
              Riceverai una email a <strong>{user?.email}</strong> non appena il tuo account verrà attivato.
=======
              Il tuo account è stato creato con successo ma è in attesa di approvazione 
              da parte dell'amministratore.
            </p>
            <p>
              Riceverai una email a <strong>{user?.email}</strong> non appena 
              il tuo account verrà attivato.
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
            </p>
          </div>

          <div className="approval-info">
            <div className="info-item">
              <span className="info-icon">📧</span>
              <div>
                <strong>Email registrata</strong>
                <p>{user?.email}</p>
              </div>
            </div>
<<<<<<< HEAD

=======
            
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
            <div className="info-item">
              <span className="info-icon">⏱️</span>
              <div>
                <strong>Tempo di attesa</strong>
                <p>Di solito entro 24 ore</p>
              </div>
            </div>
          </div>

          <div className="approval-actions">
<<<<<<< HEAD
            <button className="btn-logout" onClick={onLogout} type="button">
=======
            <button 
              className="btn-logout" 
              onClick={onLogout}
              type="button"
            >
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
              Logout
            </button>
          </div>

          <div className="approval-footer">
<<<<<<< HEAD
            <p>Hai bisogno di aiuto? Contatta l'amministratore</p>
=======
            <p>
              Hai bisogno di aiuto? Contatta l'amministratore
            </p>
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
          </div>
        </div>
      </div>
    </div>
  );
}

<<<<<<< HEAD
=======


>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
// ==================== NOTIFICATION BADGE ====================
function NotificationBadge() {
  const [pendingCount, setPendingCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setPendingCount(0);
      return;
    }

<<<<<<< HEAD
=======
    // Listener in tempo reale per utenti pending
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
    const setupListener = async () => {
      try {
        const { collection, query, where, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('./services/firebase');

        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('status', '==', 'pending'));

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            setPendingCount(snapshot.size);
          },
          (error) => {
            console.error('Errore conteggio pending:', error);
            setPendingCount(0);
          }
        );

        return unsubscribe;
      } catch (error) {
        console.error('Errore setup listener:', error);
        setPendingCount(0);
      }
    };

    let unsubscribe;
<<<<<<< HEAD
    setupListener().then((unsub) => {
=======
    setupListener().then(unsub => {
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [user]);

  return (
<<<<<<< HEAD
    <button
      className="action-btn notification-btn"
=======
    <button 
      className="action-btn notification-btn" 
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
      type="button"
      title={pendingCount > 0 ? `${pendingCount} utenti in attesa di approvazione` : 'Nessuna notifica'}
    >
      <FiBell />
<<<<<<< HEAD
      {pendingCount > 0 && <span className="notification-badge">{pendingCount}</span>}
=======
      {pendingCount > 0 && (
        <span className="notification-badge">{pendingCount}</span>
      )}
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
    </button>
  );
}

// ==================== COMPONENTE LOGIN PREMIUM ====================
function Login() {
<<<<<<< HEAD
  const { loginWithGoogle, login, signup, loading: authLoading, resetPassword } = useAuth();
=======
  const { loginWithGoogle, login, signup, loading: authLoading } = useAuth();
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
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
<<<<<<< HEAD
      setError(`Errore durante ${activePanel === 'login' ? 'il login' : 'la registrazione'}: ${err?.message || ''}`);
=======
      setError(
        `Errore durante ${activePanel === 'login' ? 'il login' : 'la registrazione'}: ${err?.message || ''}`
      );
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
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
              <div className="logo-icon-premium login-logo">
                <div className="sparkle">✨</div>
                <img src="/aurora-ghibli.png" alt="Aurora" className="logo-img" />
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

<<<<<<< HEAD
                  {/* ✅ PASSWORD DIMENTICATA */}
                  <div className="forgot-password-wrapper">
                    <button
                      type="button"
                      className="forgot-password-btn"
                      onClick={async () => {
                        const email = formData.email;
                        if (!email) {
                          alert('Inserisci la tua email prima di richiedere il reset password');
                          return;
                        }
                        if (window.confirm(`Inviare email di reset password a ${email}?`)) {
                          try {
                            setLoading(true);
                            const result = await resetPassword(email);
                            if (result.success) {
                              alert('✅ Email di reset inviata! Controlla la tua casella di posta.');
                            } else {
                              alert('❌ Errore: ' + result.error);
                            }
                          } catch (err) {
                            alert('❌ Errore invio email: ' + err.message);
                          } finally {
                            setLoading(false);
                          }
                        }
                      }}
                      disabled={loading}
                    >
                      Password dimenticata?
                    </button>
                  </div>

=======
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
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
<<<<<<< HEAD
                    <label className="form-label">Nome</label>
=======
                    <label className="form-label">Nome e Cognome</label>
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
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
<<<<<<< HEAD
                    />
                    <label className="form-label">Password</label>
                    <div className="input-decoration" />
                  </div>

                  <button type="submit" className="auth-submit-btn-premium" disabled={loading || authLoading}>
=======
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
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
                    <span className="btn-text">
                      {loading ? (
                        <>
                          <div className="loading-spinner" />
<<<<<<< HEAD
                          Registrazione in corso...
                        </>
                      ) : (
                        'Crea Account'
=======
                          Creazione account...
                        </>
                      ) : (
                        'Crea il Mio Account'
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
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
<<<<<<< HEAD
// Mappa weather_code Open-Meteo a icona e descrizione italiana
function getWeatherInfo(code) {
  if (code === 0) return { icon: <WiDaySunny className="weather-icon" />, desc: 'Sereno' };
  if (code === 1) return { icon: <WiDaySunny className="weather-icon" />, desc: 'Prevalentemente sereno' };
  if (code === 2) return { icon: <WiDayCloudy className="weather-icon" />, desc: 'Parzialmente nuvoloso' };
  if (code === 3) return { icon: <WiCloudy className="weather-icon" />, desc: 'Nuvoloso' };
  if (code === 45 || code === 48) return { icon: <WiFog className="weather-icon" />, desc: 'Nebbia' };
  if ([51, 53, 55, 56, 57].includes(code)) return { icon: <WiRain className="weather-icon" />, desc: 'Pioggerella' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { icon: <WiRain className="weather-icon" />, desc: 'Pioggia' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: <WiSnow className="weather-icon" />, desc: 'Neve' };
  if ([95, 96, 99].includes(code)) return { icon: <WiThunderstorm className="weather-icon" />, desc: 'Temporale' };
  return { icon: <WiDaySunny className="weather-icon" />, desc: 'N/D' };
}

function Sidebar({ activeMenu, setActiveMenu, sidebarOpen, setSidebarOpen }) {
  const { user, logout } = useAuth();
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!user?.uid) return;
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('./services/firebase');
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const city = userDoc.exists() ? (userDoc.data().weatherCity || 'Roma') : 'Roma';

        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=it`
        );
        const geoData = await geoRes.json();
        if (!geoData.results || geoData.results.length === 0) {
          setWeather({ temp: '--', desc: 'Città non trovata', icon: <WiDaySunny className="weather-icon" />, city });
          return;
        }
        const { latitude, longitude, name } = geoData.results[0];

        const meteoRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
        );
        const meteoData = await meteoRes.json();
        const temp = Math.round(meteoData.current.temperature_2m);
        const weatherInfo = getWeatherInfo(meteoData.current.weather_code);

        setWeather({ temp, desc: weatherInfo.desc, icon: weatherInfo.icon, city: name });
      } catch (error) {
        console.error('Errore caricamento meteo:', error);
        setWeather({ temp: '--', desc: 'Errore', icon: <WiDaySunny className="weather-icon" />, city: '...' });
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);
=======
function Sidebar({ activeMenu, setActiveMenu, sidebarOpen, setSidebarOpen }) {
  const { user, logout } = useAuth();
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1

  const menuItems = [
    { id: 'dashboard', icon: <FiHome />, label: 'Dashboard', color: '#4f46e5' },
    { id: 'accounts', icon: <FiCreditCard />, label: 'Conti', color: '#06b6d4' },
    { id: 'transactions', icon: <FiDollarSign />, label: 'Transazioni', color: '#10b981' },
    { id: 'categories', icon: <FiBarChart2 />, label: 'Categorie', color: '#8b5cf6' },
    { id: 'reports', icon: <FiBarChart2 />, label: 'Report', color: '#f59e0b' },
    { id: 'budgets', icon: <FiPieChart />, label: 'Budget', color: '#22c55e' },
<<<<<<< HEAD
    { id: 'savings', icon: <FiTarget />, label: 'Obiettivi', color: '#f97316' },
=======
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
    { id: 'import', icon: <FiUpload />, label: 'Importa', color: '#ef4444' },
    { id: 'birthdays', icon: <FiGift />, label: 'Compleanni', color: '#ec4899' },
    { id: 'admin', icon: <FiShield />, label: 'Admin', color: '#dc2626' },
    { id: 'settings', icon: <FiSettings />, label: 'Impostazioni', color: '#6b7280' }
  ];

<<<<<<< HEAD
  const handleClose = () => setSidebarOpen(false);
=======
  const handleClose = () => {
    setSidebarOpen(false);
  };
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1

  const handleMenuClick = (itemId) => {
    setActiveMenu(itemId);
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error('Errore logout:', e);
    }
  };

  return (
    <>
      {sidebarOpen && <div className="sidebar-overlay" onClick={handleClose} />}

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
                <div className="aurora-glow"></div>
<<<<<<< HEAD
                <img src="/aurora-ghibli.png" alt="Aurora" className="logo-img" />
=======
                <img
                  src="/aurora-ghibli.png"
                  alt="Aurora"
                  className="logo-img"
                />
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
              </div>
              <div className="logo-text">
                <h2>Aurora</h2>
                <span>4.0</span>
              </div>
            </div>
            <button className="close-sidebar" onClick={handleClose} type="button">
              <FiX />
            </button>
          </div>

          <nav className="sidebar-nav">
<<<<<<< HEAD
            {menuItems
              .filter((item) => {
                if (item.id === 'admin' && user?.email !== 'lucarenna76@gmail.com') return false;
                return true;
              })
              .map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${activeMenu === item.id ? 'active' : ''}`}
                  onClick={() => handleMenuClick(item.id)}
                  style={{ '--accent-color': item.color }}
                  type="button"
                >
                  <div className="nav-icon-wrapper">{item.icon}</div>
                  <span className="nav-label">{item.label}</span>
                  <div className="nav-indicator" />
                </button>
              ))}
=======
            {menuItems.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${activeMenu === item.id ? 'active' : ''}`}
                onClick={() => handleMenuClick(item.id)}
                style={{ '--accent-color': item.color }}
                type="button"
              >
                <div className="nav-icon-wrapper">{item.icon}</div>
                <span className="nav-label">{item.label}</span>
                <div className="nav-indicator" />
              </button>
            ))}
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
          </nav>

          <div className="sidebar-footer">
            <div className="weather-card">
<<<<<<< HEAD
              {weather ? weather.icon : <WiDaySunny className="weather-icon" />}
              <div className="weather-info">
                <div className="weather-temp">{weather ? `${weather.temp}°C` : '...'}</div>
                <div className="weather-location">
                  {weather ? `${weather.city}, ${weather.desc}` : 'Caricamento...'}
                </div>
=======
              <WiDaySunny className="weather-icon" />
              <div className="weather-info">
                <div className="weather-temp">22°C</div>
                <div className="weather-location">Roma, Sole</div>
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
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
<<<<<<< HEAD
=======
              {/* Logout SOLO desktop (nella sidebar) */}
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
              <button className="logout-btn desktop-only" onClick={handleLogout} title="Logout" type="button">
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
<<<<<<< HEAD
        <button className="menu-toggle" onClick={() => setSidebarOpen(true)} type="button">
=======
        <button 
          className="menu-toggle" 
          onClick={() => setSidebarOpen(true)} 
          type="button"
        >
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
          <FiMenu />
        </button>

        <div className="header-actions">
          <NotificationBadge />

<<<<<<< HEAD
=======
          {/* Logout SOLO mobile (nell'header) */}
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
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

<<<<<<< HEAD
// ==================== FORMATO NUMERI ====================
function fmt(n) {
  const num = Math.abs(Number(n) || 0);
  const fixed = num.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withSep},${decPart}`;
}

// ==================== INSIGHTS SECTION ====================

function InsightsSection({ transactions, categories, accounts, monthlyIncome, monthlyExpenses, currentMonthIndex, currentYear, cs }) {
    const insights = useMemo(() => {
    const comparison = getMonthComparison(transactions, currentMonthIndex, currentYear);
    const topGrowing = getTopGrowingCategory(transactions, categories, currentMonthIndex, currentYear, accounts);
    const anomalies = getAnomalies(transactions, categories, currentMonthIndex, currentYear);
    const savingsRate = getSavingsRate(monthlyIncome, monthlyExpenses);

    const now = new Date();
    const currentDay = now.getDate();
    const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
    const projected = getProjectedExpenses(monthlyExpenses, currentDay, daysInMonth);

    return { comparison, topGrowing, anomalies, savingsRate, projected, daysInMonth, currentDay };
  }, [transactions, categories, accounts, monthlyIncome, monthlyExpenses, currentMonthIndex, currentYear]);

  const { comparison, topGrowing, anomalies, savingsRate, projected } = insights;

  return (
    <div className="section">
      <h2 className="section-title">Insights 💡</h2>
      <div className="insights-grid">
        <div className="insight-card">
          <div className="insight-label">Spese vs mese scorso</div>
          <div className={`insight-value ${comparison.percentChange > 0 ? 'negative' : 'positive'}`}>
            {comparison.percentChange > 0 ? '📈' : '📉'}{' '}
            {comparison.percentChange > 0 ? '+' : ''}
            {comparison.percentChange.toFixed(1)}%
          </div>
          <div className="insight-detail">
            {cs} {fmt(comparison.currentTotal)} vs {cs} {fmt(comparison.prevTotal)}
          </div>
        </div>

        <div className="insight-card">
          <div className="insight-label">Tasso di Risparmio</div>
          <div className={`insight-value ${savingsRate >= 0 ? 'positive' : 'negative'}`}>
            💰 {savingsRate.toFixed(1)}%
          </div>
          <div className="insight-detail">del reddito mensile risparmiato</div>
        </div>

        <div className="insight-card">
          <div className="insight-label">Proiezione Fine Mese</div>
          <div className="insight-value">
            🔮 {cs} {fmt(projected)}
          </div>
          <div className="insight-detail">stima spese a fine mese</div>
        </div>

        {topGrowing && (
          <div className="insight-card">
            <div className="insight-label">Categoria in Crescita</div>
            <div className={`insight-value ${topGrowing.growth > 50 ? 'negative' : topGrowing.growth > 0 ? 'warning' : 'positive'}`}>
  {topGrowing.icon} {topGrowing.name}
</div>
            <div className="insight-detail">+{topGrowing.growth.toFixed(1)}% vs mese scorso</div>
          </div>
        )}

        {anomalies.length > 0 && (
          <div className="insight-card insight-card-wide">
            <div className="insight-label">⚠️ Spese Anomale</div>
            {anomalies.map((a, i) => (
              <div key={i} className="insight-anomaly">
                <span className="anomaly-desc">{String(a.description || '').toLocaleUpperCase('it-IT')}</span>
                <span className="anomaly-amount">
                  {cs} {fmt(a.amount)}
                </span>
                <span className="anomaly-avg">
                  (media: {cs} {fmt(a.avgAmount)})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== DASHBOARD ====================
function DashboardContent({ setActiveMenu, setPendingFilter }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activitySearch, setActivitySearch] = useState('');
  const { user, userSettings } = useAuth();
  const { transactions = [], accounts = [], categories = [], createTransaction } = useFinancial();
  const cs = getCurrencySymbol(userSettings?.currency);
=======
// ==================== DASHBOARD ====================
function DashboardContent() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { user } = useAuth();
  const { transactions = [], accounts = [], categories = [] } = useFinancial();
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1

  const currentMonthIndex = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentMonthNumber = currentMonthIndex + 1;

<<<<<<< HEAD
  useEffect(() => {
    if (!user?.uid) return;
    const key = `aurora_recurring_processed_${new Date().toISOString().split('T')[0]}`;
    if (sessionStorage.getItem(key)) return;

    processRecurring(user.uid, createTransaction)
      .then((count) => {
        if (count > 0) console.log(`✅ Generate ${count} transazioni ricorrenti`);
        sessionStorage.setItem(key, '1');
      })
      .catch((e) => console.error('Errore processing ricorrenti:', e));
  }, [user?.uid, createTransaction]);

=======
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
  const [budgets, setBudgets] = useState([]);
  const [budgetsLoading, setBudgetsLoading] = useState(false);
  const [budgetsError, setBudgetsError] = useState('');

<<<<<<< HEAD
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);

=======
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
<<<<<<< HEAD
    async function loadBirthdays() {
      if (!user?.uid) return;
      try {
        const all = await getBirthdays(user.uid);
        const sorted = all
          .map((b) => ({ ...b, daysUntil: getDaysUntilBirthday(b.date) }))
          .filter((b) => b.daysUntil != null)
          .sort((a, b) => a.daysUntil - b.daysUntil)
          .slice(0, 2);
        if (mounted) setUpcomingBirthdays(sorted);
      } catch (e) {
        console.error('Errore caricamento compleanni:', e);
      }
    }
    loadBirthdays();
    return () => {
      mounted = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    let mounted = true;
=======
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1

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
<<<<<<< HEAD

    if (desc) return `${desc} • ${catLabel}`.toLocaleUpperCase('it-IT');
    return `${catLabel} • ${acc}`.toLocaleUpperCase('it-IT');
=======
    if (desc) return `${desc} • ${catLabel}`;
    return `${catLabel} • ${acc}`;
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
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

<<<<<<< HEAD
  const normalizeForSearch = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const recentTransactions = [...transactions].sort((a, b) => parseDate(b.date) - parseDate(a.date));
  const activityQuery = normalizeForSearch(activitySearch);
  const filteredRecentTransactions = recentTransactions
    .filter((t) => {
      if (!activityQuery) return true;
      const amountAbs = Math.abs(getAmount(t));
      const amountLabel = [
        `${cs} ${fmt(amountAbs)}`,
        amountAbs.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        amountAbs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        amountAbs.toFixed(2)
      ].join(' ');
      const haystack = [
        t?.description || '',
        getAccountName(t),
        getCategoryName(t),
        getSubCategoryName(t),
        amountLabel,
        getType(t)
      ]
        .map((x) => normalizeForSearch(x))
        .join(' ');
      return haystack.includes(activityQuery);
    })
    .slice(0, activityQuery ? 12 : 4);
=======
  const recentTransactions = [...transactions]
    .sort((a, b) => parseDate(b.date) - parseDate(a.date))
    .slice(0, 4);
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1

  const monthlyExpenseByCategoryKey = monthlyTransactions
    .filter((t) => getType(t) === 'expense')
    .reduce((acc, t) => {
      const key = t?.categoryId || t?.categoryName || t?.category || 'Senza categoria';
      acc[key] = (acc[key] || 0) + Math.abs(getAmount(t));
      return acc;
    }, {});

<<<<<<< HEAD
  const monthlyExpenseByCategoryName = monthlyTransactions
    .filter((t) => getType(t) === 'expense')
    .reduce((acc, t) => {
      const rawName = t?.categoryName || t?.category || '';
      const name = String(rawName).trim().toLowerCase();
      if (!name) return acc;
      acc[name] = (acc[name] || 0) + Math.abs(getAmount(t));
      return acc;
    }, {});

  const budgetByCategoryId = (budgets || []).reduce((acc, b) => {
    if (!b?.categoryId) return acc;
    acc[b.categoryId] = b;
    return acc;
  }, {});

  const budgetByCategoryName = (budgets || []).reduce((acc, b) => {
    const name = String(b?.categoryName || '').trim().toLowerCase();
    if (!name) return acc;
    acc[name] = b;
    return acc;
  }, {});

  const budgetAlerts = categories
    .filter((c) => c?.type === 'expense')
    .map((c) => {
      const byName = budgetByCategoryName[String(c?.name || '').trim().toLowerCase()];
      const b = budgetByCategoryId[c.id] || byName;
      if (!b) return null;

      const key = c.id;
      const label = c.name || b?.categoryName || 'Categoria';
      const budget = Number(b?.amount ?? b?.budget ?? 0) || 0;
      const spent =
        monthlyExpenseByCategoryKey[key] || monthlyExpenseByCategoryName[String(c?.name || '').trim().toLowerCase()] || 0;
=======
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
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
      const pct = budget > 0 ? spent / budget : 0;

      let level = 'ok';
      if (budget > 0 && pct >= 1) level = 'over';
<<<<<<< HEAD
      else if (budget > 0 && pct >= 0.9) level = 'danger';
      else if (budget > 0 && pct >= 0.75) level = 'warn';
      else if (budget > 0 && pct >= 0.5) level = 'watch';

      return { key, label, budget, spent, pct, level };
    })
    .filter(Boolean)
    .sort((a, b) => b.pct - a.pct);

  const monthlyUncategorizedCount = monthlyTransactions.filter((t) => {
    const cat = t?.categoryId || t?.category;
    const isTransfer = !!(t?.isTransfer || t?.transferId || t?.type === 'transfer');
    return !cat && !isTransfer;
  }).length;

  const todayActions = useMemo(() => {
    const items = [];

    if (monthlyIncome > 0 && monthlyExpenses > monthlyIncome) {
      items.push({
        id: 'cashflow',
        title: 'Spese mese superiori alle entrate',
        detail: `Uscite ${cs} ${fmt(monthlyExpenses)} vs entrate ${cs} ${fmt(monthlyIncome)}`,
        cta: 'Apri Reports',
        menu: 'reports',
        level: 'danger'
      });
    }

    if (monthlyUncategorizedCount > 0) {
      items.push({
        id: 'uncategorized',
        title: 'Transazioni da categorizzare',
        detail: `${monthlyUncategorizedCount} movimenti del mese senza categoria`,
        cta: 'Apri Transazioni',
        menu: 'transactions',
        filter: 'uncategorized',
        level: 'warn'
      });
    }

    const criticalBudget = budgetAlerts.find((a) => a.level === 'over' || a.level === 'danger' || a.level === 'warn');
    if (criticalBudget) {
      items.push({
        id: 'budget',
        title: 'Budget da monitorare',
        detail: `${criticalBudget.label}: ${Math.round((criticalBudget.pct || 0) * 100)}% utilizzato`,
        cta: 'Apri Budget',
        menu: 'budgets',
        level: criticalBudget.level === 'over' ? 'danger' : 'warn'
      });
    }

    const nearBirthday = upcomingBirthdays.find((b) => (b.daysUntil ?? 999) <= 7);
    if (nearBirthday) {
      items.push({
        id: 'birthday',
        title: 'Compleanno imminente',
        detail: `${nearBirthday.name} ${nearBirthday.daysUntil === 0 ? 'oggi' : `tra ${nearBirthday.daysUntil} giorni`}`,
        cta: 'Apri Compleanni',
        menu: 'birthdays',
        level: 'info'
      });
    }

    if (items.length === 0) {
      items.push({
        id: 'ok',
        title: 'Situazione sotto controllo',
        detail: 'Nessuna urgenza: puoi registrare nuove operazioni o controllare i report.',
        cta: 'Aggiungi Transazione',
        menu: 'transactions',
        level: 'ok'
      });
    }

    return items.slice(0, 4);
  }, [
    monthlyIncome,
    monthlyExpenses,
    monthlyUncategorizedCount,
    budgetAlerts,
    upcomingBirthdays,
    cs
  ]);

=======
      else if (budget > 0 && pct >= 0.75) level = 'warn';

      return { key, label: labelForCategoryKey(key), budget, spent, pct, level };
    })
    .sort((a, b) => b.pct - a.pct);

>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
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
<<<<<<< HEAD
          <button className="quick-add-btn" onClick={() => setActiveMenu('transactions')} type="button">
            + Transazione
          </button>
          <div className="header-stats mobile-only-stats">
            <div className="mini-stat">
              <div className="mini-value mini-value-income">
                {cs} {fmt(monthlyIncome)}
              </div>
              <div className="mini-label">Entrate Mese</div>
            </div>
            <div className="mini-stat">
              <div className="mini-value mini-value-expense">
                {cs} {fmt(monthlyExpenses)}
              </div>
=======
          <div className="header-stats">
            <div className="mini-stat">
              <div className="mini-value">€ {monthlyIncome.toFixed(2)}</div>
              <div className="mini-label">Entrate Mese</div>
            </div>
            <div className="mini-stat">
              <div className="mini-value">€ {monthlyExpenses.toFixed(2)}</div>
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
              <div className="mini-label">Uscite Mese</div>
            </div>
          </div>
        </div>

        <div className="financial-overview">
          <div className="finance-card total-balance">
<<<<<<< HEAD
            <div className="card-content">
              <h3>Saldo Totale</h3>
              <div className="amount">
                {cs} {fmt(totalBalance)}
              </div>
=======
            <div className="card-graphic">
              <div className="floating-coins">💰💵💶</div>
            </div>
            <div className="card-content">
              <h3>Saldo Totale</h3>
              <div className="amount">€ {totalBalance.toFixed(2)}</div>
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
              <div className="trend positive">{accounts.length} conti attivi</div>
            </div>
          </div>

          <div className="finance-card cash-flow">
<<<<<<< HEAD
            <div className="card-content">
              <h3>Cash Flow Mensile</h3>
              <div className="amount" style={{ color: monthlySavings >= 0 ? '#10b981' : '#ef4444' }}>
                {monthlySavings < 0 ? '−' : ''}{cs} {fmt(monthlySavings)}
              </div>
              <div className="cashflow-detail">
                <span className="cf-income">
                  +{cs} {fmt(monthlyIncome)}
                </span>
                <span className="cf-expense">
                  −{cs} {fmt(monthlyExpenses)}
                </span>
=======
            <div className="card-graphic">
              <div className="flow-animation" />
            </div>
            <div className="card-content">
              <h3>Cash Flow Mensile</h3>
              <div className="amount">€ {monthlySavings.toFixed(2)}</div>
              <div className={`trend ${monthlySavings >= 0 ? 'positive' : 'negative'}`}>
                {monthlySavings >= 0 ? 'Positivo' : 'Negativo'}
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
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

<<<<<<< HEAD
        <InsightsSection
          transactions={transactions}
          categories={categories}
          accounts={accounts}
          monthlyIncome={monthlyIncome}
          monthlyExpenses={monthlyExpenses}
          currentMonthIndex={currentMonthIndex}
          currentYear={currentYear}
          cs={cs}
        />

        <div className="section">
          <h2 className="section-title">Azioni Consigliate Oggi</h2>
          <div className="today-actions-grid">
            {todayActions.map((a) => (
              <div key={a.id} className={`today-action-card ${a.level}`}>
                <div>
                  <div className="today-action-title">{a.title}</div>
                  <div className="today-action-detail">{a.detail}</div>
                </div>
                <button type="button" className="today-action-btn" onClick={() => { if (a.filter) setPendingFilter(a.filter); setActiveMenu(a.menu); }}>
                  {a.cta}
                </button>
              </div>
            ))}
          </div>
        </div>

=======
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
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
<<<<<<< HEAD
                const badge =
                  a.level === 'over'
                    ? '100%+ SUPERATO'
                    : a.level === 'danger'
                    ? '90%+ ALTO'
                    : a.level === 'warn'
                    ? '75%+ ATTENZIONE'
                    : a.level === 'watch'
                    ? '50%+ MONITORA'
                    : 'OK';
                const border =
                  a.level === 'over'
                    ? '2px solid #ef4444'
                    : a.level === 'danger'
                    ? '2px solid #f97316'
                    : a.level === 'warn'
                    ? '2px solid #f59e0b'
                    : a.level === 'watch'
                    ? '2px solid #eab308'
=======
                const badge = a.level === 'over' ? '🔴 Superato' : a.level === 'warn' ? '🟠 In arrivo' : '🟢 OK';
                const border =
                  a.level === 'over'
                    ? '2px solid #ef4444'
                    : a.level === 'warn'
                    ? '2px solid #f59e0b'
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
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
<<<<<<< HEAD
                        Speso: {cs} {fmt(a.spent)} / Budget: {cs} {fmt(a.budget)}
=======
                        Speso: € {a.spent.toFixed(2)} / Budget: € {a.budget.toFixed(2)}
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
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

<<<<<<< HEAD
        {upcomingBirthdays.length > 0 && (
          <div className="section">
            <h2 className="section-title">Prossimi Compleanni 🎂</h2>
            <div style={{ display: 'grid', gap: 10 }}>
              {upcomingBirthdays.map((b) => {
                const age = b.birthYear ? calculateAge(b.date, b.birthYear) : null;
                const nextAge = age != null ? age + 1 : null;
                return (
                  <div
                    key={b.id}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: b.daysUntil <= 7 ? '2px solid #ec4899' : '2px solid #8b5cf6',
                      borderRadius: 12,
                      padding: 14,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: b.daysUntil <= 7 ? 'rgba(236,72,153,0.15)' : 'rgba(139,92,246,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                        flexShrink: 0
                      }}
                    >
                      🎂
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{b.name}</div>
                      <div style={{ opacity: 0.8, fontSize: 13, marginTop: 2 }}>
                        {b.date}
                        {nextAge != null ? ` — compie ${nextAge} anni` : ''}
                      </div>
                    </div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 14,
                        color: b.daysUntil <= 7 ? '#ec4899' : '#8b5cf6',
                        textAlign: 'right',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {b.daysUntil === 0 ? 'Oggi!' : b.daysUntil === 1 ? 'Domani' : `tra ${b.daysUntil} gg`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="section">
          <div className="section-head-with-search">
            <h2 className="section-title">Attività Recente ⚡</h2>
            <div className="activity-search-wrap">
              <input
                type="text"
                className="activity-search-input"
                placeholder="Cerca attività..."
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
              />
              {activitySearch && (
                <button
                  type="button"
                  className="activity-search-clear"
                  onClick={() => setActivitySearch('')}
                  aria-label="Svuota ricerca"
                  title="Svuota ricerca"
                >
                  ×
                </button>
              )}
            </div>
          </div>
          {filteredRecentTransactions.length > 0 ? (
            <div className="activity-timeline">
              {filteredRecentTransactions.map((transaction) => {
=======
        <div className="section">
          <h2 className="section-title">Attività Recente ⚡</h2>
          {recentTransactions.length > 0 ? (
            <div className="activity-timeline">
              {recentTransactions.map((transaction) => {
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
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
<<<<<<< HEAD
                      {type === 'income' ? '+' : '-'}
                      {cs}
                      {fmt(amount)}
=======
                      {type === 'income' ? '+' : '-'}€{Math.abs(amount).toFixed(2)}
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
<<<<<<< HEAD
              <p>{activityQuery ? 'Nessun risultato per questa ricerca.' : 'Nessuna transazione recente. Inizia a tracciare le tue finanze!'}</p>
            </div>
          )}
        </div>
=======
              <p>Nessuna transazione recente. Inizia a tracciare le tue finanze!</p>
            </div>
          )}
        </div>

>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
      </div>
    </div>
  );
}

// ==================== SETTINGS ====================
function SettingsContent() {
<<<<<<< HEAD
  const { user, userSettings, setUserSettings } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [settings, setSettings] = useState({
    reminderEmail: '',
    reminderDaysBefore: 2,
    weatherCity: 'Roma',
    currency: userSettings?.currency || 'EUR'
  });

  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.uid) return;

=======
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const [settings, setSettings] = useState({
    reminderEmail: '',
    reminderDaysBefore: 2,
  });

  // Carica impostazioni utente
  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.uid) return;
      
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
      setLoading(true);
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('./services/firebase');
<<<<<<< HEAD

        const userDoc = await getDoc(doc(db, 'users', user.uid));

=======
        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
        if (userDoc.exists()) {
          const data = userDoc.data();
          setSettings({
            reminderEmail: data.reminderEmail || user.email,
            reminderDaysBefore: data.reminderDaysBefore || 2,
<<<<<<< HEAD
            weatherCity: data.weatherCity || 'Roma',
            currency: data.currency || 'EUR'
=======
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
          });
        } else {
          setSettings({
            reminderEmail: user.email,
            reminderDaysBefore: 2,
<<<<<<< HEAD
            weatherCity: 'Roma',
            currency: 'EUR'
=======
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
          });
        }
      } catch (error) {
        console.error('Errore caricamento impostazioni:', error);
        setMessage({ text: 'Errore caricamento impostazioni', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  const handleSave = async () => {
    if (!user?.uid) return;
<<<<<<< HEAD

    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const { updateReminderSettings, updateWeatherCity } = await import('./services/userApprovalService');

      const { doc: fbDoc, updateDoc: fbUpdate } = await import('firebase/firestore');
      const { db: fbDb } = await import('./services/firebase');

      const [result, weatherResult] = await Promise.all([
        updateReminderSettings(user.uid, settings.reminderEmail, settings.reminderDaysBefore),
        updateWeatherCity(user.uid, settings.weatherCity),
        fbUpdate(fbDoc(fbDb, 'users', user.uid), { currency: settings.currency })
      ]);

      if (setUserSettings) {
        setUserSettings((prev) => ({ ...prev, currency: settings.currency }));
      }

      if (result.success && weatherResult.success) {
=======
    
    setSaving(true);
    setMessage({ text: '', type: '' });
    
    try {
      const { updateReminderSettings } = await import('./services/userApprovalService');
      
      const result = await updateReminderSettings(
        user.uid,
        settings.reminderEmail,
        settings.reminderDaysBefore
      );
      
      if (result.success) {
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
        setMessage({ text: '✅ Impostazioni salvate con successo!', type: 'success' });
      } else {
        setMessage({ text: '❌ Errore salvataggio impostazioni', type: 'error' });
      }
    } catch (error) {
      console.error('Errore salvataggio:', error);
      setMessage({ text: '❌ Errore: ' + error.message, type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
  };

  const handleChange = (field, value) => {
<<<<<<< HEAD
    setSettings((prev) => ({ ...prev, [field]: value }));
=======
    setSettings(prev => ({ ...prev, [field]: value }));
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
  };

  if (loading) {
    return (
      <div className="content-page">
        <div className="aurora-background">
          <div className="aurora-layer-1"></div>
          <div className="aurora-layer-2"></div>
          <div className="aurora-layer-3"></div>
        </div>
        <div className="dashboard-content">
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div className="spinner"></div>
            <p>Caricamento impostazioni...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-page">
      <div className="aurora-background">
        <div className="aurora-layer-1"></div>
        <div className="aurora-layer-2"></div>
        <div className="aurora-layer-3"></div>
      </div>

      <div className="dashboard-content">
        <div className="page-header">
          <h1>⚙️ Impostazioni</h1>
          <p>Personalizza Aurora 4.0 secondo le tue preferenze</p>
        </div>

        {message.text && (
<<<<<<< HEAD
          <div
=======
          <div 
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
            style={{
              padding: '1rem',
              borderRadius: '12px',
              marginBottom: '1.5rem',
<<<<<<< HEAD
              background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border:
                message.type === 'success'
                  ? '1px solid rgba(34, 197, 94, 0.3)'
                  : '1px solid rgba(239, 68, 68, 0.3)',
=======
              background: message.type === 'success' 
                ? 'rgba(34, 197, 94, 0.1)' 
                : 'rgba(239, 68, 68, 0.1)',
              border: message.type === 'success'
                ? '1px solid rgba(34, 197, 94, 0.3)'
                : '1px solid rgba(239, 68, 68, 0.3)',
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
              color: 'white',
              textAlign: 'center'
            }}
          >
            {message.text}
          </div>
        )}

        <div className="settings-grid">
<<<<<<< HEAD
=======
          {/* Profilo Utente */}
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
          <div className="setting-section">
            <h3>👤 Profilo Utente</h3>
            <div className="user-profile-info">
              <div className="profile-avatar">
<<<<<<< HEAD
                {user?.photoURL ? <img src={user.photoURL} alt="Avatar" className="avatar-img" /> : <FiUser size={40} />}
=======
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="avatar-img" />
                ) : (
                  <FiUser size={40} />
                )}
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
              </div>
              <div className="profile-details">
                <h4>{user?.displayName || 'Utente'}</h4>
                <p>{user?.email}</p>
                <span className="profile-badge">Account Attivo</span>
              </div>
            </div>
          </div>

<<<<<<< HEAD
=======
          {/* Notifiche Compleanni */}
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
          <div className="setting-section">
            <h3>🎂 Notifiche Compleanni</h3>
            <p className="section-description">
              Ricevi promemoria via email per non dimenticare mai un compleanno importante
            </p>
<<<<<<< HEAD

=======
            
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
            <div className="setting-form">
              <div className="form-group">
                <label htmlFor="reminderEmail">
                  <FiMail style={{ marginRight: '8px' }} />
                  Email per Notifiche
                </label>
                <input
                  id="reminderEmail"
                  type="email"
                  value={settings.reminderEmail}
                  onChange={(e) => handleChange('reminderEmail', e.target.value)}
                  placeholder="tuaemail@esempio.com"
                  className="settings-input"
                />
                <small>L'email dove riceverai i promemoria dei compleanni</small>
              </div>

              <div className="form-group">
                <label htmlFor="reminderDaysBefore">
                  <FiBell style={{ marginRight: '8px' }} />
                  Anticipo Notifica
                </label>
                <select
                  id="reminderDaysBefore"
                  value={settings.reminderDaysBefore}
                  onChange={(e) => handleChange('reminderDaysBefore', parseInt(e.target.value))}
                  className="settings-select"
                >
                  <option value={1}>1 giorno prima</option>
                  <option value={2}>2 giorni prima</option>
                  <option value={3}>3 giorni prima</option>
                  <option value={5}>5 giorni prima</option>
                  <option value={7}>1 settimana prima</option>
                </select>
                <small>Quando vuoi ricevere il promemoria prima del compleanno</small>
              </div>

              <div className="reminder-preview">
                <div className="preview-icon">📧</div>
                <div className="preview-text">
                  <strong>Anteprima:</strong> Riceverai un'email a <strong>{settings.reminderEmail}</strong>{' '}
<<<<<<< HEAD
                  <strong>
                    {settings.reminderDaysBefore} {settings.reminderDaysBefore === 1 ? 'giorno' : 'giorni'}
                  </strong>{' '}
                  prima di ogni compleanno alle ore 9:00.
=======
                  <strong>{settings.reminderDaysBefore} {settings.reminderDaysBefore === 1 ? 'giorno' : 'giorni'}</strong> prima 
                  di ogni compleanno alle ore 9:00.
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
                </div>
              </div>
            </div>
          </div>

<<<<<<< HEAD
          <div className="setting-section">
            <h3>🌤️ Widget Meteo</h3>
            <p className="section-description">Scegli la città per il widget meteo nella sidebar</p>
            <div className="setting-form">
              <div className="form-group">
                <label htmlFor="weatherCity">Città per il Meteo</label>
                <input
                  id="weatherCity"
                  type="text"
                  value={settings.weatherCity}
                  onChange={(e) => handleChange('weatherCity', e.target.value)}
                  placeholder="Es. Roma, Milano, Napoli..."
                  className="settings-input"
                />
                <small>Il nome della città di cui visualizzare il meteo nella sidebar</small>
              </div>
            </div>
          </div>

          <div className="setting-section">
            <h3>💱 Valuta</h3>
            <p className="section-description">Scegli la valuta da visualizzare in tutta l'app</p>
            <div className="setting-form">
              <div className="form-group">
                <label htmlFor="currency">Valuta Predefinita</label>
                <select
                  id="currency"
                  value={settings.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  className="settings-select"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CHF">CHF (CHF)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="CAD">CAD (C$)</option>
                  <option value="AUD">AUD (A$)</option>
                  <option value="SEK">SEK (kr)</option>
                  <option value="NOK">NOK (kr)</option>
                  <option value="PLN">PLN (zł)</option>
                  <option value="BRL">BRL (R$)</option>
                  <option value="INR">INR (₹)</option>
                </select>
                <small>Il simbolo verrà usato in tutta l'app</small>
              </div>
            </div>
          </div>

=======
          {/* Info Sistema */}
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
          <div className="setting-section">
            <h3>ℹ️ Informazioni Sistema</h3>
            <div className="system-info">
              <div className="info-row">
                <span className="info-label">Versione App:</span>
                <span className="info-value">Aurora 4.0</span>
              </div>
              <div className="info-row">
                <span className="info-label">Ultimo Aggiornamento:</span>
                <span className="info-value">Febbraio 2026</span>
              </div>
              <div className="info-row">
                <span className="info-label">ID Utente:</span>
                <span className="info-value" style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                  {user?.uid?.substring(0, 20)}...
                </span>
              </div>
            </div>
          </div>
        </div>

<<<<<<< HEAD
        <div className="settings-actions">
          <button onClick={handleSave} disabled={saving} className="btn-save-settings" type="button">
=======
        {/* Pulsante Salva */}
        <div className="settings-actions">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-save-settings"
            type="button"
          >
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
            {saving ? (
              <>
                <div className="loading-spinner"></div>
                Salvataggio...
              </>
            ) : (
              <>
                <FiCheck style={{ marginRight: '8px' }} />
                Salva Impostazioni
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN CONTENT ====================
<<<<<<< HEAD
function MainContent({ activeMenu, setActiveMenu, pendingFilter, setPendingFilter, setSidebarOpen }) {
  const { user } = useAuth();

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return <DashboardContent setActiveMenu={setActiveMenu} setPendingFilter={setPendingFilter} />;
      case 'accounts':
        return <Accounts />;
      case 'transactions':
        return <Transactions initialFilter={pendingFilter} onFilterConsumed={() => setPendingFilter(null)} />;
=======
function MainContent({ activeMenu, setSidebarOpen }) {
  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return <DashboardContent />;
      case 'accounts':
        return <Accounts />;
      case 'transactions':
        return <Transactions />;
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
      case 'categories':
        return <Categories />;
      case 'reports':
        return <Reports />;
      case 'budgets':
        return <Budgets />;
<<<<<<< HEAD
      case 'savings':
        return <SavingsGoals />;
=======
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
      case 'import':
        return <Importa />;
      case 'birthdays':
        return <Birthdays />;
      case 'admin':
<<<<<<< HEAD
        if (user?.email !== 'lucarenna76@gmail.com') return <DashboardContent setActiveMenu={setActiveMenu} setPendingFilter={setPendingFilter} />;
=======
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
        return <AdminApproval />;
      case 'settings':
        return <SettingsContent />;
      default:
<<<<<<< HEAD
        return <DashboardContent setActiveMenu={setActiveMenu} setPendingFilter={setPendingFilter} />;
=======
        return <DashboardContent />;
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
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

<<<<<<< HEAD
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [pendingFilter, setPendingFilter] = useState(null);
=======
  const [activeMenu, setActiveMenu] = useState(() => {
    try {
      return localStorage.getItem(MENU_STORAGE_KEY) || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading: authLoading, userApprovalStatus, logout } = useAuth();

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
<<<<<<< HEAD
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#f8fafc'
        }}
      >
=======
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f8fafc'
      }}>
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
        <div>Caricamento...</div>
      </div>
    );
  }

  if (!user) return <Login />;

<<<<<<< HEAD
=======
  // ✅ Controlla se utente non è approvato
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
  if (userApprovalStatus && !userApprovalStatus.approved) {
    return <PendingApproval user={user} onLogout={logout} />;
  }

<<<<<<< HEAD
  return (
    <div className="app">
=======
  // ✅ UTENTE APPROVATO: Mostra app normale
  return (
    <div className="app">
      {/* <DebugApprovalStatus /> */}
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
      <Sidebar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
<<<<<<< HEAD
      <MainContent activeMenu={activeMenu} setActiveMenu={setActiveMenu} pendingFilter={pendingFilter} setPendingFilter={setPendingFilter} setSidebarOpen={setSidebarOpen} />
    </div>
  );
}

// ==================== APP PRINCIPALE ====================
function App() {
=======
      <MainContent activeMenu={activeMenu} setSidebarOpen={setSidebarOpen} />
    </div>
  );
}
// ==================== APP PRINCIPALE ====================
function App() {
  // Inizializza EmailJS all'avvio (solo se configurato)
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
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

<<<<<<< HEAD
export default App;
=======
export default App;
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
