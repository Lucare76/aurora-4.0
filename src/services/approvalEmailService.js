// src/services/approvalEmailService.js
import emailjs from '@emailjs/browser';

// ✅ CONFIGURATO CON LE TUE CREDENZIALI EMAILJS
const EMAIL_CONFIG = {
  SERVICE_ID: 'service_v0sv3ct',
  ADMIN_EMAIL: 'luca_renna@hotmail.com',
  
  // Template IDs (devi crearli su EmailJS - vedi GUIDA-EMAIL-CONFIG.txt)
  TEMPLATE_NEW_USER: 'template_new_user',      // Per notifica all'admin
  TEMPLATE_APPROVED: 'template_user_approved', // Per notifica all'utente
  TEMPLATE_REJECTED: 'template_user_rejected', // Per notifica rifiuto
  
  PUBLIC_KEY: 'cO_hwkOq1QDUszCeX'
};

/**
 * Invia email all'admin quando un nuovo utente si registra
 * @param {object} userData - Dati del nuovo utente
 */
export async function sendNewUserNotification(userData) {
  try {
    const templateParams = {
      to_email: EMAIL_CONFIG.ADMIN_EMAIL, // luca_renna@hotmail.com
      admin_name: 'Luca',
      user_name: userData.displayName || 'Nuovo Utente',
      user_email: userData.email,
      registration_date: new Date().toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      app_url: window.location.origin
    };

    await emailjs.send(
      EMAIL_CONFIG.SERVICE_ID,
      EMAIL_CONFIG.TEMPLATE_NEW_USER,
      templateParams,
      EMAIL_CONFIG.PUBLIC_KEY
    );

    console.log('✅ Email notifica admin inviata a', EMAIL_CONFIG.ADMIN_EMAIL);
    return { success: true };
  } catch (error) {
    console.error('❌ Errore invio email notifica admin:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Invia email all'utente quando viene approvato
 * @param {object} userData - Dati dell'utente approvato
 */
export async function sendApprovalNotification(userData) {
  try {
    const templateParams = {
      to_email: userData.email,
      user_name: userData.displayName || 'Utente',
      app_name: 'Aurora 4.0',
      app_url: window.location.origin,
      support_email: EMAIL_CONFIG.ADMIN_EMAIL // luca_renna@hotmail.com
    };

    await emailjs.send(
      EMAIL_CONFIG.SERVICE_ID,
      EMAIL_CONFIG.TEMPLATE_APPROVED,
      templateParams,
      EMAIL_CONFIG.PUBLIC_KEY
    );

    console.log('✅ Email approvazione utente inviata a', userData.email);
    return { success: true };
  } catch (error) {
    console.error('❌ Errore invio email approvazione:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Invia email all'utente quando viene rifiutato (opzionale)
 * @param {object} userData - Dati dell'utente rifiutato
 * @param {string} reason - Motivo del rifiuto
 */
export async function sendRejectionNotification(userData, reason = '') {
  try {
    const templateParams = {
      to_email: userData.email,
      user_name: userData.displayName || 'Utente',
      rejection_reason: reason || 'Non specificato',
      support_email: EMAIL_CONFIG.ADMIN_EMAIL // luca_renna@hotmail.com
    };

    await emailjs.send(
      EMAIL_CONFIG.SERVICE_ID,
      EMAIL_CONFIG.TEMPLATE_REJECTED,
      templateParams,
      EMAIL_CONFIG.PUBLIC_KEY
    );

    console.log('✅ Email rifiuto utente inviata a', userData.email);
    return { success: true };
  } catch (error) {
    console.error('❌ Errore invio email rifiuto:', error);
    return { success: false, error: error.message };
  }
}

// Esporta la configurazione per modifiche rapide
export { EMAIL_CONFIG };