// src/pages/Importa.js
import React, { useEffect, useMemo, useState } from "react";
import { parseBancoPostaExcel } from "../utils/bancopostaExcelParser";
import { parseAmexCsv } from "../utils/amexCsvParser";
import { parseNotafacileFile, autoMapNotafacileTransactions } from "../services/notafacileImportService";
import { autoCategorize } from "../utils/autoCategorize";
import { useFinancial } from "../contexts/FinancialContext";
import NotafacileCategoryMapper from "../components/import/NotafacileCategoryMapper";
import PageHeader from "../components/app/PageHeader";
import "./Importa.css";

const NF_CATEGORY_MAP_KEY = "aurora_notafacile_category_map_v1";
const NF_ACCOUNT_MAP_KEY = "aurora_notafacile_account_map_v1";

export default function Importa() {
  const { accounts = [], categories = [], transactions = [], createTransaction, createTransfer } = useFinancial();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [meta, setMeta] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  const [selectedAccountId, setSelectedAccountId] = useState("");
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
    const transfers = rows.filter((r) => r.type === "transfer");
    const nonTransfers = rows.filter((r) => r.type !== "transfer");
    const auto = nonTransfers.filter((r) => r.autoMappedCategory).length;
    const review = nonTransfers.filter((r) => !r.autoMappedCategory).length;
    const transferNotReady = transfers.filter(
      (r) => !r.fromAccountId || !r.toAccountId || r.fromAccountId === r.toAccountId
    ).length;
    return { total, auto, review, transferNotReady, transferCount: transfers.length };
  }, [meta?.source, rows]);

  const previewRows = useMemo(() => {
    if (!isNotafacile) return rows;
    if (previewFilter === "auto") return rows.filter((r) => r.autoMappedCategory && r.type !== "transfer");
    if (previewFilter === "review") return rows.filter((r) => !r.autoMappedCategory && r.type !== "transfer");
    if (previewFilter === "transfer") return rows.filter((r) => r.type === "transfer");
    return rows;
  }, [isNotafacile, previewFilter, rows]);

  const applySavedNotafacileMappings = (transactions) => {
    let appliedCategories = 0;
    let appliedAccounts = 0;

    const mapped = transactions.map((t) => {
      const catKey = t.originalCategory || t.categoryName || "";
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

  useEffect(() => {
    if (selectedAccountId) return;
    const amex = accounts.find(
      (a) =>
        (a.name || "").toLowerCase().includes("american express") ||
        (a.name || "").toLowerCase().includes("amex")
    );
    if (amex?.id) setSelectedAccountId(amex.id);
    else if (accounts[0]?.id) setSelectedAccountId(accounts[0].id);
  }, [accounts, selectedAccountId]);

  const detectFileType = (file) => {
    const name = (file?.name || "").toLowerCase();
    if (name.endsWith(".csv")) return "csv";
    if (name.includes("notafacile") && (name.endsWith(".xls") || name.endsWith(".xlsx"))) return "notafacile";
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "excel";
    if ((file?.type || "").includes("csv")) return "csv";
    return "excel";
  };

  const enrich = (transactions) => {
    return transactions.map((t, idx) => {
      const categoryGuess = t.categoryName || autoCategorize(t);
      const d = t.date instanceof Date ? t.date : new Date(t.date);
      const dateISO = Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
      return {
        ...t,
        __importKey: t.__importKey ?? `${idx}`,
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
        const enriched = enrich(res.transactions);
        setMeta({ ...res.meta, source: "AMEX CSV" });
        setRows(enriched);
      } else if (kind === "notafacile") {
        const result = await parseNotafacileFile(file);
        const autoMapped = autoMapNotafacileTransactions(result.transactions, categories, accounts);
        const withSaved = applySavedNotafacileMappings(autoMapped.transactions);
        // I giroconti sono trasferimenti interni: non hanno bisogno di categoria
        // Pre-popola fromAccountId dall'accountId già mappato (toAccountId va scelto dall'utente)
        const finalTransactions = withSaved.transactions.map(t =>
          t.type === 'transfer'
            ? { ...t, autoMappedCategory: true, fromAccountId: t.fromAccountId || t.accountId || '', toAccountId: t.toAccountId || '' }
            : t
        );
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
        setRows(enrich(finalTransactions));
        setShowMapper(false);
      } else {
        res = await parseBancoPostaExcel(file);
        const enriched = enrich(res.transactions);
        setMeta({ ...res.meta, source: "BancoPosta Excel" });
        setRows(enriched);
      }
    } catch (err) {
      setError(err?.message || "Errore import");
    } finally {
      setLoading(false);
    }
  };

  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const normalizeDateKey = (value) => {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const makeTxKey = (date, type, amount) => {
    const dateKey = normalizeDateKey(date);
    const amt = Math.abs(Number(amount) || 0).toFixed(2);
    return `${dateKey}|${type || 'unknown'}|${amt}`;
  };

  const normalizeDescKey = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const makeTxKeyWithDesc = (date, type, amount, description, accountId) => {
    const base = makeTxKey(date, type, amount);
    const descKey = normalizeDescKey(description);
    const accKey = String(accountId || '').trim().toLowerCase();
    return `${base}|${descKey}|${accKey}`;
  };

  const onConfirmImport = async () => {
    if (!rows.length) return;

    const isNotafacile = meta?.source === "NotaFacile";

    if (!isNotafacile && !selectedAccountId) {
      setError("Seleziona un conto su cui importare le transazioni.");
      return;
    }

    const importableRows = rows;

    const totalIncome = importableRows
      .filter((r) => (r.type ? r.type === "income" : r.amount >= 0))
      .reduce((sum, r) => sum + Math.abs(Number(r.amount) || 0), 0);
    const totalExpense = importableRows
      .filter((r) => (r.type ? r.type === "expense" : r.amount < 0))
      .reduce((sum, r) => sum + Math.abs(Number(r.amount) || 0), 0);
    const transferCount = importableRows.filter((r) => r.type === "transfer").length;

    const ok = window.confirm(
      `Confermi importazione di ${importableRows.length} transazioni?` +
      (transferCount > 0 ? `\n(di cui ${transferCount} giroconti)` : "") +
      `\n\nEntrate: EUR ${totalIncome.toFixed(2)}\nUscite: EUR ${totalExpense.toFixed(2)}`
    );
    if (!ok) return;

    setSaving(true);
    setError("");
    setProgress({ done: 0, total: importableRows.length });

    try {
      const existingKeys = new Set(
        (transactions || []).map((t) => {
          const tType = t?.type || (Number(t?.amount) >= 0 ? 'income' : 'expense');
          return makeTxKeyWithDesc(t?.date, tType, t?.amount, t?.description, t?.accountId || t?.accountName);
        })
      );

      const importedKeys = new Set();

      for (let i = 0; i < importableRows.length; i++) {
        const r = importableRows[i];

        if (isNotafacile && r.type === "transfer") {
          // Giroconto: crea 2 gambe reali tramite createTransfer
          await createTransfer({
            amount: Math.abs(r.amount),
            fromAccountId: r.fromAccountId,
            toAccountId: r.toAccountId,
            description: String(r.description || '').toLocaleUpperCase('it-IT'),
            date: r.date
          });
        } else if (isNotafacile) {
          const rowType = r.type || (r.amount >= 0 ? "income" : "expense");
          const duplicateKey = makeTxKeyWithDesc(r.date, rowType, r.amount, r.description, r.accountId || r.accountName);
          if (duplicateKey && (existingKeys.has(duplicateKey) || importedKeys.has(duplicateKey))) {
            const proceed = window.confirm(
              `Attenzione: esiste già una transazione simile (stessa data e importo).\n` +
              `Vuoi importarla comunque?\n\n` +
              `Data: ${normalizeDateKey(r.date)}\n` +
              `Importo: EUR ${Math.abs(Number(r.amount) || 0).toFixed(2)}\n` +
              `Descrizione: ${r.description || ''}`
            );
            if (!proceed) {
              setProgress({ done: i + 1, total: importableRows.length });
              continue;
            }
          }

          await createTransaction({
            accountId: r.accountId || null,
            date: r.date,
            description: String(r.description || '').toLocaleUpperCase('it-IT'),
            amount: Math.abs(r.amount),
            type: rowType,
            category: r.categoryId || r.category || r.categoryName || null,
            subCategory: r.subCategoryId || r.subCategory || null,
            source: "notafacile_import"
          });
          if (duplicateKey) importedKeys.add(duplicateKey);
        } else {
          const rowType = r.amount >= 0 ? "income" : "expense";
          const duplicateKey = makeTxKeyWithDesc(r.date, rowType, r.amount, r.description, selectedAccountId);
          if (duplicateKey && (existingKeys.has(duplicateKey) || importedKeys.has(duplicateKey))) {
            const proceed = window.confirm(
              `Attenzione: esiste già una transazione simile (stessa data e importo).\n` +
              `Vuoi importarla comunque?\n\n` +
              `Data: ${normalizeDateKey(r.date)}\n` +
              `Importo: EUR ${Math.abs(Number(r.amount) || 0).toFixed(2)}\n` +
              `Descrizione: ${r.description || ''}`
            );
            if (!proceed) {
              setProgress({ done: i + 1, total: importableRows.length });
              continue;
            }
          }

          await createTransaction({
            accountId: selectedAccountId,
            date: r.date,
            description: String(r.description || '').toLocaleUpperCase('it-IT'),
            amount: Math.abs(r.amount),
            type: rowType,
            category: r.category
          });
          if (duplicateKey) importedKeys.add(duplicateKey);
        }

        if ((i + 1) % 5 === 0 || i === importableRows.length - 1) {
          setProgress({ done: i + 1, total: importableRows.length });
        }
      }

      setMeta((m) => (m ? { ...m, imported: importableRows.length } : null));
      setRows([]);
    } catch (err) {
      setError(err?.message || "Errore durante il salvataggio delle transazioni");
    } finally {
      setSaving(false);
    }
  };

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
    // Mark rows that the mapper assigned a category to as auto-mapped
    const withAutoFlag = mappedTransactions.map(t => ({
      ...t,
      autoMappedCategory: t.autoMappedCategory || !!t.categoryId
    }));
    const enrichedMapped = enrich(withAutoFlag);

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
        <PageHeader
          className="importa-header"
          title="Importa Estratto Conto"
          subtitle="Supporta BancoPosta Excel (.xlsx), AMEX CSV (.csv) e NotaFacile (.xls/.xlsx)."
          titleAs="h2"
        />

        <div className="importa-top-layout">
          <div className="importa-upload-panel">
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
          </div>

          <aside className="importa-kpi-panel">
            <div className="importa-kpi-item">
              <span className="importa-kpi-label">Transazioni in coda</span>
              <b className="importa-kpi-value">{rows.length}</b>
            </div>
            <div className="importa-kpi-item">
              <span className="importa-kpi-label">Conti disponibili</span>
              <b className="importa-kpi-value">{accounts.length}</b>
            </div>
            <div className="importa-kpi-item">
              <span className="importa-kpi-label">Categorie attive</span>
              <b className="importa-kpi-value">{categories.length}</b>
            </div>
            <div className="importa-kpi-item">
              <span className="importa-kpi-label">Sorgente rilevata</span>
              <b className="importa-kpi-value">{meta?.source || "-"}</b>
            </div>
          </aside>
        </div>

        {loading && <p className="importa-status">Import in corso...</p>}
        {error && <p className="importa-error">{error}</p>}

        {meta && (
          <div className="importa-meta">
            <h3 className="importa-section-title">Dettagli importazione</h3>
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
                <span className={notafacileReviewStats.review > 0 ? "meta-expense" : "meta-income"}>
                  {notafacileReviewStats.review > 0 ? `Attenzione: non mappate ${notafacileReviewStats.review}` : "Tutte mappate"}
                </span>
              </div>
            )}

            {meta.imported && <div className="importa-imported">Importate: {meta.imported}</div>}
          </div>
        )}

        {rows.length > 0 && (
          <>
            <div className="importa-preview-head">
              <h3>Anteprima</h3>
              <div className="importa-preview-actions">
                {isNotafacile && (
                  <div className="importa-filter-tabs">
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
                      DA RIVEDERE ({notafacileReviewStats?.review ?? 0})
                    </button>
                    <button
                      type="button"
                      className="importa-confirm-btn"
                      onClick={() => setPreviewFilter("transfer")}
                      style={{ background: previewFilter === "transfer" ? "#7c3aed" : "#334155", padding: "8px 12px" }}
                    >
                      GIROCONTI ({notafacileReviewStats?.transferCount ?? 0})
                    </button>
                  </div>
                )}
                <button
                  onClick={onConfirmImport}
                  disabled={saving || (isNotafacile && ((notafacileReviewStats?.review || 0) > 0 || (notafacileReviewStats?.transferNotReady || 0) > 0))}
                  className="importa-confirm-btn"
                  type="button"
                  title={
                    isNotafacile && (notafacileReviewStats?.review || 0) > 0
                      ? "Rivedi prima tutte le righe non mappate"
                      : isNotafacile && (notafacileReviewStats?.transferNotReady || 0) > 0
                      ? "Seleziona Da/A conto per tutti i giroconti"
                      : "Conferma importazione"
                  }
                >
                  {saving
                    ? `Salvataggio... (${progress.done}/${progress.total})`
                    : `Conferma Import - ${rows.length} transazioni`
                  }
                </button>
              </div>
            </div>

            {isNotafacile && (notafacileReviewStats?.review || 0) > 0 && (
              <div style={{
                marginTop: 12,
                padding: "12px 16px",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.4)",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap"
              }}>
                <span style={{ color: "#fca5a5", fontWeight: 600 }}>
                  Attenzione: {notafacileReviewStats.review} transazioni senza categoria. Usa il menu a tendina nella colonna "Categoria" per ciascuna.
                </span>
                <button
                  type="button"
                  className="importa-confirm-btn"
                  onClick={() => setPreviewFilter("review")}
                  style={{ background: "#dc2626", border: "none", fontWeight: 700, color: "#fff", padding: "8px 18px" }}
                >
                  Mostra le {notafacileReviewStats.review} da mappare
                </button>
              </div>
            )}
            {isNotafacile && (notafacileReviewStats?.transferNotReady || 0) > 0 && (
              <div style={{
                marginTop: 8,
                padding: "12px 16px",
                background: "rgba(251,146,60,0.1)",
                border: "1px solid rgba(251,146,60,0.4)",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap"
              }}>
                <span style={{ color: "#fed7aa", fontWeight: 600 }}>
                  Attenzione: {notafacileReviewStats.transferNotReady} giroconti senza conti. Seleziona "Da conto" e "A conto" nella colonna Categoria.
                </span>
                <button
                  type="button"
                  className="importa-confirm-btn"
                  onClick={() => setPreviewFilter("transfer")}
                  style={{ background: "#7c3aed", border: "none", fontWeight: 700, color: "#fff", padding: "8px 18px" }}
                >
                  Vai ai giroconti
                </button>
              </div>
            )}

            {isNotafacile && previewFilter === "review" && (notafacileReviewStats?.review || 0) > 0 && (
              <p style={{ marginTop: 10, marginBottom: 4, color: "#fca5a5", fontSize: 13 }}>
                Scegli una categoria dal menu a tendina per ciascuna transazione. Appena assegnata, sparisce da questa lista.
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
                      <td>
                        {r.type === 'transfer' ? (
                          /* Giroconto: selettori Da/A conto */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 11, color: '#94a3b8', minWidth: 20 }}>Da:</span>
                              <select
                                value={r.fromAccountId || ''}
                                onChange={(e) => {
                                  const fromId = e.target.value;
                                  setRows(prev => prev.map(row =>
                                    row.__importKey === r.__importKey
                                      ? { ...row, fromAccountId: fromId, toAccountId: row.toAccountId === fromId ? '' : row.toAccountId }
                                      : row
                                  ));
                                }}
                                style={{ background: '#0f172a', color: '#e2e8f0', border: r.fromAccountId ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(239,68,68,0.5)', borderRadius: 6, padding: '2px 6px', fontSize: 12, maxWidth: 170 }}
                              >
                                <option value="">- Conto origine -</option>
                                {accounts.map(a => (
                                  <option key={a.id} value={a.id} disabled={a.id === r.toAccountId}>{a.name}</option>
                                ))}
                              </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 11, color: '#94a3b8', minWidth: 20 }}>A:</span>
                              <select
                                value={r.toAccountId || ''}
                                onChange={(e) => {
                                  const toId = e.target.value;
                                  setRows(prev => prev.map(row =>
                                    row.__importKey === r.__importKey
                                      ? { ...row, toAccountId: toId }
                                      : row
                                  ));
                                }}
                                style={{ background: '#0f172a', color: '#e2e8f0', border: r.toAccountId ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(239,68,68,0.5)', borderRadius: 6, padding: '2px 6px', fontSize: 12, maxWidth: 170 }}
                              >
                                <option value="">- Conto destinazione -</option>
                                {accounts.map(a => (
                                  <option key={a.id} value={a.id} disabled={a.id === r.fromAccountId}>{a.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ) : isNotafacile && !r.autoMappedCategory ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {/* Dropdown categoria */}
                            <select
                              value={r.categoryId || ''}
                              onChange={(e) => {
                                const catId = e.target.value;
                                const cat = categories.find(c => c.id === catId);
                                const origCat = r.originalCategory || r.categoryName || '';
                                if (catId && origCat) {
                                  const newCatMap = { ...savedNfCategoryMap, [origCat]: catId };
                                  setSavedNfCategoryMap(newCatMap);
                                  try { localStorage.setItem(NF_CATEGORY_MAP_KEY, JSON.stringify(newCatMap)); } catch {}
                                }
                                setRows(prev => prev.map(row =>
                                  row.__importKey === r.__importKey
                                    ? { ...row, categoryId: catId || null, categoryName: cat?.name || row.categoryName, category: cat?.name || row.category, subCategoryId: null, subCategoryName: '', autoMappedCategory: !!catId }
                                    : row
                                ));
                              }}
                              style={{ background: '#0f172a', color: '#e2e8f0', border: '1px solid rgba(239,68,68,0.5)', borderRadius: 6, padding: '2px 6px', fontSize: 12, maxWidth: 180 }}
                            >
                              <option value="">- Scegli categoria -</option>
                              {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.icon || "*"} {c.name}</option>
                              ))}
                            </select>
                            {/* Dropdown sottocategoria */}
                            {r.categoryId && (() => {
                              const cat = categories.find(c => c.id === r.categoryId);
                              const subs = cat?.subCategories || [];
                              if (!subs.length) return null;
                              return (
                                <select
                                  value={r.subCategoryId || ''}
                                  onChange={(e) => {
                                    const subId = e.target.value;
                                    const sub = subs.find(s => s.id === subId);
                                    setRows(prev => prev.map(row =>
                                      row.__importKey === r.__importKey
                                        ? { ...row, subCategoryId: subId || null, subCategoryName: sub?.name || '' }
                                        : row
                                    ));
                                  }}
                                  style={{ background: '#0f172a', color: '#e2e8f0', border: '1px solid rgba(99,102,241,0.5)', borderRadius: 6, padding: '2px 6px', fontSize: 12, maxWidth: 180 }}
                                >
                                  <option value="">- Sottocategoria (opz.) -</option>
                                  {subs.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                                </select>
                              );
                            })()}
                          </div>
                        ) : (
                          <span>
                            {r.categoryName || r.category || 'Senza categoria'}
                            {r.subCategoryName && <span style={{ opacity: 0.6, fontSize: 11 }}> / {r.subCategoryName}</span>}
                          </span>
                        )}
                      </td>
                      {isNotafacile && <td className="type-cell">{r.type}</td>}
                      {isNotafacile && (
                        <td>
                          <span
                            className={`type-cell`}
                            style={(() => {
                              if (r.type === "transfer") {
                                const ready = r.fromAccountId && r.toAccountId && r.fromAccountId !== r.toAccountId;
                                return {
                                  display: "inline-flex", padding: "4px 10px", borderRadius: 999, fontWeight: 700, fontSize: 12, letterSpacing: 0.3,
                                  color: ready ? "#a78bfa" : "#fb923c",
                                  border: ready ? "1px solid rgba(167,139,250,0.45)" : "1px solid rgba(251,146,60,0.45)",
                                  background: ready ? "rgba(167,139,250,0.14)" : "rgba(251,146,60,0.14)"
                                };
                              }
                              return {
                                display: "inline-flex", padding: "4px 10px", borderRadius: 999, fontWeight: 700, fontSize: 12, letterSpacing: 0.3,
                                color: r.autoMappedCategory ? "#86efac" : "#fca5a5",
                                border: r.autoMappedCategory ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(239,68,68,0.45)",
                                background: r.autoMappedCategory ? "rgba(34,197,94,0.14)" : "rgba(239,68,68,0.14)"
                              };
                            })()}
                          >
                            {r.type === "transfer"
                              ? (r.fromAccountId && r.toAccountId && r.fromAccountId !== r.toAccountId ? "PRONTO" : "CONTI MANCANTI")
                              : (r.autoMappedCategory ? "AUTO" : "DA RIVEDERE")}
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
    </div>
  );
}
