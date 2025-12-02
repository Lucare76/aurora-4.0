// src/services/firebase.js - VERSIONE CORRETTA E COMPLETA
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Configurazione Firebase del progetto Aurora 4.0
const firebaseConfig = {
  apiKey: "AIzaSyCZAsfa9YloWpHqsh60oVJ67IpOR1AkFPU",
  authDomain: "aurora-4-0.firebaseapp.com",
  projectId: "aurora-4-0",
  storageBucket: "aurora-4-0.firebasestorage.app",
  messagingSenderId: "382079072942",
  appId: "1:382079072942:web:1bf3dc235f366dc0c24b3f"
};

// Inizializza l'app Firebase
const app = initializeApp(firebaseConfig);

// Servizi Firebase
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Esporta TUTTE le funzioni necessarie
export {
  // Auth
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  
  // Firestore
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp
};

export default app;