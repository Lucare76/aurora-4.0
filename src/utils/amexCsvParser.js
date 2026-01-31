// src/utils/amexCsvParser.js

/**
 * Parser CSV American Express "Activity"
 * Ritorna:
 * {
 *   meta: { parsed, deduped, headerRowIndex },
 *   transactions: [{ date: Date, description: string, amount: number }]
 * }
 */

function parseCsv(text) {
  const out = [];
  let row = [];
  let cur = "";
  let inQuotes = false;

  const s = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const next = s[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    // separatori: virgola o punto e virgola
    if (!inQuotes && (ch === "," || ch === ";")) {
      row.push(cur);
      cur = "";
      continue;
    }

    if (!inQuotes && ch === "\n") {
      row.push(cur);
      out.push(row);
      row = [];
      cur = "";
      continue;
    }

    cur += ch;
  }

  row.push(cur);
  out.push(row);

  // rimuovi righe vuote
  return out.filter((r) => r.some((c) => String(c || "").trim() !== ""));
}

const norm = (v) => String(v ?? "").trim();
const normLower = (v) => norm(v).toLowerCase();

function parseDateAny(v) {
  if (!v) return null;
  if (v instanceof Date) return v;

  const s = norm(v);
  if (!s) return null;

  // dd/mm/yyyy o dd-mm-yyyy
  let m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yy = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const d = new Date(yy, mm - 1, dd);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // yyyy-mm-dd
  m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    const yy = Number(m[1]);
    const mm = Number(m[2]);
    const dd = Number(m[3]);
    const d = new Date(yy, mm - 1, dd);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseAmountAny(v) {
  if (typeof v === "number") return v;

  let s = norm(v);
  if (!s) return 0;

  // togli valuta/spazi
  s = s.replace(/[€\s]/g, "");

  const hasDot = s.includes(".");
  const hasComma = s.includes(",");

  if (hasDot && hasComma) {
    // se ultima virgola dopo ultimo punto => europeo 1.234,56
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // US 1,234.56
      s = s.replace(/,/g, "");
    }
  } else if (hasComma && !hasDot) {
    s = s.replace(",", ".");
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function cleanDescription(s) {
  return norm(s).replace(/\s+/g, " ").trim();
}

function findHeaderAndCols(rows) {
  let headerRowIndex = -1;
  let header = [];

  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const r = rows[i].map(normLower);

    const hasDate = r.some((c) => c === "date" || c.includes("data"));
    const hasDesc = r.some(
      (c) => c.includes("description") || c.includes("descrizione") || c.includes("merchant")
    );
    const hasAmount = r.some((c) => c === "amount" || c.includes("importo"));

    if (hasDate && hasDesc && hasAmount) {
      headerRowIndex = i;
      header = r;
      break;
    }
  }

  if (headerRowIndex === -1) {
    headerRowIndex = 0;
    header = rows[0].map(normLower);
  }

  const idx = (keys) =>
    keys
      .map((k) => header.findIndex((h) => h === k || h.includes(k)))
      .find((i) => i >= 0);

  return {
    headerRowIndex,
    colDate: idx(["date", "data"]),
    colDesc: idx(["description", "descrizione", "merchant", "details", "detail"]),
    colAmount: idx(["amount", "importo"]),
    colType: idx(["type", "tipo"])
  };
}

export async function parseAmexCsv(file) {
  const text = await file.text();
  const rows = parseCsv(text);

  if (!rows.length) throw new Error("CSV vuoto o non valido");

  const { headerRowIndex, colDate, colDesc, colAmount, colType } = findHeaderAndCols(rows);

  if (colDate == null || colDate < 0) throw new Error('Colonna "Date/Data" non trovata nel CSV AMEX');
  if (colDesc == null || colDesc < 0)
    throw new Error('Colonna "Description/Descrizione" non trovata nel CSV AMEX');
  if (colAmount == null || colAmount < 0) throw new Error('Colonna "Amount/Importo" non trovata nel CSV AMEX');

  const transactions = [];

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const r = rows[i];

    const date = parseDateAny(r[colDate]);
    const description = cleanDescription(r[colDesc]);

    if (!date || !description) continue;

    let amount = parseAmountAny(r[colAmount]);

    // Regola segno:
    // - se c'è colonna type (credit/debit/refund/charge) la usiamo
    // - altrimenti: amount positivo = spesa => negativo
    const typeRaw = colType != null ? normLower(r[colType]) : "";

    if (typeRaw) {
      const isCredit =
        typeRaw.includes("credit") || typeRaw.includes("refund") || typeRaw.includes("rimborso");
      const isDebit =
        typeRaw.includes("debit") || typeRaw.includes("charge") || typeRaw.includes("purchase") || typeRaw.includes("spesa");

      if (isCredit) amount = Math.abs(amount);
      else if (isDebit) amount = -Math.abs(amount);
      else amount = amount < 0 ? amount : -Math.abs(amount);
    } else {
      amount = amount < 0 ? amount : -Math.abs(amount);
    }

    transactions.push({ date, description, amount });
  }

  // dedup
  const seen = new Set();
  const deduped = transactions.filter((t) => {
    const key = `${t.date.toISOString().slice(0, 10)}|${t.description}|${t.amount.toFixed(2)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    meta: {
      headerRowIndex,
      parsed: transactions.length,
      deduped: deduped.length
    },
    transactions: deduped
  };
}

export default parseAmexCsv;
