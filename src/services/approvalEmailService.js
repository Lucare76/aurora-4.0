// src/services/approvalEmailService.js
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";

const FUNCTIONS_REGION = "europe-west1";

const FN_NEW_USER = "sendNewUserNotification";
const FN_APPROVED = "sendApprovalNotification";
const FN_REJECTED = "sendRejectionNotification";

function getCallable(name) {
  const app = getApp();
  const functions = getFunctions(app, FUNCTIONS_REGION);
  return httpsCallable(functions, name);
}

/**
 * Invia email all'admin quando un nuovo utente si registra
 * @param {object} userData - Dati del nuovo utente
 */
export async function sendNewUserNotification(userData) {
  try {
    const fn = getCallable(FN_NEW_USER);
    const result = await fn({
      email: userData.email,
      displayName: userData.displayName || "Nuovo Utente"
    });

    return { success: true, data: result.data };
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
    const fn = getCallable(FN_APPROVED);
    const result = await fn({
      email: userData.email,
      displayName: userData.displayName || "Utente"
    });

    return { success: true, data: result.data };
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
    const fn = getCallable(FN_REJECTED);
    const result = await fn({
      email: userData.email,
      displayName: userData.displayName || "Utente",
      reason: reason || ""
    });

    return { success: true, data: result.data };
  } catch (error) {
    console.error('❌ Errore invio email rifiuto:', error);
    return { success: false, error: error.message };
  }
}
