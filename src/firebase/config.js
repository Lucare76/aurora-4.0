import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Le tue credenziali Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCZAsfa9YloWpHqsh60oVJ67IpOR1AkFPU",
  authDomain: "aurora-4-0.firebaseapp.com",
  projectId: "aurora-4-0",
  storageBucket: "aurora-4-0.firebasestorage.app",
  messagingSenderId: "382079072942",
  appId: "1:382079072942:web:1bf3dc235f366dc0c24b3f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app);

export default app;