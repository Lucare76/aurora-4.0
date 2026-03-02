import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFinancial } from '../contexts/FinancialContext';
import PageHeader from '../components/app/PageHeader';
import { formatCurrency } from '../utils/currency';
import {
  deleteRecurring,
  getAllRecurringTransactions,
  setRecurringActive,
  updateRecurring
} from '../services/recurringService';
import { getRecurringNextRunLabel, parseRecurringDate } from '../utils/recurring';
import './Recurring.css';

function dateInputValue(value) {
  const d = parseRecurringDate(value);
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function Recurring() {
  const { user, userSettings } = useAuth();
  const { accounts = [], categories = [] } = useFinancial();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState({
    description: '',
    amount: '',
    type: 'expense',
    frequency: 'monthly',
    nextDate: '',
    accountId: '',
    categoryId: ''
  });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  const accountMap = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a.name])), [accounts]);
  const categoryMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.name])), [categories]);

  const loadItems = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const list = await getAllRecurringTransactions(user.uid);
      const sorted = (Array.isArray(list) ? list : []).sort((a, b) => {
        const da = parseRecurringDate(a.nextDate)?.getTime() || Number.MAX_SAFE_INTEGER;
        const db = parseRecurringDate(b.nextDate)?.getTime() || Number.MAX_SAFE_INTEGER;
        return da - db;
      });
      setItems(sorted);
    } catch (e) {
      console.error('Errore caricamento ricorrenze:', e);
      setMessage({ text: e?.message || 'Errore caricamento ricorrenze', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const summary = useMemo(() => {
    const active = items.filter((r) => r.active !== false).length;
    const paused = items.length - active;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const soonLimit = new Date();
    soonLimit.setHours(23, 59, 59, 999);
    soonLimit.setDate(soonLimit.getDate() + 7);
    const dueSoon = items.filter((r) => {
      if (r.active === false) return false;
      const d = parseRecurringDate(r.nextDate);
      return !!d && d >= now && d <= soonLimit;
    }).length;
    return { active, paused, dueSoon, total: items.length };
  }, [items]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => items.some((r) => r.id === id)));
  }, [items]);

  const filteredItems = useMemo(() => {
    if (statusFilter === 'active') return items.filter((r) => r.active !== false);
    if (statusFilter === 'paused') return items.filter((r) => r.active === false);
    return items;
  }, [items, statusFilter]);

  const startEdit = useCallback((item) => {
    setEditingId(item.id);
    setForm({
      description: item.description || '',
      amount: String(Math.abs(Number(item.amount) || 0)),
      type: item.type || 'expense',
      frequency: item.frequency || 'monthly',
      nextDate: dateInputValue(item.nextDate),
      accountId: item.accountId || '',
      categoryId: item.categoryId || ''
    });
    setMessage({ text: '', type: '' });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId('');
    setMessage({ text: '', type: '' });
  }, []);

  const handleToggleActive = useCallback(
    async (item) => {
      if (!item?.id) return;
      setSavingId(item.id);
      try {
        await setRecurringActive(item.id, item.active === false);
        await loadItems();
      } catch (e) {
        console.error('Errore aggiornamento stato ricorrenza:', e);
        setMessage({ text: e?.message || 'Errore aggiornamento stato', type: 'error' });
      } finally {
        setSavingId('');
      }
    },
    [loadItems]
  );

  const handleDelete = useCallback(
    async (item) => {
      if (!item?.id) return;
      if (!window.confirm(`Eliminare la ricorrenza "${item.description || 'senza descrizione'}"?`)) return;
      setSavingId(item.id);
      try {
        await deleteRecurring(item.id);
        if (editingId === item.id) setEditingId('');
        await loadItems();
      } catch (e) {
        console.error('Errore eliminazione ricorrenza:', e);
        setMessage({ text: e?.message || 'Errore eliminazione', type: 'error' });
      } finally {
        setSavingId('');
      }
    },
    [editingId, loadItems]
  );

  const handleSaveEdit = useCallback(async () => {
    if (!editingId) return;
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage({ text: 'Importo non valido', type: 'error' });
      return;
    }
    if (!form.nextDate) {
      setMessage({ text: 'Seleziona una data valida', type: 'error' });
      return;
    }

    const nextDate = new Date(`${form.nextDate}T00:00:00`);
    if (Number.isNaN(nextDate.getTime())) {
      setMessage({ text: 'Data non valida', type: 'error' });
      return;
    }

    setSavingId(editingId);
    try {
      await updateRecurring(editingId, {
        description: form.description.trim(),
        amount: Math.abs(amount),
        type: form.type,
        frequency: form.frequency,
        nextDate,
        accountId: form.accountId || null,
        accountName: accountMap[form.accountId] || '',
        categoryId: form.categoryId || null,
        categoryName: categoryMap[form.categoryId] || ''
      });
      setMessage({ text: 'Ricorrenza aggiornata', type: 'success' });
      setEditingId('');
      await loadItems();
    } catch (e) {
      console.error('Errore aggiornamento ricorrenza:', e);
      setMessage({ text: e?.message || 'Errore aggiornamento', type: 'error' });
    } finally {
      setSavingId('');
    }
  }, [editingId, form, accountMap, categoryMap, loadItems]);

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const toggleSelectAllFiltered = useCallback(() => {
    if (!filteredItems.length) {
      setSelectedIds([]);
      return;
    }
    const allFilteredIds = filteredItems.map((r) => r.id);
    const allSelected = allFilteredIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  }, [filteredItems, selectedIds]);

  const handleBulkSetActive = useCallback(
    async (active) => {
      if (!selectedIds.length || bulkBusy) return;
      setBulkBusy(true);
      try {
        await Promise.all(selectedIds.map((id) => setRecurringActive(id, active)));
        setMessage({
          text: active
            ? `${selectedIds.length} ricorrenze riattivate`
            : `${selectedIds.length} ricorrenze messe in pausa`,
          type: 'success'
        });
        setSelectedIds([]);
        await loadItems();
      } catch (e) {
        console.error('Errore aggiornamento multiplo ricorrenze:', e);
        setMessage({ text: e?.message || 'Errore operazione multipla', type: 'error' });
      } finally {
        setBulkBusy(false);
      }
    },
    [selectedIds, bulkBusy, loadItems]
  );

  return (
    <div className="recurring-page">
      <PageHeader
        title="Ricorrenze"
        subtitle="Gestisci entrate e spese automatiche: pausa, riattiva, modifica o elimina."
      />

      <div className="recurring-summary">
        <div className="summary-card"><span>Totale</span><strong>{summary.total}</strong></div>
        <div className="summary-card"><span>Attive</span><strong>{summary.active}</strong></div>
        <div className="summary-card"><span>In pausa</span><strong>{summary.paused}</strong></div>
        <div className="summary-card"><span>In scadenza (7g)</span><strong>{summary.dueSoon}</strong></div>
      </div>

      <div className="recurring-toolbar">
        <div className="recurring-filter-group">
          <button
            type="button"
            className={`recurring-filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Tutte
          </button>
          <button
            type="button"
            className={`recurring-filter-btn ${statusFilter === 'active' ? 'active' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            Attive
          </button>
          <button
            type="button"
            className={`recurring-filter-btn ${statusFilter === 'paused' ? 'active' : ''}`}
            onClick={() => setStatusFilter('paused')}
          >
            In pausa
          </button>
        </div>
        <div className="recurring-bulk-actions">
          <button type="button" className="recurring-btn-ghost" onClick={toggleSelectAllFiltered}>
            {filteredItems.length > 0 && filteredItems.every((r) => selectedIds.includes(r.id))
              ? 'Deseleziona visibili'
              : 'Seleziona visibili'}
          </button>
          <button
            type="button"
            className="recurring-btn-ghost"
            disabled={!selectedIds.length || bulkBusy}
            onClick={() => handleBulkSetActive(false)}
          >
            Pausa selezionate
          </button>
          <button
            type="button"
            className="recurring-btn-primary"
            disabled={!selectedIds.length || bulkBusy}
            onClick={() => handleBulkSetActive(true)}
          >
            Riattiva selezionate
          </button>
        </div>
      </div>

      {message.text && <div className={`recurring-message ${message.type}`}>{message.text}</div>}

      {loading ? (
        <div className="recurring-empty">Caricamento ricorrenze...</div>
      ) : filteredItems.length === 0 ? (
        <div className="recurring-empty">Nessuna ricorrenza trovata. Creane una da Nuova Transazione.</div>
      ) : (
        <div className="recurring-list">
          {filteredItems.map((item) => {
            const next = parseRecurringDate(item.nextDate);
            const accountName = accountMap[item.accountId] || item.accountName || 'Conto';
            const categoryName = categoryMap[item.categoryId] || item.categoryName || 'Senza categoria';
            const isSaving = savingId === item.id;
            const isEditing = editingId === item.id;
            const isSelected = selectedIds.includes(item.id);
            return (
              <article key={item.id} className={`recurring-item ${item.active === false ? 'paused' : ''}`}>
                <div className="recurring-item-head">
                  <div>
                    <label className="recurring-select-item">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(item.id)}
                      />
                      <span>Seleziona</span>
                    </label>
                    <h3>{item.description || 'Senza descrizione'}</h3>
                    <p>
                      {item.type === 'income' ? 'Entrata' : 'Spesa'} · {item.frequency === 'weekly' ? 'Settimanale' : 'Mensile'} ·{' '}
                      {accountName} · {categoryName}
                    </p>
                  </div>
                  <div className="recurring-amount">
                    {formatCurrency(item.type === 'expense' ? -Math.abs(Number(item.amount) || 0) : Math.abs(Number(item.amount) || 0), userSettings?.currency || 'EUR')}
                  </div>
                </div>

                <div className="recurring-item-meta">
                  <span>
                    Prossima data: <strong>{next ? next.toLocaleDateString('it-IT') : 'N/D'}</strong> ·{' '}
                    <strong>{getRecurringNextRunLabel(item.nextDate)}</strong>
                  </span>
                  <span className={`pill ${item.active === false ? 'paused' : 'active'}`}>{item.active === false ? 'In pausa' : 'Attiva'}</span>
                </div>

                {isEditing ? (
                  <div className="recurring-edit-grid">
                    <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Descrizione" />
                    <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
                    <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                      <option value="expense">Spesa</option>
                      <option value="income">Entrata</option>
                    </select>
                    <select value={form.frequency} onChange={(e) => setForm((p) => ({ ...p, frequency: e.target.value }))}>
                      <option value="monthly">Mensile</option>
                      <option value="weekly">Settimanale</option>
                    </select>
                    <input type="date" value={form.nextDate} onChange={(e) => setForm((p) => ({ ...p, nextDate: e.target.value }))} />
                    <select value={form.accountId} onChange={(e) => setForm((p) => ({ ...p, accountId: e.target.value }))}>
                      <option value="">Nessun conto</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                    <select value={form.categoryId} onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}>
                      <option value="">Nessuna categoria</option>
                      {categories
                        .filter((c) => (form.type === 'income' ? c.type === 'income' : c.type === 'expense'))
                        .map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                  </div>
                ) : null}

                <div className="recurring-actions">
                  {isEditing ? (
                    <>
                      <button type="button" className="recurring-btn-primary" disabled={isSaving} onClick={handleSaveEdit}>
                        {isSaving ? 'Salvataggio...' : 'Salva'}
                      </button>
                      <button type="button" className="recurring-btn-ghost" disabled={isSaving} onClick={cancelEdit}>
                        Annulla
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="recurring-btn-ghost" disabled={isSaving} onClick={() => startEdit(item)}>
                        Modifica
                      </button>
                      <button type="button" className="recurring-btn-ghost" disabled={isSaving} onClick={() => handleToggleActive(item)}>
                        {item.active === false ? 'Riattiva' : 'Pausa'}
                      </button>
                      <button type="button" className="recurring-btn-danger" disabled={isSaving} onClick={() => handleDelete(item)}>
                        Elimina
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Recurring;
