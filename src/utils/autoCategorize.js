// src/utils/autoCategorize.js

/**
 * Ritorna una categoria "testuale" in base a descrizione/importo.
 * Puoi estendere liberamente le regole sotto.
 */
export function autoCategorize(t) {
  const desc = String(t?.description || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  const amount = Number(t?.amount || 0);

  // Esempi regole (aggiungine quante vuoi)
  const rules = [
    { match: ["amazon", "amzn"], category: "Shopping" },
    { match: ["esselunga", "coop", "conad", "lidl", "eurospin", "carrefour"], category: "Spesa" },
    { match: ["enel", "eni", "acea", "a2a", "hera", "gas", "luce"], category: "Utenze" },
    { match: ["telecom", "tim", "vodafone", "wind", "fastweb", "iliad"], category: "Telefono/Internet" },
    { match: ["netflix", "spotify", "prime video", "disney"], category: "Abbonamenti" },
    { match: ["trenitalia", "italo", "uber", "taxi"], category: "Trasporti" },
    { match: ["autostrade", "telepass"], category: "Auto/Trasporti" },
    { match: ["farmacia", "parafarmacia"], category: "Salute" },
    { match: ["ristorante", "pizzeria", "bar", "caffè", "caffe"], category: "Ristoranti/Bar" },
    { match: ["stipendio", "salary", "pagamento stipendio"], category: "Entrate" },
    { match: ["bonifico in entrata", "accredito"], category: "Entrate" },
    { match: ["bonifico", "giroconto"], category: "Trasferimenti" },
    { match: ["prelievo atm", "prelievo"], category: "Contanti" },
    { match: ["paypal"], category: "Pagamenti Online" },
  ];

  for (const r of rules) {
    if (r.match.some((k) => desc.includes(k))) return r.category;
  }

  // fallback: se positivo entrata, se negativo uscita
  if (amount > 0) return "Entrate";
  if (amount < 0) return "Uscite";

  return "Senza categoria";
}

// Default export (così puoi importarlo anche senza le graffe)
export default autoCategorize;
