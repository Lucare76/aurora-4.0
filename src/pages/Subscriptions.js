import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/app/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { useFinancial } from '../contexts/FinancialContext';
import { formatCurrency } from '../utils/currency';
import {
  createSubscription,
  deleteSubscription,
  getSubscriptions,
  markSubscriptionPaid,
  updateSubscription
} from '../services/subscriptionsService';
import './Subscriptions.css';

function toDateInputValue(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDaysTo(date) {
  if (!date) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

export default function Subscriptions() {
  const { user, userSettings } = useAuth();
  const { accounts = [] } = useFinancial();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [form, setForm] = useState({
    name: '',
    ownerName: '',
    provider: '',
    amount: '',
    billingCycle: 'monthly',
    kind: 'recurring',
    nextDueDate: '',
    accountId: '',
    notes: '',
    active: true
  });

  const reminderDays = Number(userSettings?.subscriptionsNotificationsDays) || 7;
  const accountMap = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a.name])), [accounts]);

  const loadItems = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const out = await getSubscriptions(user.uid);
      setItems(Array.isArray(out) ? out : []);
    } catch (e) {
      console.error('Errore caricamento abbonamenti:', e);
      setMessage({ text: e?.message || 'Errore caricamento abbonamenti', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const resetForm = useCallback(() => {
    setForm({
      name: '',
      ownerName: '',
      provider: '',
      amount: '',
      billingCycle: 'monthly',
      kind: 'recurring',
      nextDueDate: '',
      accountId: '',
      notes: '',
      active: true
    });
    setEditingId('');
  }, []);

  const startEdit = useCallback((item) => {
    setEditingId(item.id);
    setForm({
      name: item.name || '',
      ownerName: item.ownerName || '',
      provider: item.provider || '',
      amount: String(Math.abs(Number(item.amount) || 0)),
      billingCycle: item.billingCycle || 'monthly',
      kind: item.kind || 'recurring',
      nextDueDate: toDateInputValue(item.nextDueDate),
      accountId: item.accountId || '',
      notes: item.notes || '',
      active: item.active !== false
    });
    setMessage({ text: '', type: '' });
  }, []);

  const handleSave = useCallback(async () => {
    if (!user?.uid || saving) return;
    if (!form.name.trim()) {
      setMessage({ text: 'Nome abbonamento obbligatorio', type: 'error' });
      return;
    }
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage({ text: 'Importo non valido', type: 'error' });
      return;
    }
    if (!form.nextDueDate) {
      setMessage({ text: 'Data prossima scadenza obbligatoria', type: 'error' });
      return;
    }
    const due = new Date(`${form.nextDueDate}T00:00:00`);
    if (Number.isNaN(due.getTime())) {
      setMessage({ text: 'Data scadenza non valida', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        ownerName: form.ownerName.trim(),
        provider: form.provider.trim(),
        amount,
        billingCycle: form.billingCycle,
        kind: form.kind,
        nextDueDate: due,
        accountId: form.accountId || null,
        accountName: accountMap[form.accountId] || '',
        notes: form.notes.trim(),
        active: form.active !== false,
        currency: userSettings?.currency || 'EUR'
      };

      if (editingId) {
        await updateSubscription(editingId, payload);
        setMessage({ text: 'Abbonamento aggiornato', type: 'success' });
      } else {
        await createSubscription(user.uid, payload);
        setMessage({ text: 'Abbonamento creato', type: 'success' });
      }
      resetForm();
      await loadItems();
    } catch (e) {
      console.error('Errore salvataggio abbonamento:', e);
      setMessage({ text: e?.message || 'Errore salvataggio', type: 'error' });
    } finally {
      setSaving(false);
    }
  }, [accountMap, editingId, form, loadItems, resetForm, saving, user?.uid, userSettings?.currency]);

  const handleDelete = useCallback(
    async (item) => {
      if (!item?.id) return;
      if (!window.confirm(`Eliminare l'abbonamento "${item.name}"?`)) return;
      setSaving(true);
      try {
        await deleteSubscription(item.id);
        if (editingId === item.id) resetForm();
        await loadItems();
      } catch (e) {
        console.error('Errore eliminazione abbonamento:', e);
        setMessage({ text: e?.message || 'Errore eliminazione', type: 'error' });
      } finally {
        setSaving(false);
      }
    },
    [editingId, loadItems, resetForm]
  );

  const handleMarkPaid = useCallback(async (item) => {
    setSaving(true);
    try {
      await markSubscriptionPaid(item);
      setMessage({ text: `"${item.name}" segnato come rinnovato`, type: 'success' });
      await loadItems();
    } catch (e) {
      console.error('Errore rinnovo abbonamento:', e);
      setMessage({ text: e?.message || 'Errore rinnovo', type: 'error' });
    } finally {
      setSaving(false);
    }
  }, [loadItems]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const days = getDaysTo(item.nextDueDate);
      if (statusFilter === 'active') return item.active !== false;
      if (statusFilter === 'paused') return item.active === false;
      if (statusFilter === 'soon') return item.active !== false && days != null && days >= 0 && days <= reminderDays;
      return true;
    });
  }, [items, reminderDays, statusFilter]);

  return (
    <div className="subscriptions-page">
      <PageHeader
        title="Abbonamenti"
        subtitle="Gestisci abbonamenti manuali anche di terzi (es. famiglia) e monitora le scadenze."
      />

      <div className="subscriptions-form">
        <h3>{editingId ? 'Modifica abbonamento' : 'Nuovo abbonamento'}</h3>
        <div className="subscriptions-grid">
          <input placeholder="Nome (es. Netflix)" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <input placeholder="Intestatario (es. Papà)" value={form.ownerName} onChange={(e) => setForm((p) => ({ ...p, ownerName: e.target.value }))} />
          <input placeholder="Fornitore (opzionale)" value={form.provider} onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value }))} />
          <input type="number" min="0.01" step="0.01" placeholder="Importo" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
          <select value={form.billingCycle} onChange={(e) => setForm((p) => ({ ...p, billingCycle: e.target.value }))}>
            <option value="monthly">Mensile</option>
            <option value="yearly">Annuale</option>
            <option value="weekly">Settimanale</option>
          </select>
          <select value={form.kind} onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value }))}>
            <option value="recurring">Ricorrente</option>
            <option value="fixed">Scadenza fissa</option>
          </select>
          <input type="date" value={form.nextDueDate} onChange={(e) => setForm((p) => ({ ...p, nextDueDate: e.target.value }))} />
          <select value={form.accountId} onChange={(e) => setForm((p) => ({ ...p, accountId: e.target.value }))}>
            <option value="">Nessun conto</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <input className="notes" placeholder="Note" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
        </div>
        <label className="subscriptions-toggle">
          <input type="checkbox" checked={form.active !== false} onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} />
          <span>Abbonamento attivo</span>
        </label>
        <div className="subscriptions-actions">
          <button className="sub-btn primary" type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvataggio...' : editingId ? 'Salva modifiche' : 'Aggiungi abbonamento'}
          </button>
          {editingId && (
            <button className="sub-btn ghost" type="button" onClick={resetForm} disabled={saving}>
              Annulla modifica
            </button>
          )}
        </div>
      </div>

      <div className="subscriptions-toolbar">
        <div className="filters">
          <button type="button" className={statusFilter === 'all' ? 'active' : ''} onClick={() => setStatusFilter('all')}>Tutti</button>
          <button type="button" className={statusFilter === 'soon' ? 'active' : ''} onClick={() => setStatusFilter('soon')}>
            In scadenza ({reminderDays}g)
          </button>
          <button type="button" className={statusFilter === 'active' ? 'active' : ''} onClick={() => setStatusFilter('active')}>Attivi</button>
          <button type="button" className={statusFilter === 'paused' ? 'active' : ''} onClick={() => setStatusFilter('paused')}>In pausa</button>
        </div>
      </div>

      {message.text ? <div className={`subscriptions-msg ${message.type}`}>{message.text}</div> : null}

      {loading ? (
        <div className="subscriptions-empty">Caricamento...</div>
      ) : filteredItems.length === 0 ? (
        <div className="subscriptions-empty">Nessun abbonamento per il filtro selezionato.</div>
      ) : (
        <div className="subscriptions-list">
          {filteredItems.map((item) => {
            const days = getDaysTo(item.nextDueDate);
            const dueLabel =
              days == null ? 'N/D' : days < 0 ? `${Math.abs(days)} giorni fa` : days === 0 ? 'Oggi' : days === 1 ? 'Domani' : `Tra ${days} giorni`;
            const stateClass = item.active === false ? 'paused' : days != null && days < 0 ? 'overdue' : days != null && days <= reminderDays ? 'soon' : 'ok';
            return (
              <article key={item.id} className={`subscription-item ${stateClass}`}>
                <div className="main">
                  <h4>{item.name}</h4>
                  <p>
                    Intestatario: <strong>{item.ownerName || 'N/D'}</strong> · {item.kind === 'fixed' ? 'Scadenza fissa' : 'Ricorrente'} ·{' '}
                    {item.billingCycle === 'yearly' ? 'Annuale' : item.billingCycle === 'weekly' ? 'Settimanale' : 'Mensile'}
                  </p>
                  <p>
                    Prossima scadenza: <strong>{item.nextDueDate ? item.nextDueDate.toLocaleDateString('it-IT') : 'N/D'}</strong> ({dueLabel})
                  </p>
                </div>
                <div className="side">
                  <div className="amount">{formatCurrency(item.amount, userSettings?.currency || 'EUR')}</div>
                  <div className={`pill ${stateClass}`}>{item.active === false ? 'In pausa' : dueLabel}</div>
                  <div className="row-actions">
                    <button type="button" className="sub-btn ghost" onClick={() => startEdit(item)} disabled={saving}>Modifica</button>
                    <button type="button" className="sub-btn ghost" onClick={() => updateSubscription(item.id, { active: item.active === false })} disabled={saving}>
                      {item.active === false ? 'Riattiva' : 'Pausa'}
                    </button>
                    <button type="button" className="sub-btn primary" onClick={() => handleMarkPaid(item)} disabled={saving || item.active === false}>
                      Segna rinnovato
                    </button>
                    <button type="button" className="sub-btn danger" onClick={() => handleDelete(item)} disabled={saving}>Elimina</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
