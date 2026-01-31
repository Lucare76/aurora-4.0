// src/pages/Importa.js
import React, { useMemo, useState } from "react";
import { parseBancoPostaExcel } from "../utils/bancopostaExcelParser";
import { parseAmexCsv } from "../utils/amexCsvParser";
import { autoCategorize } from "../utils/autoCategorize";
import { useFinancial } from "../contexts/FinancialContext";

export default function Importa() {
  const { accounts = [], createTransaction } = useFinancial();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [meta, setMeta] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  const [selectedAccountId, setSelectedAccountId] = useState("");

  // auto-seleziona "American Express" se esiste
  useMemo(() => {
    if (selectedAccountId) return;
    const amex = accounts.find((a) => (a.name || "").toLowerCase().includes("american express") || (a.name || "").toLowerCase().includes("amex"));
    if (amex?.id) setSelectedAccountId(amex.id);
    else if (accounts[0]?.id) setSelectedAccountId(accounts[0].id);
  }, [accounts, selectedAccountId]);

  const detectFileType = (file) => {
    const name = (file?.name || "").toLowerCase();
    if (name.endsWith(".csv")) return "csv";
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "excel";
    // fallback per mime
    if ((file?.type || "").includes("csv")) return "csv";
    return "excel";
  };

  const enrich = (transactions) => {
    return transactions.map((t) => {
      const categoryGuess = autoCategorize(t);
      const d = t.date instanceof Date ? t.date : new Date(t.date);
      const dateISO = Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
      return {
        ...t,
        category: categoryGuess,
        dateISO
      };
    });
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setMeta(null);
    setRows([]);

    try {
      const kind = detectFileType(file);

      let res;
      if (kind === "csv") {
        res = await parseAmexCsv(file);
      } else {
        res = await parseBancoPostaExcel(file);
      }

      const enriched = enrich(res.transactions);

      setMeta({
        ...res.meta,
        source: kind === "csv" ? "AMEX CSV" : "BancoPosta Excel"
      });
      setRows(enriched);
    } catch (err) {
      setError(err?.message || "Errore import");
    } finally {
      setLoading(false);
    }
  };

  // Salvataggio: crea transazioni in serie (più stabile) con progress
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const onConfirmImport = async () => {
    if (!rows.length) return;

    if (!selectedAccountId) {
      setError("Seleziona un conto su cui importare le transazioni (es. American Express).");
      return;
    }

    setSaving(true);
    setError("");
    setProgress({ done: 0, total: rows.length });

    try {
      // Nota: createTransaction si occupa di userId / saldi / normalizzazione
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];

        // Qui creiamo un payload compatibile con FinancialContext.createTransaction
        await createTransaction({
          accountId: selectedAccountId,
          date: r.date,
          description: r.description,
          amount: Math.abs(r.amount), // FinancialContext firma e mette segno in base al type
          type: r.amount >= 0 ? "income" : "expense",
          category: r.category // può essere nome, verrà risolto
        });

        if ((i + 1) % 5 === 0 || i === rows.length - 1) {
          setProgress({ done: i + 1, total: rows.length });
        }
      }

      // reset preview dopo import
      setMeta((m) => (m ? { ...m, imported: rows.length } : null));
      setRows([]);
    } catch (err) {
      setError(err?.message || "Errore durante il salvataggio delle transazioni");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Importa Estratto Conto</h2>

      <p style={{ opacity: 0.85, marginTop: 6 }}>
        Supporta <b>BancoPosta Excel (.xlsx)</b> e <b>AMEX CSV (.csv)</b>.
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 14, flexWrap: "wrap" }}>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} />

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ opacity: 0.85 }}>Importa su conto:</span>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 8 }}
          >
            <option value="">— Seleziona conto —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p style={{ marginTop: 12 }}>Import in corso…</p>}
      {error && <p style={{ color: "tomato", marginTop: 12 }}>{error}</p>}

      {meta && (
        <div style={{ marginTop: 12, opacity: 0.9 }}>
          <div><b>Sorgente:</b> {meta.source}</div>
          {meta.sheetName ? <div><b>Foglio:</b> {meta.sheetName}</div> : null}
          {typeof meta.headerRowIndex === "number" ? (
            <div><b>Header trovato alla riga:</b> {meta.headerRowIndex + 1}</div>
          ) : null}
          <div><b>Righe lette:</b> {meta.parsed} — <b>Dedup:</b> {meta.deduped}</div>
          {meta.imported ? <div style={{ color: "lightgreen" }}>✅ Importate: {meta.imported}</div> : null}
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>Anteprima</h3>

            <button
              onClick={onConfirmImport}
              disabled={saving}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #333",
                cursor: saving ? "not-allowed" : "pointer"
              }}
              type="button"
            >
              {saving ? `Salvataggio... (${progress.done}/${progress.total})` : "Conferma Import (salva su Transazioni)"}
            </button>
          </div>

          <div style={{ overflowX: "auto", marginTop: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #333" }}>Data</th>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #333" }}>Descrizione</th>
                  <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #333" }}>Importo</th>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #333" }}>Categoria</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: 8, borderBottom: "1px solid #222" }}>{r.dateISO}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #222" }}>{r.description}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #222", textAlign: "right" }}>
                      {r.amount >= 0 ? "+" : "-"}{Math.abs(r.amount).toFixed(2)}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #222" }}>{r.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ marginTop: 12, opacity: 0.8 }}>
            Mostro solo le prime 50 righe in anteprima.
          </p>
        </>
      )}
    </div>
  );
}
