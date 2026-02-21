// src/pages/Budgets.js
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useFinancial } from "../contexts/FinancialContext";
<<<<<<< HEAD
import { getCurrencySymbol, formatCurrency } from "../utils/currency";
import { getBudgetsByMonth, upsertBudget, deleteBudget } from "../services/budgetsService";
import "./Budgets.css";

function ymFromDate(d = new Date()) {
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
=======
import { getBudgetsByMonth, upsertBudget, deleteBudget } from "../services/budgetsService";

function ymFromDate(d = new Date()) {
  return { year: d.getFullYear(), month: d.getMonth() + 1 }; // month 1-12
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
}

function formatYM(month, year) {
  return `${String(month).padStart(2, "0")}/${year}`;
}

<<<<<<< HEAD
function parseDate(date) {
  if (!date) return null;
  if (date && typeof date === "object" && typeof date.toDate === "function") return date.toDate();
=======
// ✅ robust date parser (Firestore Timestamp / Date / string)
function parseDate(date) {
  if (!date) return null;
  if (date && typeof date === "object" && typeof date.toDate === "function") return date.toDate(); // Firestore Timestamp
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
  if (date instanceof Date) return date;
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function Budgets() {
<<<<<<< HEAD
  const { user, userSettings } = useAuth();
  const { transactions = [], categories = [], loading } = useFinancial();
  const cs = getCurrencySymbol(userSettings?.currency);
=======
  const { user } = useAuth();
  const { transactions = [], categories = [], loading } = useFinancial();
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1

  const [{ year, month }, setYM] = useState(ymFromDate());
  const [budgets, setBudgets] = useState([]);
  const [saving, setSaving] = useState(false);

<<<<<<< HEAD
=======
  // carica budgets mese
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
  useEffect(() => {
    if (!user) return;

    (async () => {
      const data = await getBudgetsByMonth(user.uid, year, month);
      setBudgets(Array.isArray(data) ? data : []);
    })();
  }, [user, year, month]);

  const budgetMap = useMemo(() => {
    const m = new Map();
    for (const b of budgets) m.set(b.categoryId, b);
    return m;
  }, [budgets]);

  const spentMap = useMemo(() => {
<<<<<<< HEAD
=======
    // calcola speso per categoria nel mese selezionato (solo expense)
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const m = new Map();
    for (const t of transactions) {
      const amt = Number(t?.amount) || 0;
<<<<<<< HEAD
=======

      // ✅ robust type: se manca, usa segno importo
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
      const type = t?.type || (amt < 0 ? "expense" : "income");
      if (type !== "expense") continue;

      const d = parseDate(t?.date);
      if (!d || d < start || d >= end) continue;

      const cid = t?.categoryId;
<<<<<<< HEAD
      if (!cid) continue;
=======
      if (!cid) continue; // ✅ ignora senza categoria (come comportamento attuale)
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1

      const prev = m.get(cid) || 0;
      m.set(cid, prev + Math.abs(amt));
    }
    return m;
  }, [transactions, year, month]);

  const rows = useMemo(() => {
    return categories
      .filter((c) => c.type === "expense")
      .map((c) => {
        const spent = spentMap.get(c.id) || 0;
        const b = budgetMap.get(c.id);
        const budget = Number(b?.amount) || 0;

        const pct = budget > 0 ? (spent / budget) * 100 : 0;
<<<<<<< HEAD
        const state = budget <= 0 ? "none" : pct >= 100 ? "over" : pct >= 75 ? "warn" : "ok";

        const now = new Date();
        const daysInMonth = new Date(year, month, 0).getDate();
        const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
        const isPastMonth = now.getFullYear() > year || (now.getFullYear() === year && now.getMonth() + 1 > month);
        const elapsedDays = isPastMonth ? daysInMonth : isCurrentMonth ? now.getDate() : 0;
        const projected = elapsedDays > 0 ? (spent / elapsedDays) * daysInMonth : 0;
        const forecastState =
          budget <= 0 || elapsedDays === 0 ? "none" : projected > budget ? "risk" : projected >= budget * 0.9 ? "warn" : "ok";
=======
        const state =
          budget <= 0 ? "none" :
          pct >= 100 ? "over" :
          pct >= 75 ? "warn" :
          "ok";
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1

        return {
          category: c,
          spent,
          budget,
          pct: Math.min(pct, 999),
          state,
<<<<<<< HEAD
          projected,
          forecastState,
=======
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
          budgetId: b?.id || null
        };
      })
      .sort((a, b) => b.spent - a.spent);
<<<<<<< HEAD
  }, [categories, spentMap, budgetMap, year, month]);

  const forecastSummary = useMemo(() => {
    const totalBudget = rows.reduce((sum, r) => sum + (r.budget || 0), 0);
    const totalSpent = rows.reduce((sum, r) => sum + (r.spent || 0), 0);
    const totalProjected = rows.reduce((sum, r) => sum + (r.projected || 0), 0);
    const riskCount = rows.filter((r) => r.forecastState === "risk").length;
    return { totalBudget, totalSpent, totalProjected, riskCount };
  }, [rows]);
=======
  }, [categories, spentMap, budgetMap]);
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1

  const prevMonth = () => {
    setYM((p) => {
      if (p.month === 1) return { year: p.year - 1, month: 12 };
      return { year: p.year, month: p.month - 1 };
    });
  };

  const nextMonth = () => {
    setYM((p) => {
      if (p.month === 12) return { year: p.year + 1, month: 1 };
      return { year: p.year, month: p.month + 1 };
    });
  };

<<<<<<< HEAD
  const handleSave = async (categoryId, value, categoryName) => {
=======
  const handleSave = async (categoryId, value) => {
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
    if (!user) return;

    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) return;

    setSaving(true);
    try {
<<<<<<< HEAD
      await upsertBudget(user.uid, year, month, categoryId, num, categoryName || "");
=======
      await upsertBudget(user.uid, year, month, categoryId, num);
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
      const fresh = await getBudgetsByMonth(user.uid, year, month);
      setBudgets(Array.isArray(fresh) ? fresh : []);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (budgetId) => {
    if (!budgetId) return;
    setSaving(true);
    try {
      await deleteBudget(budgetId);
      const fresh = await getBudgetsByMonth(user.uid, year, month);
      setBudgets(Array.isArray(fresh) ? fresh : []);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="content-page">
        <div className="dashboard-content">
          <div className="page-header">
            <h1>Budget</h1>
            <p>Caricamento...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="content-page">
        <div className="dashboard-content">
          <div className="page-header">
            <h1>Budget</h1>
            <p>Devi effettuare il login.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-page">
      <div className="aurora-background">
        <div className="aurora-layer-1"></div>
        <div className="aurora-layer-2"></div>
        <div className="aurora-layer-3"></div>
      </div>

<<<<<<< HEAD
      <div className="dashboard-content budgets-page">
        <div className="page-header">
          <h1>Budget Mensili</h1>
          <p>Imposta un budget per categoria e monitora lo speso del mese.</p>
        </div>

        <div className="budgets-month-nav">
          <button type="button" className="btn-icon" onClick={prevMonth} title="Mese precedente">
            {"<"}
          </button>

          <div className="budgets-month-label">
            {formatYM(month, year)} {saving ? " - Salvataggio..." : ""}
          </div>

          <button type="button" className="btn-icon" onClick={nextMonth} title="Mese successivo">
            {">"}
          </button>
        </div>

        <div className="budget-forecast-summary">
          <div className="budget-summary-card">
            <div className="label">Budget Totale</div>
            <div className="value">{formatCurrency(forecastSummary.totalBudget, userSettings?.currency || "EUR")}</div>
          </div>
          <div className="budget-summary-card">
            <div className="label">Speso Finora</div>
            <div className="value">{formatCurrency(forecastSummary.totalSpent, userSettings?.currency || "EUR")}</div>
          </div>
          <div className={`budget-summary-card ${forecastSummary.totalProjected > forecastSummary.totalBudget && forecastSummary.totalBudget > 0 ? "risk" : ""}`}>
            <div className="label">Proiezione Fine Mese</div>
            <div className="value">{formatCurrency(forecastSummary.totalProjected, userSettings?.currency || "EUR")}</div>
          </div>
          <div className={`budget-summary-card ${forecastSummary.riskCount > 0 ? "risk" : ""}`}>
            <div className="label">Categorie a Rischio</div>
            <div className="value">{forecastSummary.riskCount}</div>
          </div>
        </div>

        <div className="budgets-grid">
          {rows.map((r) => {
            const badge = r.state === "over" ? "Superato" : r.state === "warn" ? "Oltre 75%" : r.state === "ok" ? "OK" : "-";
            const pctShown = r.budget > 0 ? Math.min(r.pct, 100) : 0;

            return (
              <div key={r.category.id} className={`budget-row-card ${r.state}`}>
                <div className="budget-row-main">
                  <div>
                    <div className="budget-row-title">
                      {r.category.icon} {r.category.name} <span className="budget-row-badge">{badge}</span>
                    </div>
                    <div className="budget-row-meta">
                      Speso: <strong>{formatCurrency(r.spent, userSettings?.currency || "EUR")}</strong>
                      {r.budget > 0 ? (
                        <>
                          {" "}/ Budget: <strong>{formatCurrency(r.budget, userSettings?.currency || "EUR")}</strong>
                        </>
                      ) : (
                        <>
                          {" "}/ Budget: <strong>-</strong>
                        </>
=======
      <div className="dashboard-content">
        <div className="page-header">
          <h1>Budget Mensili 💚</h1>
          <p>Imposta un budget per categoria e monitora lo speso del mese.</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <button type="button" className="btn-icon" onClick={prevMonth} title="Mese precedente">
            ◀
          </button>

          <div style={{ fontWeight: 700 }}>
            {formatYM(month, year)} {saving ? " • Salvataggio..." : ""}
          </div>

          <button type="button" className="btn-icon" onClick={nextMonth} title="Mese successivo">
            ▶
          </button>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {rows.map((r) => {
            const badge =
              r.state === "over" ? "⚠️ Superato" :
              r.state === "warn" ? "🔔 Oltre 75%" :
              r.state === "ok" ? "✅ Ok" :
              "—";

            const pctShown = r.budget > 0 ? Math.min(r.pct, 100) : 0;

            return (
              <div
                key={r.category.id}
                style={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 14,
                  padding: 14
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>
                      {r.category.icon} {r.category.name}{" "}
                      <span style={{ opacity: 0.8, fontWeight: 600 }}> {badge}</span>
                    </div>
                    <div style={{ opacity: 0.85, marginTop: 4 }}>
                      Speso: <strong>€ {r.spent.toFixed(2)}</strong>
                      {r.budget > 0 ? (
                        <>
                          {" "} / Budget: <strong>€ {r.budget.toFixed(2)}</strong>
                        </>
                      ) : (
                        <>{" "} / Budget: <strong>—</strong></>
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
                      )}
                    </div>
                  </div>

<<<<<<< HEAD
                  <div className="budget-row-actions">
=======
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
                    <input
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={r.budget > 0 ? String(r.budget) : ""}
<<<<<<< HEAD
                      placeholder={`Budget ${cs}`}
                      onBlur={(e) => handleSave(r.category.id, e.target.value, r.category.name)}
                      className="budget-input"
                    />
                    {r.budgetId && (
                      <button type="button" onClick={() => handleRemove(r.budgetId)} className="budget-remove-btn">
=======
                      placeholder="Budget €"
                      onBlur={(e) => handleSave(r.category.id, e.target.value)}
                      style={{
                        width: 130,
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.18)",
                        background: "rgba(0,0,0,0.2)",
                        color: "white"
                      }}
                    />
                    {r.budgetId && (
                      <button type="button" onClick={() => handleRemove(r.budgetId)}>
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
                        Rimuovi
                      </button>
                    )}
                  </div>
                </div>

                {r.budget > 0 && (
<<<<<<< HEAD
                  <div className="budget-progress-wrap">
                    <div className="budget-progress-track">
                      <div className="budget-progress-fill" style={{ width: `${pctShown}%` }} />
                    </div>
                    <div className="budget-progress-label">{Math.min(r.pct, 999).toFixed(0)}% del budget</div>
                    <div className={`budget-forecast-label ${r.forecastState}`}>
                      Forecast: {formatCurrency(r.projected, userSettings?.currency || "EUR")}{" "}
                      {r.forecastState === "risk" ? "• rischio sforamento" : r.forecastState === "warn" ? "• vicino al limite" : ""}
=======
                  <div style={{ marginTop: 12 }}>
                    <div style={{ height: 10, background: "rgba(255,255,255,0.15)", borderRadius: 999 }}>
                      <div
                        style={{
                          width: `${pctShown}%`,
                          height: 10,
                          borderRadius: 999,
                          background: "rgba(255,255,255,0.9)"
                        }}
                      />
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                      {Math.min(r.pct, 999).toFixed(0)}% del budget
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

<<<<<<< HEAD
        <div className="budgets-hint">Suggerimento: inserisci il budget e clicca fuori dal campo per salvare.</div>
=======
        <div style={{ marginTop: 14, opacity: 0.85, fontSize: 13 }}>
          Suggerimento: inserisci il budget e clicca fuori dal campo per salvare.
        </div>
>>>>>>> 77b69d7e968b6f45bb6cd561da55df5202057ed1
      </div>
    </div>
  );
}
