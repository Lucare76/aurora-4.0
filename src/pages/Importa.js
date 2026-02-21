// src/pages/Importa.js
import React, { useMemo, useState } from "react";
import { parseBancoPostaExcel } from "../utils/bancopostaExcelParser";
import { parseAmexCsv } from "../utils/amexCsvParser";
<<<<<<< HEAD
import { parseNotafacileFile, autoMapNotafacileTransactions } from "../services/notafacileImportService";
import { autoCategorize } from "../utils/autoCategorize";
import { useFinancial } from "../contexts/FinancialContext";
import NotafacileCategoryMapper from "../components/import/NotafacileCategoryMapper";
import "./Importa.css";

const NF_CATEGORY_MAP_KEY = "aurora_notafacile_category_map_v1";
const NF_ACCOUNT_MAP_KEY = "aurora_notafacile_account_map_v1";

export default function Importa() {
  const { accounts = [], categories = [], createTransaction } = useFinancial();
=======
import { autoCategorize } from "../utils/autoCategorize";
import { useFinancial } from "../contexts/FinancialContext";

export default function Importa() {
  const { accounts = [], createTransaction } = useFinancial();
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [meta, setMeta] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  const [selectedAccountId, setSelectedAccountId] = useState("");
<<<<<<< HEAD
  const [showMapper, setShowMapper] = useState(false);
  const [mapperMode, setMapperMode] = useState("all"); // all | review
  const [previewFilter, setPreviewFilter] = useState("all"); // all | auto | review
  const isNotafacile = meta?.source === "NotaFacile";
  const [savedNfCategoryMap, setSavedNfCategoryMap] = useState(() => {
    try {
      const raw = localStorage.getItem(NF_CATEGORY_MAP_KEY);
      const parsed = JSON.parse(raw || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });
  const [savedNfAccountMap, setSavedNfAccountMap] = useState(() => {
    try {
      const raw = localStorage.getItem(NF_ACCOUNT_MAP_KEY);
      const parsed = JSON.parse(raw || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });
  const savedNfCategoryCount = Object.keys(savedNfCategoryMap || {}).filter((k) => savedNfCategoryMap[k]).length;
  const savedNfAccountCount = Object.keys(savedNfAccountMap || {}).filter((k) => savedNfAccountMap[k]).length;
  const hasSavedNotafacileMemory = savedNfCategoryCount > 0 || savedNfAccountCount > 0;

  const notafacileReviewStats = useMemo(() => {
    if (meta?.source !== "NotaFacile") return null;
    const total = rows.length;
    const auto = rows.filter((r) => r.autoMappedCategory).length;
    const review = total - auto;
    return { total, auto, review };
  }, [meta?.source, rows]);

  const previewRows = useMemo(() => {
    if (!isNotafacile) return rows;
    if (previewFilter === "auto") return rows.filter((r) => r.autoMappedCategory);
    if (previewFilter === "review") return rows.filter((r) => !r.autoMappedCategory);
    return rows;
  }, [isNotafacile, previewFilter, rows]);

  const applySavedNotafacileMappings = (transactions) => {
    let appliedCategories = 0;
    let appliedAccounts = 0;

    const mapped = transactions.map((t) => {
      const catKey = `${t.originalCategory || t.categoryName || ""}|${t.originalSubcategory || t.subcategoryName || t.subCategoryName || ""}`;
      const accKey = t.originalAccountName || t.accountName || "Sconosciuto";

      const categoryId = savedNfCategoryMap[catKey];
      const accountId = savedNfAccountMap[accKey];

      const categoryObj = categoryId ? categories.find((c) => c.id === categoryId) : null;
      const accountObj = accountId ? accounts.find((a) => a.id === accountId) : null;

      const next = { ...t };
      if (categoryObj) {
        next.categoryId = categoryObj.id;
        next.categoryName = categoryObj.name;
        next.category = categoryObj.name;
        next.autoMappedCategory = true;
        appliedCategories++;
      }
      if (accountObj) {
        next.accountId = accountObj.id;
        next.accountName = accountObj.name;
        next.autoMappedAccount = true;
        appliedAccounts++;
      }
      return next;
    });

    return { transactions: mapped, appliedCategories, appliedAccounts };
  };

  useMemo(() => {
    if (selectedAccountId) return;
    const amex = accounts.find(
      (a) =>
        (a.name || "").toLowerCase().includes("american express") ||
        (a.name || "").toLowerCase().includes("amex")
    );
=======

  // auto-seleziona "American Express" se esiste
  useMemo(() => {
    if (selectedAccountId) return;
    const amex = accounts.find((a) => (a.name || "").toLowerCase().includes("american express") || (a.name || "").toLowerCase().includes("amex"));
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
    if (amex?.id) setSelectedAccountId(amex.id);
    else if (accounts[0]?.id) setSelectedAccountId(accounts[0].id);
  }, [accounts, selectedAccountId]);

  const detectFileType = (file) => {
    const name = (file?.name || "").toLowerCase();
    if (name.endsWith(".csv")) return "csv";
<<<<<<< HEAD
    if (name.includes("notafacile") && (name.endsWith(".xls") || name.endsWith(".xlsx"))) return "notafacile";
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "excel";
=======
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "excel";
    // fallback per mime
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
    if ((file?.type || "").includes("csv")) return "csv";
    return "excel";
  };

  const enrich = (transactions) => {
<<<<<<< HEAD
    return transactions.map((t, idx) => {
      const categoryGuess = t.categoryName || autoCategorize(t);
=======
    return transactions.map((t) => {
      const categoryGuess = autoCategorize(t);
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
      const d = t.date instanceof Date ? t.date : new Date(t.date);
      const dateISO = Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
      return {
        ...t,
<<<<<<< HEAD
        __importKey: t.__importKey ?? `${idx}`,
=======
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
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
<<<<<<< HEAD
      let res;

      if (kind === "csv") {
        res = await parseAmexCsv(file);
        const enriched = enrich(res.transactions);
        setMeta({ ...res.meta, source: "AMEX CSV" });
        setRows(enriched);
      } else if (kind === "notafacile") {
        const result = await parseNotafacileFile(file);
        const autoMapped = autoMapNotafacileTransactions(result.transactions, categories, accounts);
        const withSaved = applySavedNotafacileMappings(autoMapped.transactions);
        setMeta({
          source: "NotaFacile",
          parsed: result.stats.total,
          deduped: 0,
          skipped: result.stats.skipped,
          errors: result.stats.errors,
          income: result.stats.income,
          expense: result.stats.expense,
          transfer: result.stats.transfer,
          totalIncome: result.stats.totalIncome,
          totalExpense: result.stats.totalExpense,
          mappedCategories: autoMapped.stats.mappedCategories,
          unmappedCategories: autoMapped.stats.unmappedCategories,
          mappedAccounts: autoMapped.stats.mappedAccounts,
          unmappedAccounts: autoMapped.stats.unmappedAccounts,
          savedMappedCategories: withSaved.appliedCategories,
          savedMappedAccounts: withSaved.appliedAccounts
        });
        setRows(withSaved.transactions);
        setShowMapper(false);
      } else {
        res = await parseBancoPostaExcel(file);
        const enriched = enrich(res.transactions);
        setMeta({ ...res.meta, source: "BancoPosta Excel" });
        setRows(enriched);
      }
=======

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
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
    } catch (err) {
      setError(err?.message || "Errore import");
    } finally {
      setLoading(false);
    }
  };

<<<<<<< HEAD
=======
  // Salvataggio: crea transazioni in serie (più stabile) con progress
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const onConfirmImport = async () => {
    if (!rows.length) return;

<<<<<<< HEAD
    const isNotafacile = meta?.source === "NotaFacile";

    if (!isNotafacile && !selectedAccountId) {
      setError("Seleziona un conto su cui importare le transazioni.");
      return;
    }

    const totalIncome = rows
      .filter((r) => (r.type ? r.type === "income" : r.amount >= 0))
      .reduce((sum, r) => sum + Math.abs(Number(r.amount) || 0), 0);
    const totalExpense = rows
      .filter((r) => (r.type ? r.type === "expense" : r.amount < 0))
      .reduce((sum, r) => sum + Math.abs(Number(r.amount) || 0), 0);

    const ok = window.confirm(
      `Confermi importazione di ${rows.length} transazioni?\n\nEntrate: EUR ${totalIncome.toFixed(2)}\nUscite: EUR ${totalExpense.toFixed(2)}`
    );
    if (!ok) return;

=======
    if (!selectedAccountId) {
      setError("Seleziona un conto su cui importare le transazioni (es. American Express).");
      return;
    }

>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
    setSaving(true);
    setError("");
    setProgress({ done: 0, total: rows.length });

    try {
<<<<<<< HEAD
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];

        if (isNotafacile) {
          await createTransaction({
            // NotaFacile: niente fallback al conto globale selezionato
            accountId: r.accountId || null,
            date: r.date,
            description: r.description,
            amount: Math.abs(r.amount),
            type: r.type || (r.amount >= 0 ? "income" : "expense"),
            category: r.categoryId || r.category || r.categoryName || null,
            subCategory: r.subCategoryId || r.subCategory || null,
            source: "notafacile_import"
          });
        } else {
          await createTransaction({
            accountId: selectedAccountId,
            date: r.date,
            description: r.description,
            amount: Math.abs(r.amount),
            type: r.amount >= 0 ? "income" : "expense",
            category: r.category
          });
        }
=======
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
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1

        if ((i + 1) % 5 === 0 || i === rows.length - 1) {
          setProgress({ done: i + 1, total: rows.length });
        }
      }

<<<<<<< HEAD
=======
      // reset preview dopo import
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
      setMeta((m) => (m ? { ...m, imported: rows.length } : null));
      setRows([]);
    } catch (err) {
      setError(err?.message || "Errore durante il salvataggio delle transazioni");
    } finally {
      setSaving(false);
    }
  };

<<<<<<< HEAD
  const resetNotafacileMemory = () => {
    const ok = window.confirm("Vuoi davvero azzerare la memoria mappature NotaFacile?");
    if (!ok) return;
    setSavedNfCategoryMap({});
    setSavedNfAccountMap({});
    try {
      localStorage.removeItem(NF_CATEGORY_MAP_KEY);
      localStorage.removeItem(NF_ACCOUNT_MAP_KEY);
    } catch {
      // ignore localStorage errors
    }
  };

  const handleMapperConfirm = (mappedTransactions, categoryMapFromMapper = {}, accountMapFromMapper = {}) => {
    const enrichedMapped = enrich(mappedTransactions);

    const nextCatMap = { ...savedNfCategoryMap, ...categoryMapFromMapper };
    const nextAccMap = { ...savedNfAccountMap, ...accountMapFromMapper };
    setSavedNfCategoryMap(nextCatMap);
    setSavedNfAccountMap(nextAccMap);
    try {
      localStorage.setItem(NF_CATEGORY_MAP_KEY, JSON.stringify(nextCatMap));
      localStorage.setItem(NF_ACCOUNT_MAP_KEY, JSON.stringify(nextAccMap));
    } catch {
      // ignore localStorage errors
    }

    if (mapperMode === "review") {
      const byKey = new Map(enrichedMapped.map((r) => [r.__importKey, r]));
      const merged = rows.map((r) => byKey.get(r.__importKey) || r);
      setRows(merged);
    } else {
      setRows(enrichedMapped);
    }

    setShowMapper(false);
    setMapperMode("all");
  };

  const handleMapperCancel = () => {
    if (mapperMode === "review") {
      setShowMapper(false);
      setMapperMode("all");
      return;
    }
    setMeta(null);
    setRows([]);
    setShowMapper(false);
    setMapperMode("all");
  };

  if (showMapper && isNotafacile) {
    const mapperTransactions =
      mapperMode === "review" ? rows.filter((r) => !r.autoMappedCategory) : rows;

    return (
      <div className="importa-page">
        <NotafacileCategoryMapper
          transactions={mapperTransactions}
          auroraCategories={categories}
          auroraAccounts={accounts}
          initialCategoryMap={savedNfCategoryMap}
          initialAccountMap={savedNfAccountMap}
          onConfirm={handleMapperConfirm}
          onCancel={handleMapperCancel}
        />
      </div>
    );
  }

  return (
    <div className="importa-page">
      <div className="importa-card">
        <h2 className="importa-title">Importa Estratto Conto</h2>

        <p className="importa-subtitle">
          Supporta <b>BancoPosta Excel (.xlsx)</b>, <b>AMEX CSV (.csv)</b> e <b>NotaFacile (.xls/.xlsx)</b>.
        </p>

        <div className="importa-badges">
          {[
            { label: "BancoPosta", ext: ".xlsx", color: "#6366f1" },
            { label: "AMEX", ext: ".csv", color: "#f59e0b" },
            { label: "NotaFacile", ext: ".xls/.xlsx", color: "#22c55e" }
          ].map((b) => (
            <span key={b.label} className="importa-badge" style={{ "--badge-color": b.color }}>
              {b.label} {b.ext}
            </span>
          ))}
        </div>

        <div className="importa-controls">
          <input className="importa-file-input" type="file" accept=".xlsx,.xls,.csv" onChange={onFile} />

          {!isNotafacile && (
            <div className="importa-account-group">
              <span className="importa-account-label">Importa su conto:</span>
              <select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} className="importa-select">
                <option value="">- Seleziona conto -</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {loading && <p className="importa-status">Import in corso...</p>}
        {error && <p className="importa-error">{error}</p>}

        {meta && (
          <div className="importa-meta">
            <div>
              <b>Sorgente:</b> {meta.source}
            </div>
            {meta.sheetName && (
              <div>
                <b>Foglio:</b> {meta.sheetName}
              </div>
            )}
            {typeof meta.headerRowIndex === "number" && (
              <div>
                <b>Header trovato alla riga:</b> {meta.headerRowIndex + 1}
              </div>
            )}
            {typeof meta.parsed === "number" && (
              <div>
                <b>Righe lette:</b> {meta.parsed} - <b>Dedup:</b> {meta.deduped ?? 0}
              </div>
            )}

            {isNotafacile && (
              <div className="importa-meta-stats">
                <span className="meta-income">Entrate: {meta.income} (+EUR {(meta.totalIncome || 0).toFixed(2)})</span>
                <span className="meta-expense">Uscite: {meta.expense} (-EUR {(meta.totalExpense || 0).toFixed(2)})</span>
                {meta.transfer > 0 && <span className="meta-transfer">Giroconti: {meta.transfer}</span>}
                {meta.skipped > 0 && <span className="meta-skipped">Saltate: {meta.skipped}</span>}
                <span className="meta-transfer">Cat auto: {meta.mappedCategories}/{meta.parsed}</span>
                <span className="meta-transfer">Conti auto: {meta.mappedAccounts}/{meta.parsed}</span>
                {(meta.savedMappedCategories || meta.savedMappedAccounts) ? (
                  <span className="meta-transfer">
                    Memoria: cat {meta.savedMappedCategories || 0}, conti {meta.savedMappedAccounts || 0}
                  </span>
                ) : null}
                <span className="meta-transfer">
                  Regole salvate: cat {savedNfCategoryCount}, conti {savedNfAccountCount}
                </span>
                <button
                  type="button"
                  className="meta-transfer"
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(148,163,184,0.45)",
                    borderRadius: 999,
                    padding: "2px 10px",
                    cursor: hasSavedNotafacileMemory ? "pointer" : "default",
                    opacity: hasSavedNotafacileMemory ? 1 : 0.6
                  }}
                  onClick={resetNotafacileMemory}
                  disabled={!hasSavedNotafacileMemory}
                  title="Azzera memoria mappature NotaFacile"
                >
                  Reset memoria
                </button>
              </div>
            )}

            {isNotafacile && notafacileReviewStats && (
              <div className="importa-meta-stats">
                <span className="meta-income">AUTO: {notafacileReviewStats.auto}</span>
                <button
                  type="button"
                  className="meta-expense"
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(239,68,68,0.45)",
                    borderRadius: 999,
                    padding: "2px 10px",
                    cursor: notafacileReviewStats.review > 0 ? "pointer" : "default",
                    opacity: notafacileReviewStats.review > 0 ? 1 : 0.7
                  }}
                  disabled={notafacileReviewStats.review === 0}
                  onClick={() => {
                    setMapperMode("review");
                    setShowMapper(true);
                  }}
                  title="Apri mapper solo per righe da rivedere"
                >
                  DA RIVEDERE: {notafacileReviewStats.review}
                </button>
              </div>
            )}

            {meta.imported && <div className="importa-imported">Importate: {meta.imported}</div>}
          </div>
        )}

        {rows.length > 0 && (
          <>
            <div className="importa-preview-head">
              <h3>Anteprima</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {isNotafacile && (
                  <div style={{ display: "inline-flex", border: "1px solid rgba(148,163,184,0.35)", borderRadius: 10, overflow: "hidden" }}>
                    <button
                      type="button"
                      className="importa-confirm-btn"
                      onClick={() => setPreviewFilter("all")}
                      style={{ background: previewFilter === "all" ? "#2563eb" : "#334155", padding: "8px 12px" }}
                    >
                      Tutte ({rows.length})
                    </button>
                    <button
                      type="button"
                      className="importa-confirm-btn"
                      onClick={() => setPreviewFilter("auto")}
                      style={{ background: previewFilter === "auto" ? "#16a34a" : "#334155", padding: "8px 12px" }}
                    >
                      AUTO ({rows.filter((r) => r.autoMappedCategory).length})
                    </button>
                    <button
                      type="button"
                      className="importa-confirm-btn"
                      onClick={() => setPreviewFilter("review")}
                      style={{ background: previewFilter === "review" ? "#dc2626" : "#334155", padding: "8px 12px" }}
                    >
                      DA RIVEDERE ({rows.filter((r) => !r.autoMappedCategory).length})
                    </button>
                  </div>
                )}
                {isNotafacile && (
                  <button
                    onClick={() => {
                      setMapperMode("all");
                      setShowMapper(true);
                    }}
                    className="importa-confirm-btn"
                    type="button"
                    style={{ background: "#475569" }}
                  >
                    Rivedi mappatura
                  </button>
                )}
                <button
                  onClick={onConfirmImport}
                  disabled={saving || (isNotafacile && (notafacileReviewStats?.review || 0) > 0)}
                  className="importa-confirm-btn"
                  type="button"
                  title={
                    isNotafacile && (notafacileReviewStats?.review || 0) > 0
                      ? "Rivedi prima tutte le righe non mappate"
                      : "Conferma importazione"
                  }
                >
                  {saving ? `Salvataggio... (${progress.done}/${progress.total})` : `Conferma Import - ${rows.length} transazioni`}
                </button>
              </div>
            </div>

            {isNotafacile && (notafacileReviewStats?.review || 0) > 0 && (
              <p className="importa-error" style={{ marginTop: 8 }}>
                Prima di importare, rivedi le righe non mappate: {notafacileReviewStats.review}.
              </p>
            )}

            <div className="importa-table-wrap">
              <table className="importa-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrizione</th>
                    <th className="right">Importo</th>
                    <th>Categoria</th>
                    {isNotafacile && <th>Tipo</th>}
                    {isNotafacile && <th>Stato</th>}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(0, 50).map((r, i) => (
                    <tr key={i}>
                      <td>{r.dateISO}</td>
                      <td className="ellipsis">{r.description}</td>
                      <td className={`right amount ${r.amount >= 0 ? "income" : "expense"}`}>
                        {r.amount >= 0 ? "+" : "-"}EUR {Math.abs(r.amount).toFixed(2)}
                      </td>
                      <td>{(r.categoryName || r.category || "Senza categoria")}</td>
                      {isNotafacile && <td className="type-cell">{r.type}</td>}
                      {isNotafacile && (
                        <td>
                          <span
                            className={`type-cell`}
                            style={{
                              display: "inline-flex",
                              padding: "4px 10px",
                              borderRadius: 999,
                              fontWeight: 700,
                              fontSize: 12,
                              letterSpacing: 0.3,
                              color: r.autoMappedCategory ? "#86efac" : "#fca5a5",
                              border: r.autoMappedCategory ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(239,68,68,0.45)",
                              background: r.autoMappedCategory ? "rgba(34,197,94,0.14)" : "rgba(239,68,68,0.14)"
                            }}
                          >
                            {r.autoMappedCategory ? "AUTO" : "DA RIVEDERE"}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="importa-preview-note">
              Mostro solo le prime 50 righe in anteprima. {previewRows.length > 50 && `Nel filtro attuale ci sono ${previewRows.length} righe.`}
              {rows.length > 50 && ` Verranno importate tutte le ${rows.length} transazioni.`}
            </p>
          </>
        )}
      </div>
=======
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
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
    </div>
  );
}
