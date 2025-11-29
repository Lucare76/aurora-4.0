// src/pages/Login.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, loginWithEmail, loginWithGoogle, resetPassword } from '../services/firebase';
import './Login.css'; // Creeremo questo file CSS

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Verifica se l'utente è già loggato
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        navigate('/dashboard');
      }
    });
    
    return () => unsubscribe();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await loginWithEmail(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Errore durante il login');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Errore durante il login con Google');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const emailInput = prompt('Inserisci la tua email per reimpostare la password:');
    if (emailInput) {
      try {
        await resetPassword(emailInput);
        alert('Email di recupero inviata con successo!');
      } catch (err) {
        alert('Errore durante l\'invio dell\'email di recupero: ' + err.message);
      }
    }
  };

  return (
    <div className="login-page-premium">
      {/* Aurora Background Effects */}
      <div className="aurora-background">
        <div className="aurora-layer-1"></div>
        <div className="aurora-layer-2"></div>
        <div className="aurora-layer-3"></div>
        <div className="floating-particles" id="particles-container"></div>
      </div>

      {/* Container principale */}
      <div className="login-container-premium">
        {/* Pannello sinistro - Form di login */}
        <div className="login-card-premium">
          <div className="login-header">
            <div className="logo-premium">
              <div className="logo-icon-premium">
                <span>💰</span>
                <div className="aurora-glow-premium"></div>
                <span className="logo-sparkle">✨</span>
              </div>
              <div className="logo-text-premium">
                <h1>Aurora</h1>
                <div className="version">4.0</div>
                <p className="tagline">La rivoluzione nella tua contabilità familiare</p>
              </div>
            </div>
          </div>

          {/* Tabs Accedi/Registrati */}
          <div className="auth-tabs">
            <button className="tab active">Accedi</button>
            <button className="tab">Registrati</button>
          </div>

          {/* Messaggio di benvenuto */}
          <div className="welcome-message">
            <h2>Bentornato! 👋</h2>
            <p>Accedi al tuo spazio finanziario personale</p>
          </div>

          {/* Login con Google */}
          <button 
            className="google-login-btn-premium" 
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <div className="google-btn-content">
              <div className="google-icon-wrapper">
                <svg className="google-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                  <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866.549 3.921 1.453L12.545 10.239z" fill="#4285F4"/>
                  <path d="M23.711 12.527c0-.671-.058-1.312-.17-1.925H12.545v3.821h6.366c-.295 1.618-1.346 2.965-2.896 3.682v2.527h4.647c2.722-2.506 4.284-6.218 4.284-10.105z" fill="#34A853"/>
                  <path d="M5.514 14.743c-.295-1.618-1.346-2.965-2.896-3.682v-2.527H1.337v2.527c-.603 1.206-.603 2.612 0 3.818l4.177 2.527z" fill="#FBBC05"/>
                  <path d="M12.545 24c2.896 0 5.445-1.007 7.228-2.764l-3.627-2.527c-1.007.652-2.315 1.007-3.601 1.007-2.257 0-4.284-1.542-5.001-3.682L1.337 18.561c2.14 4.177 6.667 7.073 11.208 7.073z" fill="#EA4335"/>
                </svg>
              </div>
              Continua con Google
            </div>
            <div className="btn-glow"></div>
          </button>

          {/* Divider */}
          <div className="divider-premium">
            <span>oppure con email</span>
          </div>

          {/* Form di login */}
          <form className="auth-form-premium" onSubmit={handleLogin}>
            <div className="form-group-premium">
              <input 
                type="email" 
                id="email" 
                className="form-input-premium" 
                placeholder=" " 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label htmlFor="email" className="form-label">Email</label>
              <div className="input-decoration"></div>
            </div>
            
            <div className="form-group-premium">
              <input 
                type="password" 
                id="password" 
                className="form-input-premium" 
                placeholder=" " 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <label htmlFor="password" className="form-label">Password</label>
              <div className="input-decoration"></div>
            </div>
            
            <button 
              type="submit" 
              className="auth-submit-btn-premium"
              disabled={loading}
            >
              <div className="btn-text">
                {loading ? (
                  <>
                    <div className="loading-spinner"></div>
                    Autenticazione...
                  </>
                ) : (
                  'Accedi al Dashboard'
                )}
                <div className="btn-shine"></div>
              </div>
            </button>
          </form>

          {error && <div className="login-error">{error}</div>}

          {/* Features list */}
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon">🔒</div>
              <div>Accesso sicuro con autenticazione a due fattori</div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📱</div>
              <div>Disponibile su tutti i dispositivi</div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📊</div>
              <div>Analisi dettagliate delle tue finanze</div>
            </div>
          </div>

          {/* Footer */}
          <div className="login-footer">
            <button 
              className="switch-btn-premium" 
              onClick={handleForgotPassword}
            >
              Hai dimenticato la password?
            </button>
          </div>
        </div>

        {/* Pannello destro - Features */}
        <div className="features-panel">
          <div className="features-content">
            <h3>Scopri Aurora 4.0</h3>
            <div className="feature-list">
              <div className="feature-highlight">
                <div className="highlight-icon">🎨</div>
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
                <div className="highlight-icon">🌐</div>
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
};

export default Login;