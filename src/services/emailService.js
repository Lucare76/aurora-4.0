// src/services/emailService.js
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";

/**
 * Config Brevo via Firebase Functions
 * - Il frontend NON invia email direttamente.
 * - Chiama una Cloud Function che usa Brevo e può inviare anche se l'app è offline.
 *
 * Richiede:
 * 1) Firebase inizializzato (getApp()).
 * 2) Functions deployate con i nomi indicati sotto.
 */

// Nomi delle Cloud Functions (callable)
const FN_SEND_BIRTHDAY_REMINDER = "sendBirthdayReminderBrevo";
const FN_SEND_TEST_EMAIL = "sendTestEmailBrevo";

/**
 * Inizializza (opzionale) - qui serve solo per verificare che Functions siano disponibili
 */
export function initEmailJS() {
  // Mantengo il nome export per compatibilità col resto dell'app
  // (ma ora non è EmailJS, è Brevo via Functions).
  if (!isEmailJSConfigured()) {
    console.warn("⚠️ Brevo/Functions non configurate correttamente");
    return;
  }
  console.log("✅ Email service pronto (Brevo via Firebase Functions)");
}

/**
 * Verifica configurazione.
 * Qui controlliamo solo che Firebase App esista e che Functions si possano istanziare.
 */
export function isEmailJSConfigured() {
  try {
    getApp(); // lancia errore se Firebase non è inizializzato
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Invia email reminder compleanno (tramite Cloud Function -> Brevo)
 */
export async function sendBirthdayReminder(userData, birthdayData) {
  try {
    if (!isEmailJSConfigured()) {
      return { success: false, error: "Firebase non configurato" };
    }

    if (!userData?.email) {
      return { success: false, error: "Email utente mancante" };
    }

    const app = getApp();
    const functions = getFunctions(app);

    const sendFn = httpsCallable(functions, FN_SEND_BIRTHDAY_REMINDER);

    // payload essenziale alla Function
    const payload = {
      toEmail: userData.email,
      userName: userData.displayName || "Utente",
      birthdayName: birthdayData.name,
      birthdayDate: birthdayData.date,
      // se vuoi puoi calcolare days_until lato backend o passarlo dal frontend
      // daysUntil: birthdayData.daysUntil
    };

    const result = await sendFn(payload);

    // result.data dipende da cosa ritorna la tua Function
    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    console.error("❌ Errore invio email (Brevo):", error);
    return {
      success: false,
      error: error?.message || "Errore invio email"
    };
  }
}

/**
 * Invia email di test (tramite Cloud Function -> Brevo)
 */
export async function sendTestEmail(userEmail, userName) {
  try {
    if (!isEmailJSConfigured()) {
      return { success: false, error: "Firebase non configurato" };
    }

    if (!userEmail) {
      return { success: false, error: "Email destinatario mancante" };
    }

    const app = getApp();
    const functions = getFunctions(app);

    const sendFn = httpsCallable(functions, FN_SEND_TEST_EMAIL);

    const payload = {
      toEmail: userEmail,
      userName: userName || "Utente"
    };

    const result = await sendFn(payload);

    return {
      success: true,
      data: result.data,
      message: "Email di test inviata con successo!"
    };
  } catch (error) {
    console.error("❌ Errore test email (Brevo):", error);
    return {
      success: false,
      error: error?.message || "Errore test email"
    };
  }
}
