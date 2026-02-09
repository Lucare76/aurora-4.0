// src/services/userApprovalService.js
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Crea un documento utente dopo la registrazione
 * @param {string} userId - ID dell'utente Firebase Auth
 * @param {object} userData - Dati utente (email, displayName, etc.)
 */
export async function createUserDocument(userId, userData) {
  try {
    const userRef = doc(db, 'users', userId);
    
    await setDoc(userRef, {
      uid: userId,
      email: userData.email,
      displayName: userData.displayName || '',
      photoURL: userData.photoURL || null,
      approved: false, // 🔴 DA APPROVARE
      createdAt: new Date(),
      role: 'user', // 'user' o 'admin'
      status: 'pending', // 'pending', 'approved', 'rejected'
      // ✅ NUOVO: Email per i reminder compleanni
      reminderEmail: userData.email,
      reminderDaysBefore: 2 // Default: reminder 2 giorni prima
    });
    
    console.log('✅ Documento utente creato con reminderEmail:', userData.email);
    return { success: true };
  } catch (error) {
    console.error('❌ Errore creazione documento utente:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Controlla se un utente è approvato
 * @param {string} userId - ID dell'utente
 * @returns {object} - { approved: boolean, status: string, ... }
 */
export async function checkUserApproval(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return { 
        exists: false, 
        approved: false, 
        status: 'not_found',
        message: 'Utente non trovato nel sistema'
      };
    }
    
    const userData = userSnap.data();
    
    return {
      exists: true,
      approved: userData.approved || false,
      status: userData.status || 'pending',
      role: userData.role || 'user',
      email: userData.email,
      displayName: userData.displayName,
      reminderEmail: userData.reminderEmail || userData.email,
      reminderDaysBefore: userData.reminderDaysBefore || 2,
      message: userData.approved 
        ? 'Accesso consentito' 
        : 'Account in attesa di approvazione da parte dell\'amministratore'
    };
  } catch (error) {
    console.error('❌ Errore controllo approvazione:', error);
    return { 
      exists: false, 
      approved: false, 
      status: 'error',
      message: 'Errore durante la verifica. Riprova più tardi.' 
    };
  }
}

/**
 * Approva un utente (SOLO ADMIN)
 * @param {string} userId - ID dell'utente da approvare
 */
export async function approveUser(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    
    await updateDoc(userRef, {
      approved: true,
      status: 'approved',
      approvedAt: new Date()
    });
    
    console.log('✅ Utente approvato:', userId);
    return { success: true };
  } catch (error) {
    console.error('❌ Errore approvazione utente:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Rifiuta un utente (SOLO ADMIN)
 * @param {string} userId - ID dell'utente da rifiutare
 */
export async function rejectUser(userId, reason = '') {
  try {
    const userRef = doc(db, 'users', userId);
    
    await updateDoc(userRef, {
      approved: false,
      status: 'rejected',
      rejectedAt: new Date(),
      rejectionReason: reason
    });
    
    console.log('🚫 Utente rifiutato:', userId);
    return { success: true };
  } catch (error) {
    console.error('❌ Errore rifiuto utente:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Ottieni lista utenti in attesa di approvazione (SOLO ADMIN)
 */
export async function getPendingUsers() {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('status', '==', 'pending'));
    const querySnapshot = await getDocs(q);
    
    const pendingUsers = [];
    querySnapshot.forEach((doc) => {
      pendingUsers.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, users: pendingUsers };
  } catch (error) {
    console.error('❌ Errore recupero utenti pending:', error);
    return { success: false, error: error.message, users: [] };
  }
}

/**
 * Controlla se un utente è admin
 * @param {string} userId - ID dell'utente
 */
export async function isUserAdmin(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) return false;
    
    const userData = userSnap.data();
    return userData.role === 'admin';
  } catch (error) {
    console.error('❌ Errore controllo admin:', error);
    return false;
  }
}

/**
 * Aggiorna le impostazioni dei reminder per un utente
 * @param {string} userId - ID dell'utente
 * @param {string} reminderEmail - Email per ricevere i reminder
 * @param {number} reminderDaysBefore - Giorni prima del compleanno
 */
export async function updateReminderSettings(userId, reminderEmail, reminderDaysBefore = 2) {
  try {
    const userRef = doc(db, 'users', userId);
    
    await updateDoc(userRef, {
      reminderEmail,
      reminderDaysBefore,
      updatedAt: new Date()
    });
    
    console.log('✅ Impostazioni reminder aggiornate per:', userId);
    return { success: true };
  } catch (error) {
    console.error('❌ Errore aggiornamento reminder:', error);
    return { success: false, error: error.message };
  }
}