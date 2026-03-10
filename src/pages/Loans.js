import React, { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/app/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { useFinancial } from '../contexts/FinancialContext';
import { addDoc, collection, db, deleteDoc, doc, getDocs, query, serverTimestamp, where } from '../services/firebase';
import { logAdminAuditEvent } from '../services/adminAuditService';
import { formatCurrency } from '../utils/currency';
import { normalizeRestoreTransactionDetailed, parseTransactionsBackupJson } from '../utils/adminTransactionsRestore';
import './Loans.css';

const ADMIN_ACTION_COOLDOWN_MS = 15000;

function Loans() {
  const { isAdmin, user, userSettings } = useAuth();
  const canRunAdminOps = !!(isAdmin && user?.uid);
  const { transactions = [], accounts = [], createTransaction, deleteAllTransactions } = useFinancial();
  const [deletingAll, setDeletingAll] = useState(false);
  const [restoringAll, setRestoringAll] = useState(false);
  const [deleteCooldownUntil, setDeleteCooldownUntil] = useState(0);
  const [restoreCooldownUntil, setRestoreCooldownUntil] = useState(0);
  const [savingLoan, setSavingLoan] = useState(false);
  const [loadingLoans, setLoadingLoans] = useState(true);
  const [loans, setLoans] = useState([]);
  const [restoreFileName, setRestoreFileName] = useState('');
  const [restoreMeta, setRestoreMeta] = useState(null);
  const [restoreCandidates, setRestoreCandidates] = useState([]);
  const [restoreSkippedRows, setRestoreSkippedRows] = useState([]);
  const [restoreError, setRestoreError] = useState('');
  const [form, setForm] = useState({
    title: '',
    borrowerName: '',
    amount: '',
    startDate: '',
    dueDate: '',
    notes: ''
  });

  const sortedLoans = useMemo(() => {
    const toMs = (value) => {
      if (!value) return 0;
      if (typeof value?.toDate === 'function') return value.toDate().getTime();
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? 0 : d.getTime();
    };
    return [...loans].sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
  }, [loans]);

  useEffect(() => {
    const loadLoans = async () => {
      if (!user?.uid || !isAdmin) return;
      setLoadingLoans(true);
      try {
        const q = query(collection(db, 'loans'), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setLoans(rows);
      } catch (error) {
        console.error('Errore caricamento prestiti:', error);
      } finally {
        setLoadingLoans(false);
      }
    };
    loadLoans();
  }, [isAdmin, user?.uid]);

  const resetForm = () => {
    setForm({
      title: '',
      borrowerName: '',
      amount: '',
      startDate: '',
      dueDate: '',
      notes: ''
    });
  };

  const handleCreateLoan = async () => {
    if (!canRunAdminOps || savingLoan) return;
    const amount = Number(String(form.amount || '').replace(',', '.'));
    if (!form.title.trim()) {
      alert('Inserisci un titolo per il prestito.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Importo non valido.');
      return;
    }
    setSavingLoan(true);
    try {
      const payload = {
        userId: user.uid,
        title: form.title.trim(),
        borrowerName: form.borrowerName.trim(),
        amount,
        startDate: form.startDate || null,
        dueDate: form.dueDate || null,
        notes: form.notes.trim(),
        createdAt: serverTimestamp()
      };
      const ref = await addDoc(collection(db, 'loans'), payload);
      setLoans((prev) => [{ id: ref.id, ...payload, createdAt: new Date() }, ...prev]);
      await logAdminAuditEvent({
        adminUid: user.uid,
        action: 'loan_create',
        target: ref.id,
        details: { title: payload.title, amount: payload.amount }
      });
      resetForm();
    } catch (error) {
      console.error('Errore creazione prestito:', error);
      alert(`Errore creazione prestito: ${error?.message || 'sconosciuto'}`);
    } finally {
      setSavingLoan(false);
    }
  };

  const handleDeleteLoan = async (loanId) => {
    if (!canRunAdminOps || !loanId) return;
    if (!window.confirm('Eliminare questo prestito?')) return;
    try {
      await deleteDoc(doc(db, 'loans', loanId));
      setLoans((prev) => prev.filter((l) => l.id !== loanId));
      await logAdminAuditEvent({
        adminUid: user.uid,
        action: 'loan_delete',
        target: loanId
      });
    } catch (error) {
      console.error('Errore eliminazione prestito:', error);
      alert(`Errore eliminazione prestito: ${error?.message || 'sconosciuto'}`);
    }
  };

  const handleDeleteAllTransactions = async () => {
    if (!canRunAdminOps) {
      await logAdminAuditEvent({
        adminUid: user?.uid || '',
        action: 'transactions_mass_delete_blocked',
        target: 'transactions',
        details: { reason: 'not_admin_or_no_user' }
      });
      return;
    }
    if (deletingAll) return;
    const now = Date.now();
    if (deleteCooldownUntil > now) {
      const remaining = Math.ceil((deleteCooldownUntil - now) / 1000);
      await logAdminAuditEvent({
        adminUid: user?.uid || '',
        action: 'transactions_mass_delete_blocked',
        target: 'transactions',
        details: { reason: 'cooldown', remainingSeconds: remaining }
      });
      alert(`Attendi ${remaining}s prima di ripetere l'azione.`);
      return;
    }
    if ((transactions || []).length === 0) {
      alert('Nessuna transazione da eliminare.');
      return;
    }

    const firstConfirm = window.confirm(
      `Stai per eliminare TUTTE le transazioni (${transactions.length}). L'azione e irreversibile.`
    );
    if (!firstConfirm) return;

    const phrase = window.prompt('Per confermare, scrivi esattamente: ELIMINA TUTTE');
    if (phrase !== 'ELIMINA TUTTE') {
      await logAdminAuditEvent({
        adminUid: user?.uid || '',
        action: 'transactions_mass_delete_blocked',
        target: 'transactions',
        details: { reason: 'invalid_confirmation_phrase' }
      });
      alert('Conferma testuale non valida. Operazione annullata.');
      return;
    }

    const secondConfirm = window.confirm('Conferma finale: procedere con eliminazione completa?');
    if (!secondConfirm) {
      await logAdminAuditEvent({
        adminUid: user?.uid || '',
        action: 'transactions_mass_delete_blocked',
        target: 'transactions',
        details: { reason: 'final_confirmation_cancelled' }
      });
      return;
    }

    setDeleteCooldownUntil(Date.now() + ADMIN_ACTION_COOLDOWN_MS);
    setDeletingAll(true);
    try {
      const safeDate = (value) => {
        if (!value) return null;
        if (typeof value?.toDate === 'function') {
          const d = value.toDate();
          return Number.isNaN(d.getTime()) ? null : d.toISOString();
        }
        if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? value : d.toISOString();
      };

      const backupPayload = {
        generatedAt: new Date().toISOString(),
        source: 'aurora_loans_admin_mass_delete',
        userId: user?.uid || null,
        count: transactions.length,
        transactions: (transactions || []).map((tx) => ({
          ...tx,
          date: safeDate(tx?.date),
          createdAt: safeDate(tx?.createdAt),
          updatedAt: safeDate(tx?.updatedAt)
        }))
      };

      const backupBlob = new Blob([JSON.stringify(backupPayload, null, 2)], {
        type: 'application/json;charset=utf-8'
      });
      const backupUrl = URL.createObjectURL(backupBlob);
      const backupLink = document.createElement('a');
      backupLink.href = backupUrl;
      backupLink.download = `aurora-transazioni-backup-prima-delete-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
      backupLink.click();
      URL.revokeObjectURL(backupUrl);

      const result = await deleteAllTransactions();
      await logAdminAuditEvent({
        adminUid: user?.uid || '',
        action: 'transactions_mass_delete',
        target: 'transactions',
        details: { before: result.before, deleted: result.deleted, after: result.after }
      });
      alert(
        `Eliminazione completata.\nPrima: ${result.before}\nEliminate: ${result.deleted}\nResidue: ${result.after}`
      );
    } catch (error) {
      console.error('Errore eliminazione massiva transazioni:', error);
      await logAdminAuditEvent({
        adminUid: user?.uid || '',
        action: 'transactions_mass_delete_failed',
        target: 'transactions',
        details: { error: error?.message || 'unknown' }
      });
      alert(`Errore eliminazione massiva: ${error?.message || 'sconosciuto'}`);
    } finally {
      setDeletingAll(false);
    }
  };

  const handleRestoreFileSelected = async (event) => {
    const file = event?.target?.files?.[0];
    setRestoreCandidates([]);
    setRestoreSkippedRows([]);
    setRestoreMeta(null);
    setRestoreError('');
    setRestoreFileName(file?.name || '');
    if (!file) return;

    try {
      const rawText = await file.text();
      const parsed = parseTransactionsBackupJson(rawText);
      if (parsed.error) {
        setRestoreError(`Backup non valido (${parsed.error}).`);
        return;
      }
      const fallbackAccountId = accounts?.[0]?.id || null;
      const normalized = [];
      const skipped = [];
      parsed.transactions.forEach((tx, idx) => {
        const detailed = normalizeRestoreTransactionDetailed(tx, fallbackAccountId);
        if (!detailed.transaction) {
          skipped.push({
            stage: 'parse',
            row: idx + 1,
            description: String(tx?.description || tx?.title || '').trim() || '(senza descrizione)',
            reason: detailed.error || 'Riga non valida'
          });
          return;
        }
        normalized.push({
          payload: detailed.transaction,
          row: idx + 1,
          description: detailed.transaction.description
        });
      });

      setRestoreMeta({
        sourceCount: parsed.transactions.length,
        validCount: normalized.length,
        skippedCount: skipped.length,
        generatedAt: parsed.meta?.generatedAt || null,
        source: parsed.meta?.source || null
      });
      setRestoreSkippedRows(skipped);
      setRestoreCandidates(normalized);
    } catch (error) {
      console.error('Errore lettura backup transazioni:', error);
      setRestoreError('Impossibile leggere il file selezionato.');
    }
  };

  const handleRestoreTransactions = async () => {
    if (!canRunAdminOps) {
      await logAdminAuditEvent({
        adminUid: user?.uid || '',
        action: 'transactions_restore_blocked',
        target: 'transactions',
        details: { reason: 'not_admin_or_no_user' }
      });
      return;
    }
    if (restoringAll) return;
    const now = Date.now();
    if (restoreCooldownUntil > now) {
      const remaining = Math.ceil((restoreCooldownUntil - now) / 1000);
      await logAdminAuditEvent({
        adminUid: user?.uid || '',
        action: 'transactions_restore_blocked',
        target: 'transactions',
        details: { reason: 'cooldown', remainingSeconds: remaining }
      });
      alert(`Attendi ${remaining}s prima di ripetere il ripristino.`);
      return;
    }
    if (restoreCandidates.length === 0) {
      alert('Nessuna transazione valida da ripristinare.');
      return;
    }

    const firstConfirm = window.confirm(
      `Stai per ripristinare ${restoreCandidates.length} transazioni. Continuare?`
    );
    if (!firstConfirm) return;

    const phrase = window.prompt('Per confermare, scrivi esattamente: RIPRISTINA TRANSAZIONI');
    if (phrase !== 'RIPRISTINA TRANSAZIONI') {
      await logAdminAuditEvent({
        adminUid: user?.uid || '',
        action: 'transactions_restore_blocked',
        target: 'transactions',
        details: { reason: 'invalid_confirmation_phrase' }
      });
      alert('Conferma testuale non valida. Operazione annullata.');
      return;
    }

    setRestoreCooldownUntil(Date.now() + ADMIN_ACTION_COOLDOWN_MS);
    setRestoringAll(true);
    try {
      let imported = 0;
      let skipped = 0;
      const skippedOnCreate = [];
      for (const candidate of restoreCandidates) {
        try {
          await createTransaction(candidate.payload);
          imported += 1;
        } catch (error) {
          const message = String(error?.message || '');
          const categoryMismatch = message.toLowerCase().includes('categoria non coerente');
          if (categoryMismatch) {
            try {
              const fallbackPayload = {
                ...candidate.payload,
                categoryId: null,
                category: null,
                subCategoryId: null,
                subCategory: null
              };
              await createTransaction(fallbackPayload);
              imported += 1;
              continue;
            } catch (retryError) {
              skipped += 1;
              skippedOnCreate.push({
                stage: 'create',
                row: candidate.row,
                description: candidate.description || '(senza descrizione)',
                reason: `Retry senza categoria fallito: ${retryError?.message || 'errore sconosciuto'}`
              });
              console.error('Ripristino transazione fallito anche dopo retry senza categoria:', retryError);
              continue;
            }
          }
          skipped += 1;
          skippedOnCreate.push({
            stage: 'create',
            row: candidate.row,
            description: candidate.description || '(senza descrizione)',
            reason: message || 'Errore creazione transazione'
          });
          console.error('Ripristino transazione fallito:', error);
        }
      }
      const finalSkippedRows = [...(restoreSkippedRows || []), ...skippedOnCreate];
      setRestoreSkippedRows(finalSkippedRows);
      setRestoreMeta((prev) =>
        prev
          ? {
              ...prev,
              importedCount: imported,
              createSkippedCount: skipped,
              totalSkippedCount: finalSkippedRows.length
            }
          : prev
      );

      await logAdminAuditEvent({
        adminUid: user?.uid || '',
        action: 'transactions_restore',
        target: 'transactions',
        details: {
          imported,
          skipped: finalSkippedRows.length,
          sourceCount: restoreMeta?.sourceCount || restoreCandidates.length,
          fileName: restoreFileName || null,
          skippedPreview: finalSkippedRows.slice(0, 20)
        }
      });

      alert(`Ripristino completato.\nImportate: ${imported}\nSaltate: ${finalSkippedRows.length}`);
    } catch (error) {
      console.error('Errore ripristino transazioni:', error);
      await logAdminAuditEvent({
        adminUid: user?.uid || '',
        action: 'transactions_restore_failed',
        target: 'transactions',
        details: { error: error?.message || 'unknown' }
      });
      alert(`Errore ripristino: ${error?.message || 'sconosciuto'}`);
    } finally {
      setRestoringAll(false);
    }
  };

  if (!canRunAdminOps) {
    return (
      <div className="content-page">
        <div className="dashboard-content loans-page">
          <PageHeader title="Prestiti" subtitle="Sezione riservata agli admin." />
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

      <div className="dashboard-content loans-page">
      <PageHeader
        title="Prestiti"
        subtitle="Sezione admin. Qui puoi gestire operazioni straordinarie legate ai prestiti."
      />

      <div className="section" style={{ maxWidth: 980 }}>
        <h2 className="section-title">Nuovo Prestito</h2>
        <div className="loans-form-grid">
          <input
            type="text"
            placeholder="Titolo prestito"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          />
          <input
            type="text"
            placeholder="Intestatario / Beneficiario"
            value={form.borrowerName}
            onChange={(e) => setForm((prev) => ({ ...prev, borrowerName: e.target.value }))}
          />
          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Importo"
            value={form.amount}
            onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
          />
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
          />
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
          />
          <input
            type="text"
            placeholder="Note"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          />
        </div>
        <div style={{ marginTop: 12 }}>
          <button type="button" className="btn-save-settings" onClick={handleCreateLoan} disabled={savingLoan}>
            {savingLoan ? 'Salvataggio...' : 'Aggiungi prestito'}
          </button>
        </div>
      </div>

      <div className="section" style={{ maxWidth: 980 }}>
        <h2 className="section-title">Elenco Prestiti</h2>
        {loadingLoans ? (
          <p>Caricamento prestiti...</p>
        ) : sortedLoans.length === 0 ? (
          <p>Nessun prestito inserito.</p>
        ) : (
          <div className="loans-list">
            {sortedLoans.map((loan) => (
              <div key={loan.id} className="loans-item">
                <div>
                  <div className="loans-item-title">{loan.title}</div>
                  <div className="loans-item-meta">
                    {loan.borrowerName ? `Intestatario: ${loan.borrowerName}` : 'Intestatario: -'}
                  </div>
                  <div className="loans-item-meta">
                    Inizio: {loan.startDate || '-'} | Scadenza: {loan.dueDate || '-'}
                  </div>
                  {loan.notes ? <div className="loans-item-meta">Note: {loan.notes}</div> : null}
                </div>
                <div className="loans-item-side">
                  <div className="loans-item-amount">
                    {formatCurrency(Number(loan.amount) || 0, userSettings?.currency || 'EUR')}
                  </div>
                  <button type="button" className="btn-secondary-settings" onClick={() => handleDeleteLoan(loan.id)}>
                    Elimina
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section" style={{ maxWidth: 820 }}>
        <h2 className="section-title">Operazioni Straordinarie</h2>
        <p style={{ opacity: 0.9 }}>
          Usa questa area con cautela. Le azioni in questa sezione possono avere impatto diretto sui dati.
        </p>
        <div
          style={{
            marginTop: 12,
            border: '1px solid rgba(239,68,68,0.45)',
            background: 'rgba(239,68,68,0.08)',
            borderRadius: 12,
            padding: 14
          }}
        >
          <div style={{ fontWeight: 700 }}>Elimina tutte le transazioni</div>
          <div style={{ marginTop: 6, opacity: 0.9 }}>
            Transazioni attuali: <strong>{transactions.length}</strong>
          </div>
          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              className="delete-confirm-btn"
              onClick={handleDeleteAllTransactions}
              disabled={deletingAll}
            >
              {deletingAll ? 'Eliminazione in corso...' : 'Elimina tutte le transazioni'}
            </button>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            border: '1px solid rgba(59,130,246,0.45)',
            background: 'rgba(59,130,246,0.08)',
            borderRadius: 12,
            padding: 14
          }}
        >
          <div style={{ fontWeight: 700 }}>Ripristina transazioni da backup JSON</div>
          <div style={{ marginTop: 8 }}>
            <input type="file" accept="application/json,.json" onChange={handleRestoreFileSelected} />
          </div>
          {restoreFileName ? <div style={{ marginTop: 8 }}>File: {restoreFileName}</div> : null}
          {restoreError ? <div style={{ marginTop: 8, color: '#fca5a5' }}>{restoreError}</div> : null}
          {restoreMeta ? (
            <div style={{ marginTop: 8, opacity: 0.95 }}>
              Trovate: <strong>{restoreMeta.sourceCount}</strong> | Valide: <strong>{restoreMeta.validCount}</strong> |
              Scartate: <strong>{restoreMeta.skippedCount}</strong>
              {typeof restoreMeta.importedCount === 'number' ? (
                <>
                  {' '}
                  | Importate: <strong>{restoreMeta.importedCount}</strong> | Scarti finali:{' '}
                  <strong>{restoreMeta.totalSkippedCount || 0}</strong>
                </>
              ) : null}
              {restoreMeta.generatedAt ? ` | Backup: ${restoreMeta.generatedAt}` : ''}
            </div>
          ) : null}
          {restoreSkippedRows.length > 0 ? (
            <details style={{ marginTop: 10 }}>
              <summary>
                Dettaglio righe scartate ({restoreSkippedRows.length})
              </summary>
              <div style={{ marginTop: 8, maxHeight: 180, overflow: 'auto', fontSize: 13 }}>
                {restoreSkippedRows.slice(0, 30).map((item, idx) => (
                  <div key={`skip-${idx}`} style={{ marginBottom: 6 }}>
                    Riga {item.row} - {item.description} - motivo: {item.reason}
                  </div>
                ))}
                {restoreSkippedRows.length > 30 ? (
                  <div>...altre {restoreSkippedRows.length - 30} righe non mostrate</div>
                ) : null}
              </div>
            </details>
          ) : null}
          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              className="btn-save-settings"
              onClick={handleRestoreTransactions}
              disabled={restoringAll || restoreCandidates.length === 0}
            >
              {restoringAll ? 'Ripristino in corso...' : 'Ripristina transazioni'}
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

export default Loans;
