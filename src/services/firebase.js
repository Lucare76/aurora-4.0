// src/services/firebase.js
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  getDoc,
  getDocs, // ✅ AGGIUNTO
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
<<<<<<< HEAD
  updateProfile,
  sendPasswordResetEmail
=======
  updateProfile
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
} from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// La tua configurazione Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCZAsfa9YloWpHqsh60oVJ67IpOR1AkFPU",
  authDomain: "aurora-4-0.firebaseapp.com",
  projectId: "aurora-4-0",
  storageBucket: "aurora-4-0.firebasestorage.app",
  messagingSenderId: "382079072942",
  appId: "1:382079072942:web:1bf3dc235f366dc0c24b3f"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);

// Inizializza servizi
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// Aggiungi impostazioni specifiche per Google Auth se necessario
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

<<<<<<< HEAD
// Funzioni Auth wrapper
export const loginWithEmail = async (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const loginWithGoogle = async () => {
  return signInWithPopup(auth, googleProvider);
};

export const resetPassword = async (email) => {
  return sendPasswordResetEmail(auth, email);
};

=======
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
// Esporta tutto
export {
  db,
  auth,
  storage,
  googleProvider,
  // Firestore
  collection,
  addDoc,
  getDoc,
  getDocs, // ✅ AGGIUNTO
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  // Auth
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile
};

export default app;
