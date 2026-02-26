// src/utils/bancopostaExcelParser.js

/**
 * Parser Excel BancoPosta / Poste / Lista Movimenti
 * Ritorna:
 * {
 *   meta: { sheetName, headerRowIndex, parsed, deduped, columns },
 *   transactions: [{ date, description, amount }]
 * }
 */
export async function parseBancoPostaExcel(file) {
  const xlsxModule = await import("xlsx");
  const XLSX = xlsxModule.default ?? xlsxModule;
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const sheetName = workbook.SheetNames?.[0];
  if (!sheetName) throw new Error("Nessun foglio trovato nel file Excel");

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: "",
  });

  if (!rows?.length) throw new Error("Il foglio Excel è vuoto");

  const normalize = (v) => String(v ?? "").trim().toLowerCase();

  // 1) Trova riga header (entro le prime 40 righe)
  let headerRowIndex = -1;
  let header = [];

  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const r = (rows[i] || []).map(normalize);

    const hasDate = r.some((c) => c.includes("data"));
    const hasDesc = r.some(
      (c) =>
        c.includes("descrizione") ||
        c.includes("causale") ||
        c.includes("operazione") ||
        c.includes("movimento")
    );
    const hasAmounts = r.some(
      (c) =>
        c.includes("importo") ||
        c.includes("addeb") ||
        c.includes("accred") ||
        c.includes("dare") ||
        c.includes("avere")
    );

    if (hasDate && hasDesc && hasAmounts) {
      headerRowIndex = i;
      header = r;
      break;
    }
  }

  // fallback: prima riga
  if (headerRowIndex === -1) {
    headerRowIndex = 0;
    header = (rows[0] || []).map(normalize);
  }

  const colIndex = (keys) => {
    for (const k of keys) {
      const idx = header.findIndex((h) => h === k || h.includes(k));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  // 2) Identifica colonne
  const colDate = colIndex(["data contabile", "data operazione", "data", "data valuta"]);
  const colDesc = colIndex([
    "descrizione operazioni",
    "descrizione",
    "descrizione operazione",
    "causale",
    "operazione",
    "movimento",
  ]);

  // Importo unico (se esiste)
  const colAmount = colIndex(["importo", "importo (euro)", "totale"]);

  // BancoPosta spesso è separato:
  const colDebit = colIndex(["addebiti", "addebiti (euro)", "dare", "uscite"]);
  const colCredit = colIndex(["accrediti", "accrediti (euro)", "avere", "entrate"]);

  if (colDate < 0) throw new Error("Colonna DATA non trovata");
  if (colDesc < 0) throw new Error("Colonna DESCRIZIONE non trovata");

  // 3) Parser data/importi
  const parseDate = (v) => {
    if (v instanceof Date) return v;

    // Excel serial date
    if (typeof v === "number") {
      const d = XLSX.SSF.parse_date_code(v);
      return d ? new Date(d.y, d.m - 1, d.d) : null;
    }

    const s = String(v || "").trim();
    // gg/mm/aaaa o gg-mm-aaaa
    const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (m) {
      const dd = Number(m[1]);
      const mm = Number(m[2]);
      const yy = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
      const out = new Date(yy, mm - 1, dd);
      return Number.isNaN(out.getTime()) ? null : out;
    }

    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const parseAmount = (v) => {
    if (v === null || v === undefined || v === "") return 0;
    if (typeof v === "number") return v;

    let s = String(v).trim();
    s = s.replace(/\s/g, "").replace("€", "");

    // 1.234,56 -> 1234.56
    if (s.includes(".") && s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(",", ".");

    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  // 4) Costruisci transazioni
  const transactions = [];

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const r = rows[i] || [];

    const date = parseDate(r[colDate]);
    const description = String(r[colDesc] || "").trim();
    if (!description) continue;

    let amount = 0;

    if (colAmount >= 0) {
      amount = parseAmount(r[colAmount]);
    } else {
      // logica BancoPosta: amount = credit - debit
      const debit = colDebit >= 0 ? parseAmount(r[colDebit]) : 0;
      const credit = colCredit >= 0 ? parseAmount(r[colCredit]) : 0;

      // se uno dei due è valorizzato: credit positivo, debit negativo
      amount = credit - debit;
    }

    // scarta righe senza data valida e senza importo (opzionale)
    // (io lascio passare anche amount 0 se serve, ma se vuoi lo togliamo)
    transactions.push({ date, description, amount });
  }

  // 5) Dedup
  const seen = new Set();
  const deduped = transactions.filter((t) => {
    const iso = t.date instanceof Date ? t.date.toISOString().slice(0, 10) : "";
    const key = `${iso}|${t.description}|${t.amount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    meta: {
      sheetName,
      headerRowIndex,
      parsed: transactions.length,
      deduped: deduped.length,
      columns: { colDate, colDesc, colAmount, colDebit, colCredit },
    },
    transactions: deduped,
  };
}

// ✅ così puoi importare sia default che named
export default parseBancoPostaExcel;
