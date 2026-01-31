// src/pages/Importa.js
import React, { useMemo, useState } from "react";

import parseBancoPostaExcel from "../utils/bancopostaExcelParser";
import autoCategorize from "../utils/autoCategorize";

import { useAuth } from "../contexts/AuthContext";
import { useFinancial } from "../contexts/FinancialContext";

export default function Importa() {
  const { user } = useAuth();
  const { accounts = [], createTransaction } = useFinancial();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [meta, setMeta] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  const [accountId, setAccountId] = useState("");

  const canSave = useMemo(() => {
    return !!user?.uid && !!accountId && rows.length > 0 && !loading && !saving;
  }, [user?.uid, accountId, rows.length, loading, saving]);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setMeta(null);
    setRows([]);

    try {
      const res = await parseBancoPostaExcel(file);

      const enriched = (res.transactions || [])
        .map((t) => {
          const dateObj = t.date instanceof Date ? t.date : t.date?.toDate?.() || null;
          const dateISO = dateObj ? dateObj.toISOString().slice(0, 10) : "";

          const amountNum = Number(t.amount);
          const amount = Number.isFinite(amountNum) ? amountNum : 0;

          const description = String(t.description || "").trim();
          if (!description) return null;

          // Per import: teniamo amount SIGNATO così com'è (positivo/negativo)
          // Il FinancialContext poi lo normalizza in base al "type".
          const type = amount >= 0 ? "income" : "expense";

          const categoryGuess = autoCategorize({
            description,
            amount,
            date: dateObj,
            type,
          });

          return {
            date: dateObj || new Date(),
            dateISO,
            description,
            amount,     // signed
            type,       // income/expense
            category: categoryGuess || "",

            _dedupKey: `${dateISO}|${description}|${amount.toFixed(2)}`,
          };
        })
        .filter(Boolean);

      // dedup client-side
      const seen = new Set();
      const deduped = enriched.filter((r) => {
        if (seen.has(r._dedupKey)) return false;
        seen.add(r._dedupKey);
        return true;
      });

      setMeta({
        ...(res.meta || {}),
        parsed: enriched.length,
        deduped: deduped.length,
      });

      setRows(deduped);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Errore import");
    } finally {
      setLoading(false);
    }
  };

  const onConfirmImport = async () => {
    if (!canSave) return;

    setSaving(true);
    setError("");

    try {
      // Salvataggio “sicuro” usando FinancialContext.createTransaction
      // (quello salva in collection(db,'transactions') e setta userId correttamente)
      let inserted = 0;

      for (const r of rows) {
        await createTransaction({
          accountId,
          date: r.date,

          description: r.description,

          // IMPORTANTISSIMO:
          // createTransaction nel context fa getSignedAmount(type, amount)
          // quindi qui passiamo l'IMPORTO ASSOLUTO e lasciamo che il type lo segni.
          amount: Math.abs(Number(r.amount) || 0),
          type: r.type, // income/expense

          // Qui passiamo la categoria come "nome" (il context la risolve in categoryId/categoryName)
          category: r.category || "Senza categoria",

          source: "import-excel",
        });

        inserted += 1;
      }

      alert(`✅ Import completato: ${inserted} transazioni salvate!`);

      // reset UI
      setRows([]);
      setMeta(null);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Importa Estratto Conto (Excel)</h2>

      {!user?.uid && (
        <p style={{ color: "tomato" }}>Devi essere loggato per importare.</p>
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
        <input type="file" accept=".xlsx,.xls" onChange={onFile} />

        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          style={{ padding: 8, minWidth: 260 }}
          disabled={accounts.length === 0}
        >
          <option value="">Seleziona conto…</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name || "Conto"} — € {(Number(a.balance) || 0).toFixed(2)}
            </option>
          ))}
        </select>

        <button
          onClick={onConfirmImport}
          disabled={!canSave}
          style={{
            padding: "10px 14px",
            cursor: canSave ? "pointer" : "not-allowed",
            opacity: canSave ? 1 : 0.5,
          }}
          type="button"
        >
          {saving ? "Salvataggio in corso…" : "Conferma Import"}
        </button>
      </div>

      {loading && <p style={{ marginTop: 10 }}>Import in corso…</p>}
      {error && <p style={{ marginTop: 10, color: "tomato" }}>{error}</p>}

      {meta && (
        <div style={{ marginTop: 12, opacity: 0.9 }}>
          <div>Foglio: {meta.sheetName}</div>
          <div>Header trovato alla riga: {Number(meta.headerRowIndex) + 1}</div>
          <div>Righe lette: {meta.parsed} — Dedup: {meta.deduped}</div>
        </div>
      )}

      {rows.length > 0 && (
        <>
          <h3 style={{ marginTop: 18 }}>Anteprima</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #333" }}>Data</th>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #333" }}>Descrizione</th>
                  <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #333" }}>Importo</th>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #333" }}>Categoria</th>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #333" }}>Tipo</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: 8, borderBottom: "1px solid #222" }}>{r.dateISO}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #222" }}>{r.description}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #222", textAlign: "right" }}>
                      {Number(r.amount || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #222" }}>
                      {r.category || "Senza categoria"}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #222" }}>{r.type}</td>
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
