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
import {
  createSubscriptionPayment,
  getSubscriptionPayments
} from '../services/subscriptionPaymentsService';
import { getMaxSubscriptionNotificationDays } from '../utils/subscriptionsNotifications';
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
  const { accounts = [], categories = [], createTransaction } = useFinancial();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentOwnerFilter, setPaymentOwnerFilter] = useState('all');
  const [paymentProviderFilter, setPaymentProviderFilter] = useState('all');
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

  const reminderDays = getMaxSubscriptionNotificationDays(
    userSettings?.subscriptionsNotificationOffsets ?? userSettings?.subscriptionsNotificationsDays
  );
  const accountMap = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a.name])), [accounts]);
  const subscriptionExpenseCategory = useMemo(() => {
    const expenseCategories = (categories || []).filter((c) => c?.type === 'expense');
    if (!expenseCategories.length) return null;
    const byName = expenseCategories.find((c) => String(c?.name || '').trim().toLowerCase() === 'abbonamenti');
    if (byName) return byName;
    const byBills = expenseCategories.find((c) => String(c?.name || '').trim().toLowerCase() === 'bollette');
    if (byBills) return byBills;
    return expenseCategories[0];
  }, [categories]);

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

  const loadPayments = useCallback(async () => {
    if (!user?.uid) return;
    setPaymentsLoading(true);
    try {
      const out = await getSubscriptionPayments(user.uid);
      setPayments(Array.isArray(out) ? out : []);
    } catch (e) {
      console.error('Errore caricamento storico pagamenti:', e);
      setMessage({ text: e?.message || 'Errore caricamento storico pagamenti', type: 'error' });
    } finally {
      setPaymentsLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadItems();
    loadPayments();
  }, [loadItems, loadPayments]);

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
      const currentItem = editingId ? items.find((x) => x.id === editingId) : null;
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

      if (currentItem) {
        const oldAmount = Math.abs(Number(currentItem.amount) || 0);
        if (amount > oldAmount && oldAmount > 0) {
          const delta = amount - oldAmount;
          const pct = (delta / oldAmount) * 100;
          payload.previousAmount = oldAmount;
          payload.priceIncreaseDelta = delta;
          payload.priceIncreasePercent = pct;
          payload.priceIncreasedAt = new Date();
        }
      }

      if (editingId) {
        await updateSubscription(editingId, payload);
        setMessage({ text: 'Abbonamento aggiornato', type: 'success' });
      } else {
        await createSubscription(user.uid, payload);
        setMessage({ text: 'Abbonamento creato', type: 'success' });
      }
      resetForm();
      await Promise.all([loadItems(), loadPayments()]);
    } catch (e) {
      console.error('Errore salvataggio abbonamento:', e);
      setMessage({ text: e?.message || 'Errore salvataggio', type: 'error' });
    } finally {
      setSaving(false);
    }
  }, [accountMap, editingId, form, items, loadItems, loadPayments, resetForm, saving, user?.uid, userSettings?.currency]);

  const handleDelete = useCallback(
    async (item) => {
      if (!item?.id) return;
      if (!window.confirm(`Eliminare l'abbonamento "${item.name}"?`)) return;
      setSaving(true);
      try {
        await deleteSubscription(item.id);
        if (editingId === item.id) resetForm();
        await Promise.all([loadItems(), loadPayments()]);
      } catch (e) {
        console.error('Errore eliminazione abbonamento:', e);
        setMessage({ text: e?.message || 'Errore eliminazione', type: 'error' });
      } finally {
        setSaving(false);
      }
    },
    [editingId, loadItems, loadPayments, resetForm]
  );

  const handleMarkPaid = useCallback(async (item) => {
    setSaving(true);
    try {
      if (userSettings?.subscriptionsAutoCreateTransactionOnRenew !== false) {
        const targetAccountId = item?.accountId || accounts[0]?.id || null;
        if (!targetAccountId) {
          throw new Error('Nessun conto disponibile per registrare il pagamento');
        }
        const txPayload = {
          description: `Rinnovo abbonamento: ${item.name}`,
          amount: Math.abs(Number(item?.amount) || 0),
          type: 'expense',
          accountId: targetAccountId,
          date: new Date(),
          isSubscriptionPayment: true,
          subscriptionId: item.id,
          subscriptionName: item.name,
          ownerName: item.ownerName || '',
          provider: item.provider || ''
        };
        if (subscriptionExpenseCategory?.id) {
          txPayload.categoryId = subscriptionExpenseCategory.id;
        } else {
          txPayload.category = 'Abbonamenti';
        }

        await createTransaction(txPayload);
      }
      await createSubscriptionPayment(user.uid, {
        subscriptionId: item.id,
        subscriptionName: item.name,
        ownerName: item.ownerName || '',
        provider: item.provider || '',
        amount: Number(item.amount) || 0,
        currency: userSettings?.currency || 'EUR',
        paidAt: new Date(),
        method: 'renewal',
        notes: 'Segnato come rinnovato'
      });
      await markSubscriptionPaid(item);
      setMessage({ text: `"${item.name}" segnato come rinnovato`, type: 'success' });
      await Promise.all([loadItems(), loadPayments()]);
    } catch (e) {
      console.error('Errore rinnovo abbonamento:', e);
      setMessage({ text: e?.message || 'Errore rinnovo', type: 'error' });
    } finally {
      setSaving(false);
    }
  }, [
    accounts,
    createTransaction,
    loadItems,
    loadPayments,
    subscriptionExpenseCategory?.id,
    userSettings?.subscriptionsAutoCreateTransactionOnRenew,
    user?.uid,
    userSettings?.currency
  ]);

  const handleManualPayment = useCallback(async (item) => {
    if (!user?.uid) return;
    const rawAmount = window.prompt('Importo pagamento', String(Math.abs(Number(item?.amount) || 0)));
    if (rawAmount == null) return;
    const amount = Number(String(rawAmount).replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage({ text: 'Importo pagamento non valido', type: 'error' });
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const rawDate = window.prompt('Data pagamento (YYYY-MM-DD)', today);
    if (rawDate == null) return;
    const paidAt = new Date(`${rawDate}T00:00:00`);
    if (Number.isNaN(paidAt.getTime())) {
      setMessage({ text: 'Data pagamento non valida', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      await createSubscriptionPayment(user.uid, {
        subscriptionId: item.id,
        subscriptionName: item.name,
        ownerName: item.ownerName || '',
        provider: item.provider || '',
        amount,
        currency: userSettings?.currency || 'EUR',
        paidAt,
        method: 'manual',
        notes: 'Pagamento registrato manualmente'
      });
      setMessage({ text: `Pagamento registrato per "${item.name}"`, type: 'success' });
      await loadPayments();
    } catch (e) {
      console.error('Errore registrazione pagamento:', e);
      setMessage({ text: e?.message || 'Errore registrazione pagamento', type: 'error' });
    } finally {
      setSaving(false);
    }
  }, [loadPayments, user?.uid, userSettings?.currency]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const days = getDaysTo(item.nextDueDate);
      if (statusFilter === 'active') return item.active !== false;
      if (statusFilter === 'paused') return item.active === false;
      if (statusFilter === 'soon') return item.active !== false && days != null && days >= 0 && days <= reminderDays;
      return true;
    });
  }, [items, reminderDays, statusFilter]);

  const paymentOwners = useMemo(() => {
    const set = new Set();
    payments.forEach((p) => {
      const owner = String(p?.ownerName || '').trim();
      if (owner) set.add(owner);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'it'));
  }, [payments]);

  const paymentProviders = useMemo(() => {
    const set = new Set();
    payments.forEach((p) => {
      const provider = String(p?.provider || '').trim();
      if (provider) set.add(provider);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'it'));
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (paymentOwnerFilter !== 'all' && String(p?.ownerName || '') !== paymentOwnerFilter) return false;
      if (paymentProviderFilter !== 'all' && String(p?.provider || '') !== paymentProviderFilter) return false;
      return true;
    });
  }, [payments, paymentOwnerFilter, paymentProviderFilter]);

  const paymentStats = useMemo(() => {
    const now = new Date();
    const start30 = new Date(now);
    start30.setDate(start30.getDate() - 30);
    start30.setHours(0, 0, 0, 0);
    const start90 = new Date(now);
    start90.setDate(start90.getDate() - 90);
    start90.setHours(0, 0, 0, 0);

    const total30 = filteredPayments
      .filter((p) => p.paidAt && p.paidAt >= start30)
      .reduce((sum, p) => sum + Math.abs(Number(p.amount) || 0), 0);
    const total90 = filteredPayments
      .filter((p) => p.paidAt && p.paidAt >= start90)
      .reduce((sum, p) => sum + Math.abs(Number(p.amount) || 0), 0);

    return { total30, total90, count: filteredPayments.length };
  }, [filteredPayments]);

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
                    <button type="button" className="sub-btn ghost" onClick={() => handleManualPayment(item)} disabled={saving}>
                      Registra pagamento
                    </button>
                    <button type="button" className="sub-btn danger" onClick={() => handleDelete(item)} disabled={saving}>Elimina</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="subscriptions-history">
        <h3>Storico pagamenti</h3>
        <div className="subscriptions-history-kpis">
          <div className="history-kpi">
            <span>Ultimi 30 giorni</span>
            <strong>{formatCurrency(paymentStats.total30, userSettings?.currency || 'EUR')}</strong>
          </div>
          <div className="history-kpi">
            <span>Ultimi 90 giorni</span>
            <strong>{formatCurrency(paymentStats.total90, userSettings?.currency || 'EUR')}</strong>
          </div>
          <div className="history-kpi">
            <span>Pagamenti filtrati</span>
            <strong>{paymentStats.count}</strong>
          </div>
        </div>

        <div className="subscriptions-history-filters">
          <select value={paymentOwnerFilter} onChange={(e) => setPaymentOwnerFilter(e.target.value)}>
            <option value="all">Intestatari: tutti</option>
            {paymentOwners.map((owner) => (
              <option key={owner} value={owner}>{owner}</option>
            ))}
          </select>
          <select value={paymentProviderFilter} onChange={(e) => setPaymentProviderFilter(e.target.value)}>
            <option value="all">Fornitori: tutti</option>
            {paymentProviders.map((provider) => (
              <option key={provider} value={provider}>{provider}</option>
            ))}
          </select>
        </div>

        {paymentsLoading ? (
          <div className="subscriptions-empty">Caricamento storico...</div>
        ) : filteredPayments.length === 0 ? (
          <div className="subscriptions-empty">Nessun pagamento nello storico per i filtri selezionati.</div>
        ) : (
          <div className="subscriptions-history-table-wrap">
            <table className="subscriptions-history-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Abbonamento</th>
                  <th>Intestatario</th>
                  <th>Fornitore</th>
                  <th>Metodo</th>
                  <th>Importo</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => (
                  <tr key={p.id}>
                    <td>{p.paidAt ? p.paidAt.toLocaleDateString('it-IT') : 'N/D'}</td>
                    <td>{p.subscriptionName || 'N/D'}</td>
                    <td>{p.ownerName || 'N/D'}</td>
                    <td>{p.provider || '-'}</td>
                    <td>{p.method === 'renewal' ? 'Rinnovo' : 'Manuale'}</td>
                    <td>{formatCurrency(p.amount, userSettings?.currency || 'EUR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
