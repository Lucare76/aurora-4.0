// src/pages/Budgets.js
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useFinancial } from "../contexts/FinancialContext";
import { getBudgetsByMonth, upsertBudget, deleteBudget } from "../services/budgetsService";

function ymFromDate(d = new Date()) {
  return { year: d.getFullYear(), month: d.getMonth() + 1 }; // month 1-12
}

function formatYM(month, year) {
  return `${String(month).padStart(2, "0")}/${year}`;
}

// ✅ robust date parser (Firestore Timestamp / Date / string)
function parseDate(date) {
  if (!date) return null;
  if (date && typeof date === "object" && typeof date.toDate === "function") return date.toDate(); // Firestore Timestamp
  if (date instanceof Date) return date;
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function Budgets() {
  const { user } = useAuth();
  const { transactions = [], categories = [], loading } = useFinancial();

  const [{ year, month }, setYM] = useState(ymFromDate());
  const [budgets, setBudgets] = useState([]);
  const [saving, setSaving] = useState(false);

  // carica budgets mese
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
    // calcola speso per categoria nel mese selezionato (solo expense)
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const m = new Map();
    for (const t of transactions) {
      const amt = Number(t?.amount) || 0;

      // ✅ robust type: se manca, usa segno importo
      const type = t?.type || (amt < 0 ? "expense" : "income");
      if (type !== "expense") continue;

      const d = parseDate(t?.date);
      if (!d || d < start || d >= end) continue;

      const cid = t?.categoryId;
      if (!cid) continue; // ✅ ignora senza categoria (come comportamento attuale)

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
        const state =
          budget <= 0 ? "none" :
          pct >= 100 ? "over" :
          pct >= 75 ? "warn" :
          "ok";

        return {
          category: c,
          spent,
          budget,
          pct: Math.min(pct, 999),
          state,
          budgetId: b?.id || null
        };
      })
      .sort((a, b) => b.spent - a.spent);
  }, [categories, spentMap, budgetMap]);

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

  const handleSave = async (categoryId, value) => {
    if (!user) return;

    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) return;

    setSaving(true);
    try {
      await upsertBudget(user.uid, year, month, categoryId, num);
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
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={r.budget > 0 ? String(r.budget) : ""}
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
                        Rimuovi
                      </button>
                    )}
                  </div>
                </div>

                {r.budget > 0 && (
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
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 14, opacity: 0.85, fontSize: 13 }}>
          Suggerimento: inserisci il budget e clicca fuori dal campo per salvare.
        </div>
      </div>
    </div>
  );
}
