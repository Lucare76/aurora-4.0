// src/pages/SavingsGoals.js
import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useFinancial } from "../contexts/FinancialContext";
import { getCurrencySymbol } from "../utils/currency";
import {
  getSavingsGoals,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  depositToGoal,
  withdrawFromGoal
} from "../services/savingsGoalsService";
import "./SavingsGoals.css";

const EMOJI_OPTIONS = [
  "\u{1F3AF}", // 🎯
  "\u{1F3E0}", // 🏠
  "\u{2708}\u{FE0F}", // ✈️
  "\u{1F697}", // 🚗
  "\u{1F4BB}", // 💻
  "\u{1F4F1}", // 📱
  "\u{1F393}", // 🎓
  "\u{1F48D}", // 💍
  "\u{1F476}", // 👶
  "\u{1F3D6}\u{FE0F}", // 🏖️
  "\u{1F4B0}", // 💰
  "\u{1F381}", // 🎁
  "\u{2695}\u{FE0F}", // ⚕️
  "\u{1F6E1}\u{FE0F}", // 🛡️
  "\u{1F4C8}", // 📈
  "\u{1F43E}" // 🐾
];
const COLOR_OPTIONS = ["#4f46e5", "#7c3aed", "#ec4899", "#ef4444", "#f97316", "#f59e0b", "#22c55e", "#10b981", "#06b6d4", "#3b82f6"];

function fmt(n) {
  const num = Math.abs(Number(n) || 0);
  const fixed = num.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withSep},${decPart}`;
}

function getMonthsRemaining(deadline) {
  if (!deadline) return null;
  const now = new Date();
  let deadlineDate;
  if (deadline && typeof deadline === "object" && typeof deadline.toDate === "function") {
    deadlineDate = deadline.toDate();
  } else {
    deadlineDate = new Date(deadline);
  }
  if (isNaN(deadlineDate.getTime())) return null;

  const months = (deadlineDate.getFullYear() - now.getFullYear()) * 12 + (deadlineDate.getMonth() - now.getMonth());
  return months;
}

export default function SavingsGoals() {
  const { user, userSettings } = useAuth();
  const { accounts = [] } = useFinancial();
  const cs = getCurrencySymbol(userSettings?.currency);

  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [depositModal, setDepositModal] = useState({ goalId: null, open: false, mode: "deposit" });
  const [depositAmount, setDepositAmount] = useState("");
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    targetAmount: "",
    icon: "\u{1F3AF}",
    color: "#4f46e5",
    deadline: "",
    accountId: "",
    notes: ""
  });

  const loadGoals = async () => {
    if (!user?.uid) return;
    try {
      const data = await getSavingsGoals(user.uid);
      // Sync account-linked goals
      const synced = data.map((g) => {
        if (g.accountId) {
          const acc = accounts.find((a) => a.id === g.accountId);
          if (acc) {
            const balance = Number(acc.balance) || 0;
            const target = Number(g.targetAmount) || 0;
            return { ...g, currentAmount: balance, completed: balance >= target && target > 0 };
          }
        }
        return g;
      });
      setGoals(synced);
    } catch (e) {
      console.error("Errore caricamento obiettivi:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, accounts]);

  const resetForm = () => {
    setFormData({
      name: "",
      targetAmount: "",
      icon: "\u{1F3AF}",
      color: "#4f46e5",
      deadline: "",
      accountId: "",
      notes: ""
    });
    setEditingGoal(null);
  };

  const openNewForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (goal) => {
    let deadlineStr = "";
    if (goal.deadline) {
      let d = goal.deadline;
      if (d && typeof d === "object" && typeof d.toDate === "function") d = d.toDate();
      else d = new Date(d);
      if (!isNaN(d.getTime())) {
        deadlineStr = d.toISOString().split("T")[0];
      }
    }
    setFormData({
      name: goal.name || "",
      targetAmount: String(goal.targetAmount || ""),
      icon: goal.icon || "\u{1F3AF}",
      color: goal.color || "#4f46e5",
      deadline: deadlineStr,
      accountId: goal.accountId || "",
      notes: goal.notes || ""
    });
    setEditingGoal(goal);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.targetAmount) return;
    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        targetAmount: Number(formData.targetAmount) || 0,
        icon: formData.icon,
        color: formData.color,
        deadline: formData.deadline ? new Date(formData.deadline) : null,
        accountId: formData.accountId || null,
        notes: formData.notes.trim()
      };

      if (editingGoal) {
        await updateSavingsGoal(editingGoal.id, payload);
      } else {
        await createSavingsGoal(user.uid, payload);
      }

      setShowForm(false);
      resetForm();
      await loadGoals();
    } catch (e) {
      console.error("Errore salvataggio obiettivo:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (goalId) => {
    if (!window.confirm("Eliminare questo obiettivo?")) return;
    setSaving(true);
    try {
      await deleteSavingsGoal(goalId);
      await loadGoals();
    } catch (e) {
      console.error("Errore eliminazione:", e);
    } finally {
      setSaving(false);
    }
  };

  const openDepositModal = (goalId, mode) => {
    setDepositModal({ goalId, open: true, mode });
    setDepositAmount("");
  };

  const handleDeposit = async () => {
    const num = Number(depositAmount);
    if (!num || num <= 0) return;
    setSaving(true);
    try {
      if (depositModal.mode === "deposit") {
        await depositToGoal(depositModal.goalId, num);
      } else {
        await withdrawFromGoal(depositModal.goalId, num);
      }
      setDepositModal({ goalId: null, open: false, mode: "deposit" });
      setDepositAmount("");
      await loadGoals();
    } catch (e) {
      console.error("Errore operazione:", e);
    } finally {
      setSaving(false);
    }
  };

  // Summary calculations
  const activeGoals = goals.filter((g) => !g.completed);
  const completedGoals = goals.filter((g) => g.completed);
  const totalSaved = goals.reduce((sum, g) => sum + (Number(g.currentAmount) || 0), 0);
  const totalTarget = goals.reduce((sum, g) => sum + (Number(g.targetAmount) || 0), 0);

  if (loading) {
    return (
      <div className="content-page">
        <div className="aurora-background">
          <div className="aurora-layer-1"></div>
          <div className="aurora-layer-2"></div>
          <div className="aurora-layer-3"></div>
        </div>
        <div className="dashboard-content">
          <div className="page-header">
            <h1>Obiettivi di Risparmio</h1>
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
            <h1>Obiettivi di Risparmio</h1>
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
        {/* Header */}
        <div className="page-header savings-header">
          <div>
            <h1>Obiettivi di Risparmio 🎯</h1>
            <p>Definisci i tuoi obiettivi e monitora i progressi</p>
          </div>
          <button type="button" className="btn-new-goal" onClick={openNewForm}>
            + Nuovo Obiettivo
          </button>
        </div>

        {/* Riepilogo */}
        <div className="savings-summary">
          <div className="savings-summary-card">
            <div className="summary-value summary-value-saved">{cs} {fmt(totalSaved)}</div>
            <div className="summary-label">Totale Risparmiato</div>
          </div>
          <div className="savings-summary-card">
            <div className="summary-value">{cs} {fmt(totalTarget)}</div>
            <div className="summary-label">Totale Obiettivo</div>
          </div>
          <div className="savings-summary-card">
            <div className="summary-value summary-value-active">{activeGoals.length}</div>
            <div className="summary-label">Attivi</div>
          </div>
          <div className="savings-summary-card">
            <div className="summary-value summary-value-completed">{completedGoals.length}</div>
            <div className="summary-label">Completati</div>
          </div>
        </div>

        {/* Griglia obiettivi */}
        {goals.length === 0 ? (
          <div className="savings-empty-state">
            <div className="empty-icon">🎯</div>
            <p><strong>Nessun obiettivo di risparmio</strong></p>
            <p>Crea il tuo primo obiettivo per iniziare a risparmiare!</p>
          </div>
        ) : (
          <div className="savings-goals-grid">
            {goals.map((goal) => {
              const current = Number(goal.currentAmount) || 0;
              const target = Number(goal.targetAmount) || 1;
              const pct = Math.min((current / target) * 100, 100);
              const monthsLeft = getMonthsRemaining(goal.deadline);
              const remaining = target - current;
              const monthlyNeeded = monthsLeft && monthsLeft > 0 ? remaining / monthsLeft : null;
              const isExpired = monthsLeft !== null && monthsLeft <= 0 && !goal.completed;
              const isLinked = !!goal.accountId;
              const linkedAccount = isLinked ? accounts.find((a) => a.id === goal.accountId) : null;

              return (
                <div key={goal.id} className={`savings-goal-card ${goal.completed ? "completed" : ""}`}>
                  {/* Header card */}
                  <div className="goal-card-header">
                    <div className="goal-icon" style={{ background: `${goal.color || "#4f46e5"}22` }}>
                      {goal.icon || "\u{1F3AF}"}
                    </div>
                    <div className="goal-name">{goal.name}</div>
                    {goal.completed && <span className="goal-badge-completed">Raggiunto!</span>}
                    {isExpired && <span className="goal-badge-expired">Scaduto</span>}
                  </div>

                  {/* Progress bar */}
                  <div className="goal-progress-bar">
                    <div
                      className="goal-progress-fill"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${goal.color || "#4f46e5"}, ${goal.color || "#4f46e5"}cc)`
                      }}
                    />
                  </div>

                  <div className="goal-progress-info">
                    <span className="goal-amounts">
                      {cs} {fmt(current)} / {cs} {fmt(target)}
                    </span>
                    <span className="goal-pct" style={{ color: goal.color || "#4f46e5" }}>
                      {pct.toFixed(0)}%
                    </span>
                  </div>

                  {/* Deadline info */}
                  {monthsLeft !== null && !goal.completed && (
                    <div className="goal-deadline-info">
                      {isExpired
                        ? "Scadenza superata"
                        : monthlyNeeded !== null
                        ? `Mancano ${monthsLeft} ${monthsLeft === 1 ? "mese" : "mesi"} — Risparmia ${cs} ${fmt(monthlyNeeded)}/mese`
                        : ""}
                    </div>
                  )}

                  {/* Account linked */}
                  {isLinked && (
                    <div className="goal-account-info">
                      <span className="goal-badge-auto">Auto</span>
                      <span className="goal-account-name">
                        Collegato a {linkedAccount?.name || "conto"}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="goal-card-actions">
                    {!isLinked && (
                      <>
                        <button type="button" className="btn-deposit" onClick={() => openDepositModal(goal.id, "deposit")}>
                          Versa
                        </button>
                        <button type="button" className="btn-withdraw" onClick={() => openDepositModal(goal.id, "withdraw")}>
                          Preleva
                        </button>
                      </>
                    )}
                    <button type="button" onClick={() => openEditForm(goal)}>
                      Modifica
                    </button>
                    <button type="button" className="btn-delete" onClick={() => handleDelete(goal.id)}>
                      Elimina
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Form modale creazione/modifica */}
        {showForm && (
          <div className="savings-modal-overlay" onClick={() => { setShowForm(false); resetForm(); }}>
            <div className="savings-modal" onClick={(e) => e.stopPropagation()}>
              <h2>{editingGoal ? "Modifica Obiettivo" : "Nuovo Obiettivo"}</h2>

              <div className="form-group">
                <label>Nome obiettivo</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Es. Vacanza estiva"
                />
              </div>

              <div className="form-group">
                <label>Icona</label>
                <div className="emoji-picker-grid">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={formData.icon === emoji ? "selected" : ""}
                      onClick={() => setFormData((p) => ({ ...p, icon: emoji }))}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Colore</label>
                <div className="color-picker-grid">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={formData.color === color ? "selected" : ""}
                      style={{ background: color }}
                      onClick={() => setFormData((p) => ({ ...p, color }))}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Importo obiettivo ({cs})</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData((p) => ({ ...p, targetAmount: e.target.value }))}
                  placeholder="Es. 5000"
                />
              </div>

              <div className="form-group">
                <label>Scadenza (opzionale)</label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData((p) => ({ ...p, deadline: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Collega a conto (opzionale)</label>
                <select
                  value={formData.accountId}
                  onChange={(e) => setFormData((p) => ({ ...p, accountId: e.target.value }))}
                >
                  <option value="">Nessun collegamento</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({cs} {fmt(Number(acc.balance) || 0)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Note (opzionale)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Aggiungi note..."
                />
              </div>

              <div className="savings-modal-actions">
                <button type="button" className="btn-cancel" onClick={() => { setShowForm(false); resetForm(); }}>
                  Annulla
                </button>
                <button type="button" className="btn-save" onClick={handleSubmit} disabled={saving}>
                  {saving ? "Salvataggio..." : editingGoal ? "Salva Modifiche" : "Crea Obiettivo"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal versamento/prelievo */}
        {depositModal.open && (
          <div className="savings-modal-overlay" onClick={() => setDepositModal({ goalId: null, open: false, mode: "deposit" })}>
            <div className="savings-modal" onClick={(e) => e.stopPropagation()}>
              <h2>{depositModal.mode === "deposit" ? "Versa nell'obiettivo" : "Preleva dall'obiettivo"}</h2>
              <div className="deposit-modal-input">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder={`Importo (${cs})`}
                  autoFocus
                />
              </div>
              <div className="savings-modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setDepositModal({ goalId: null, open: false, mode: "deposit" })}
                >
                  Annulla
                </button>
                <button type="button" className="btn-save" onClick={handleDeposit} disabled={saving}>
                  {saving ? "..." : "Conferma"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
