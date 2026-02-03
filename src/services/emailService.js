// src/services/emailService.js
import emailjs from '@emailjs/browser';

// ⚠️ CONFIGURAZIONE EMAILJS
// 1. Vai su https://www.emailjs.com/ e crea un account gratuito
// 2. Crea un servizio email (Gmail, Outlook, etc.)
// 3. Crea un template email con queste variabili:
//    - {{user_name}} = nome utente
//    - {{birthday_name}} = nome persona compleanno
//    - {{birthday_date}} = data compleanno
//    - {{days_until}} = giorni mancanti
// 4. Inserisci le tue credenziali qui sotto:

const EMAILJS_CONFIG = {
  serviceId: 'service_v86nvim',      // ✅ CONFIGURATO
  templateId: 'template_q0d1u2l',    // ✅ CONFIGURATO
  publicKey: 'cO_hwkOq1QDUszCeX'     // ✅ CONFIGURATO
};

/**
 * Inizializza EmailJS (chiamare all'avvio app)
 */
export function initEmailJS() {
  // Verifica se EmailJS è configurato prima di inizializzare
  if (!isEmailJSConfigured()) {
    console.warn('⚠️ EmailJS non ancora configurato');
    return;
  }
  
  try {
    emailjs.init(EMAILJS_CONFIG.publicKey);
    console.log('✅ EmailJS inizializzato');
  } catch (error) {
    console.error('❌ Errore init EmailJS:', error);
  }
}

/**
 * Invia email reminder compleanno
 */
export async function sendBirthdayReminder(userData, birthdayData) {
  try {
    // Verifica configurazione
    if (
      EMAILJS_CONFIG.serviceId === 'YOUR_SERVICE_ID' ||
      EMAILJS_CONFIG.templateId === 'YOUR_TEMPLATE_ID' ||
      EMAILJS_CONFIG.publicKey === 'YOUR_PUBLIC_KEY'
    ) {
      console.warn('⚠️ EmailJS non configurato. Configura le credenziali in emailService.js');
      return {
        success: false,
        error: 'EmailJS non configurato'
      };
    }

    const templateParams = {
      to_email: userData.email, // email destinatario (utente)
      user_name: userData.displayName || 'Utente',
      birthday_name: birthdayData.name,
      birthday_date: birthdayData.date,
      days_until: '2',
      reply_to: userData.email
    };

    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams
    );

    console.log('✅ Email inviata:', response);

    return {
      success: true,
      messageId: response.text
    };
  } catch (error) {
    console.error('❌ Errore invio email:', error);
    return {
      success: false,
      error: error.message || 'Errore invio email'
    };
  }
}

/**
 * Invia email di test
 */
export async function sendTestEmail(userEmail, userName) {
  try {
    if (
      EMAILJS_CONFIG.serviceId === 'YOUR_SERVICE_ID' ||
      EMAILJS_CONFIG.templateId === 'YOUR_TEMPLATE_ID' ||
      EMAILJS_CONFIG.publicKey === 'YOUR_PUBLIC_KEY'
    ) {
      return {
        success: false,
        error: 'Configura prima EmailJS in emailService.js'
      };
    }

    const templateParams = {
      to_email: userEmail,
      user_name: userName,
      birthday_name: 'Maria Rossi (TEST)',
      birthday_date: '15/03',
      days_until: '2',
      reply_to: userEmail
    };

    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams
    );

    return {
      success: true,
      message: 'Email di test inviata con successo!'
    };
  } catch (error) {
    console.error('Errore test email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verifica configurazione EmailJS
 */
export function isEmailJSConfigured() {
  return (
    EMAILJS_CONFIG.serviceId !== 'YOUR_SERVICE_ID' &&
    EMAILJS_CONFIG.templateId !== 'YOUR_TEMPLATE_ID' &&
    EMAILJS_CONFIG.publicKey !== 'YOUR_PUBLIC_KEY' &&
    EMAILJS_CONFIG.serviceId && 
    EMAILJS_CONFIG.templateId && 
    EMAILJS_CONFIG.publicKey
  );
}