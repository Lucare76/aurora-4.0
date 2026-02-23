import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

function Login() {
  const { loginWithGoogle, login, signup, loading: authLoading, resetPassword } = useAuth();
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
      setError(`Errore durante ${activePanel === 'login' ? 'il login' : 'la registrazione'}: ${err?.message || ''}`);
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
                    <label className="form-label">Nome</label>
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
                    />
                    <label className="form-label">Password</label>
                    <div className="input-decoration" />
                  </div>

                  <button type="submit" className="auth-submit-btn-premium" disabled={loading || authLoading}>
                    <span className="btn-text">
                      {loading ? (
                        <>
                          <div className="loading-spinner" />
                          Registrazione in corso...
                        </>
                      ) : (
                        'Crea Account'
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

export default Login;
