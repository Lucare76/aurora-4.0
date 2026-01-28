// src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../services/firebase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve essere usato dentro AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);   // 👈 uniformato
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const setUserFromFirebaseUser = (firebaseUser) => {
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
  };

  // ✅ Login con Google
  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      console.log('✅ Login Google riuscito:', result.user);
      // 🔑 non aggiorniamo manualmente, ci pensa onAuthStateChanged
      return result.user;
    } catch (error) {
      console.error("Errore login Google:", error);
      throw error;
    }
  };

  // Registrazione
  const signup = async (email, password, additionalData = {}) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    if (additionalData.displayName) {
      await updateProfile(user, { displayName: additionalData.displayName });
    }
    return user; // 🔑 onAuthStateChanged farà il resto
  };

  // Login email/password
  const login = async (email, password) => {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    return user;
  };

  // Logout
  const logout = async () => {
    await signOut(auth);
  };

  // Listener stato auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('🔄 onAuthStateChanged -> user:', firebaseUser);
      setUserFromFirebaseUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    user,        // 👈 alias uniforme
    userData,
    loginWithGoogle,
    login,
    signup,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <div>Caricamento autenticazione...</div> : children}
    </AuthContext.Provider>
  );
};
