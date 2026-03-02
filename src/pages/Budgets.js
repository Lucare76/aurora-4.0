import React, { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/app/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { useFinancial } from "../contexts/FinancialContext";
import { formatCurrency, getCurrencySymbol } from "../utils/currency";
import { formatCategoryLabel } from "../utils/text";
import { deleteBudget, getBudgetsByMonth, upsertBudget } from "../services/budgetsService";
import "./Budgets.css";

function ymFromDate(d = new Date()) {
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function formatYM(month, year) {
  return `${String(month).padStart(2, "0")}/${year}`;
}

function parseDate(date) {
  if (!date) return null;
  if (date && typeof date === "object" && typeof date.toDate === "function") return date.toDate();
  if (date instanceof Date) return date;
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? null : d;
}

function shiftYearMonth(year, month, deltaMonths) {
  const d = new Date(year, month - 1 + deltaMonths, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export default function Budgets() {
  const { user, userSettings } = useAuth();
  const { transactions = [], categories = [], loading } = useFinancial();
  const cs = getCurrencySymbol(userSettings?.currency);

  const [{ year, month }, setYM] = useState(ymFromDate());
  const [budgets, setBudgets] = useState([]);
  const [saving, setSaving] = useState(false);

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
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const m = new Map();
    for (const t of transactions) {
      const amt = Number(t?.amount) || 0;
      const type = t?.type || (amt < 0 ? "expense" : "income");
      if (type !== "expense") continue;

      const d = parseDate(t?.date);
      if (!d || d < start || d >= end) continue;

      const cid = t?.categoryId;
      if (!cid) continue;

      const prev = m.get(cid) || 0;
      m.set(cid, prev + Math.abs(amt));
    }
    return m;
  }, [transactions, year, month]);

  const historicalSpentMap = useMemo(() => {
    const m = new Map();
    for (const t of transactions) {
      const amt = Number(t?.amount) || 0;
      const type = t?.type || (amt < 0 ? "expense" : "income");
      if (type !== "expense") continue;
      const d = parseDate(t?.date);
      if (!d) continue;
      const cid = t?.categoryId;
      if (!cid) continue;
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${cid}`;
      m.set(key, (m.get(key) || 0) + Math.abs(amt));
    }
    return m;
  }, [transactions]);

  const rows = useMemo(() => {
    return categories
      .filter((c) => c.type === "expense")
      .map((c) => {
        const spent = spentMap.get(c.id) || 0;
        const b = budgetMap.get(c.id);
        const budget = Number(b?.amount) || 0;

        const pct = budget > 0 ? (spent / budget) * 100 : 0;
        const state = budget <= 0 ? "none" : pct >= 100 ? "over" : pct >= 75 ? "warn" : "ok";

        const now = new Date();
        const daysInMonth = new Date(year, month, 0).getDate();
        const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
        const isPastMonth = now.getFullYear() > year || (now.getFullYear() === year && now.getMonth() + 1 > month);
        const elapsedDays = isPastMonth ? daysInMonth : isCurrentMonth ? now.getDate() : 0;
        const projected = elapsedDays > 0 ? (spent / elapsedDays) * daysInMonth : 0;
        const forecastState =
          budget <= 0 || elapsedDays === 0 ? "none" : projected > budget ? "risk" : projected >= budget * 0.9 ? "warn" : "ok";

        const prev1 = shiftYearMonth(year, month, -1);
        const prev2 = shiftYearMonth(year, month, -2);
        const prev3 = shiftYearMonth(year, month, -3);
        const vals = [
          historicalSpentMap.get(`${prev1.year}-${prev1.month}-${c.id}`) || 0,
          historicalSpentMap.get(`${prev2.year}-${prev2.month}-${c.id}`) || 0,
          historicalSpentMap.get(`${prev3.year}-${prev3.month}-${c.id}`) || 0
        ];
        const nonZero = vals.filter((v) => v > 0);
        const avg3 = nonZero.length ? vals.reduce((s, v) => s + v, 0) / nonZero.length : 0;
        const sameMonthLastYear = historicalSpentMap.get(`${year - 1}-${month}-${c.id}`) || 0;
        const trendBoost = vals[0] > avg3 * 1.15 && avg3 > 0 ? 1.08 : 1;
        const seasonalBase = sameMonthLastYear > 0 ? (avg3 * 0.7 + sameMonthLastYear * 0.3) : avg3;
        const dynamicSuggested = seasonalBase > 0 ? Number((seasonalBase * 1.1 * trendBoost).toFixed(2)) : 0;

        return {
          category: c,
          spent,
          budget,
          pct: Math.min(pct, 999),
          state,
          projected,
          forecastState,
          budgetId: b?.id || null,
          dynamicSuggested
        };
      })
      .sort((a, b) => b.spent - a.spent);
  }, [categories, spentMap, budgetMap, year, month, historicalSpentMap]);

  const forecastSummary = useMemo(() => {
    const totalBudget = rows.reduce((sum, r) => sum + (r.budget || 0), 0);
    const totalSpent = rows.reduce((sum, r) => sum + (r.spent || 0), 0);
    const totalProjected = rows.reduce((sum, r) => sum + (r.projected || 0), 0);
    const riskCount = rows.filter((r) => r.forecastState === "risk").length;
    return { totalBudget, totalSpent, totalProjected, riskCount };
  }, [rows]);

  const activeBudgetCount = useMemo(() => rows.filter((r) => r.budget > 0).length, [rows]);

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

  const handleSave = async (categoryId, value, categoryName) => {
    if (!user) return;

    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) return;

    setSaving(true);
    try {
      await upsertBudget(user.uid, year, month, categoryId, num, categoryName || "");
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

  const applyAllDynamicBudgets = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const candidates = rows.filter((r) => r.dynamicSuggested > 0);
      for (const r of candidates) {
        await upsertBudget(user.uid, year, month, r.category.id, r.dynamicSuggested, r.category.name || "");
      }
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
          <PageHeader className="page-header" title="Budget" subtitle="Caricamento..." />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="content-page">
        <div className="dashboard-content">
          <PageHeader className="page-header" title="Budget" subtitle="Devi effettuare il login." />
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

      <div className="dashboard-content budgets-page">
        <PageHeader
          className="page-header"
          title="Budget Mensili"
          subtitle="Imposta un budget per categoria e monitora lo speso del mese."
        />

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

        <div className="budgets-quick-stats">
          <div className="budgets-pill">
            Budget impostati: <strong>{activeBudgetCount}</strong>
          </div>
          <div className={`budgets-pill ${forecastSummary.riskCount > 0 ? "risk" : "ok"}`}>
            Rischio sforamento: <strong>{forecastSummary.riskCount}</strong>
          </div>
          <div className="budgets-pill">
            Mese: <strong>{formatYM(month, year)}</strong>
          </div>
          <button type="button" className="budgets-pill apply-all" onClick={applyAllDynamicBudgets} disabled={saving}>
            Applica budget dinamici
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
                      {r.category.icon} {formatCategoryLabel(r.category.name)} <span className="budget-row-badge">{badge}</span>
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
                      )}
                    </div>
                  </div>

                  <div className="budget-row-actions">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={r.budget > 0 ? String(r.budget) : ""}
                      placeholder={`Budget ${cs}`}
                      onBlur={(e) => handleSave(r.category.id, e.target.value, r.category.name)}
                      className="budget-input"
                    />
                    {r.dynamicSuggested > 0 && (
                      <button
                        type="button"
                        className="budget-suggest-btn"
                        onClick={() => handleSave(r.category.id, r.dynamicSuggested, r.category.name)}
                      >
                        Usa suggerito ({formatCurrency(r.dynamicSuggested, userSettings?.currency || "EUR")})
                      </button>
                    )}
                    {r.budgetId && (
                      <button type="button" onClick={() => handleRemove(r.budgetId)} className="budget-remove-btn">
                        Rimuovi
                      </button>
                    )}
                  </div>
                </div>

                {r.budget > 0 && (
                  <div className="budget-progress-wrap">
                    <div className="budget-progress-track">
                      <div className={`budget-progress-fill ${r.state}`} style={{ width: `${pctShown}%` }} />
                    </div>
                    <div className="budget-progress-label">{Math.min(r.pct, 999).toFixed(0)}% del budget</div>
                    <div className={`budget-forecast-label ${r.forecastState}`}>
                      Forecast: {formatCurrency(r.projected, userSettings?.currency || "EUR")} {" "}
                      {r.forecastState === "risk" ? "- rischio sforamento" : r.forecastState === "warn" ? "- vicino al limite" : ""}
                    </div>
                    {r.dynamicSuggested > 0 && (
                      <div className="budget-dynamic-label">
                        Budget dinamico consigliato: <strong>{formatCurrency(r.dynamicSuggested, userSettings?.currency || "EUR")}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="budgets-hint">Suggerimento: inserisci il budget e clicca fuori dal campo per salvare.</div>
      </div>
    </div>
  );
}
