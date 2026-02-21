// src/services/receiptService.js

const CLOUD_FUNCTION_URL =
  'https://analyzereceipt-nvhh2a2tka-ew.a.run.app';

/**
 * Analizza un'immagine di scontrino tramite la Cloud Function OCR.
 *
 * @param {string} imageBase64 - Immagine in formato base64 (con o senza prefisso data URI)
 * @returns {Promise<{amount: number|null, merchant: string|null, date: string|null, rawText: string}>}
 */
export async function analyzeReceipt(imageBase64) {
  const response = await fetch(CLOUD_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64 }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Errore server: ${response.status}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Errore durante l\'analisi dello scontrino');
  }

  return result.data;
}
