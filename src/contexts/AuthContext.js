// src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { createUserDocument, checkUserApproval } from '../services/userApprovalService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve essere usato dentro AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [userApprovalStatus, setUserApprovalStatus] = useState(null);
  const [userSettings, setUserSettings] = useState({
    currency: 'EUR',
    savingsTargetType: 'percent',
    savingsTargetPercent: 20,
    savingsTargetAmount: 0,
    dashboardMobileMode: 'normal',
    bellShowBirthdays: true,
    bellShowSubscriptions: true,
    bellShowUpcoming7Days: true
  });

  const setUserFromFirebaseUser = useCallback((firebaseUser) => {
    if (!firebaseUser) {
      setUser(null);
      setUserData(null);
      return;
    }
    setUser(firebaseUser);
    setUserData({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL
    });
  }, []);

  // 🔧 FUNZIONE PER GESTIRE ERRORI COMUNI (FIX: "Credenziali non valide")
  const getAuthErrorMessage = useCallback((error) => {
    const code = error?.code || '';

    switch (code) {
      // ✅ LOGIN: credenziali non valide (Firebase spesso usa auth/invalid-credential)
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Credenziali non valide';

      case 'auth/email-already-in-use':
        return 'Email già registrata';
      case 'auth/weak-password':
        return 'Password troppo debole (min. 6 caratteri)';
      case 'auth/invalid-email':
        return 'Email non valida';
      case 'auth/popup-closed-by-user':
        return 'Login Google annullato';
      case 'auth/network-request-failed':
        return 'Errore di rete. Controlla la connessione';
      case 'auth/too-many-requests':
        return 'Troppi tentativi. Riprova più tardi';
      case 'auth/user-disabled':
        return 'Account disabilitato';

      default:
        // 🔕 Evita di mostrare "Firebase: Error (...)" all’utente
        return 'Si è verificato un errore. Riprova';
    }
  }, []);

  // ✅ LOGIN CON GOOGLE
  const loginWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      
      // ✅ Verifica se utente esiste, altrimenti crea documento
      const approvalStatus = await checkUserApproval(result.user.uid);
      if (!approvalStatus.exists) {
        // Primo accesso con Google - crea documento
        // L'email viene inviata automaticamente dentro createUserDocument()
        await createUserDocument(result.user.uid, {
          email: result.user.email,
          displayName: result.user.displayName || '',
          photoURL: result.user.photoURL || null
        });
      }
      
      console.log('✅ Login Google riuscito:', result.user);
      return { success: true, user: result.user };
    } catch (error) {
      const message = getAuthErrorMessage(error);
      setAuthError(message);
      console.error("Errore login Google:", error);
      return { success: false, error: message };
    }
  }, [getAuthErrorMessage]);

  // 📝 REGISTRAZIONE
  const signup = useCallback(async (email, password, additionalData = {}) => {
    setAuthError(null);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      if (additionalData.displayName) {
        await updateProfile(user, { displayName: additionalData.displayName });
      }
      
      // ✅ Crea documento utente in Firestore
      // L'email viene inviata automaticamente dentro createUserDocument()
      await createUserDocument(user.uid, {
        email: user.email,
        displayName: additionalData.displayName || '',
        photoURL: user.photoURL || null
      });
      
      return { success: true, user };
    } catch (error) {
      const message = getAuthErrorMessage(error);
      setAuthError(message);
      return { success: false, error: message };
    }
  }, [getAuthErrorMessage]);

  // 🔐 LOGIN EMAIL/PASSWORD
  const login = useCallback(async (email, password) => {
    setAuthError(null);
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user };
    } catch (error) {
      const message = getAuthErrorMessage(error);
      setAuthError(message);
      return { success: false, error: message };
    }
  }, [getAuthErrorMessage]);

  // 🚪 LOGOUT
  const logout = useCallback(async () => {
    setAuthError(null);
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      const message = getAuthErrorMessage(error);
      setAuthError(message);
      return { success: false, error: message };
    }
  }, [getAuthErrorMessage]);

  // ✏️ AGGIORNA PROFILO
  const updateUserProfile = useCallback(async (updates) => {
    setAuthError(null);
    try {
      await updateProfile(auth.currentUser, updates);
      // Aggiorna stato locale
      setUserFromFirebaseUser({ ...auth.currentUser, ...updates });
      return { success: true };
    } catch (error) {
      const message = getAuthErrorMessage(error);
      setAuthError(message);
      return { success: false, error: message };
    }
  }, [getAuthErrorMessage, setUserFromFirebaseUser]);

  // 🔄 RESET PASSWORD
  const resetPassword = useCallback(async (email) => {
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      const message = getAuthErrorMessage(error);
      setAuthError(message);
      return { success: false, error: message };
    }
  }, [getAuthErrorMessage]);

  // 👂 LISTENER STATO AUTH
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔄 onAuthStateChanged -> user:', firebaseUser);

      if (firebaseUser) {
        // ✅ Controlla approvazione
        const approvalStatus = await checkUserApproval(firebaseUser.uid);
        setUserApprovalStatus(approvalStatus);

        // ✅ Carica settings utente (currency, etc.)
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('../services/firebase');
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserSettings(prev => ({
              ...prev,
              currency: data.currency || 'EUR',
              savingsTargetType: data.savingsTargetType || 'percent',
              savingsTargetPercent: data.savingsTargetPercent ?? 20,
              savingsTargetAmount: data.savingsTargetAmount ?? 0,
              dashboardMobileMode: data.dashboardMobileMode || 'normal'
            }));
          }
        } catch (e) {
          console.error('Errore caricamento settings:', e);
        }
      } else {
        setUserApprovalStatus(null);
        setUserSettings({
          currency: 'EUR',
          savingsTargetType: 'percent',
          savingsTargetPercent: 20,
          savingsTargetAmount: 0,
          dashboardMobileMode: 'normal'
        });
      }

      setUserFromFirebaseUser(firebaseUser);
      setLoading(false);
    }, (error) => {
      console.error('Errore in onAuthStateChanged:', error);
      setAuthError(getAuthErrorMessage(error));
      setLoading(false);
    });

    return unsubscribe;
  }, [setUserFromFirebaseUser, getAuthErrorMessage]);

  const isAdmin = userApprovalStatus?.role === 'admin';

  // 📦 VALORE DEL CONTESTO (MEMOIZZATO)
  const value = useMemo(() => ({
    user,
    userData,
    userApprovalStatus,
    isAdmin,
    userSettings,
    setUserSettings,
    loginWithGoogle,
    login,
    signup,
    logout,
    updateUserProfile,
    resetPassword,
    loading,
    error: authError,
    clearError: () => setAuthError(null)
  }), [
    user,
    userData,
    userApprovalStatus,
    isAdmin,
    userSettings,
    loginWithGoogle,
    login,
    signup,
    logout,
    updateUserProfile,
    resetPassword,
    loading,
    authError
  ]);

  // 🎨 LOADING SCREEN MIGLIORATO
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          borderRadius: '8px',
          backgroundColor: 'white',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '1rem' }}>👤</div>
          <div>Caricamento autenticazione...</div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '0.5rem' }}>
            Controllo dello stato di accesso
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
