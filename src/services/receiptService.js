// src/services/receiptService.js
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";

const FUNCTIONS_REGION = "europe-west1";
const FN_ANALYZE_RECEIPT = "analyzeReceiptCallable";

/**
 * Analizza un'immagine di scontrino tramite la Cloud Function OCR.
 *
 * @param {string} imageBase64 - Immagine in formato base64 (con o senza prefisso data URI)
 * @returns {Promise<{amount: number|null, merchant: string|null, date: string|null, rawText: string}>}
 */
export async function analyzeReceipt(imageBase64) {
  const app = getApp();
  const functions = getFunctions(app, FUNCTIONS_REGION);
  const analyzeFn = httpsCallable(functions, FN_ANALYZE_RECEIPT);

  const result = await analyzeFn({ imageBase64 });
  const payload = result?.data;

  if (!payload?.success) {
    throw new Error(payload?.error || "Errore durante l'analisi dello scontrino");
  }

  return payload.data;
}
