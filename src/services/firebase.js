// src/services/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
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

// Auth (usata da AuthContext)
export const auth = getAuth(app);

// Provider Google (se vuoi riutilizzarlo altrove)
export const googleProvider = new GoogleAuthProvider();

// Firestore (per i dati)
export const db = getFirestore(app);

// Storage (per eventuali file/immagini)
export const storage = getStorage(app);

export default app;
