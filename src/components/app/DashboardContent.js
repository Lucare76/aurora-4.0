import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFinancial } from '../../contexts/FinancialContext';
import { getCurrencySymbol } from '../../utils/currency';
import { getBudgetsByMonth } from '../../services/budgetsService';
import { getBirthdays, getDaysUntilBirthday, calculateAge } from '../../services/birthdaysService';
import { processRecurring } from '../../services/recurringService';
import InsightsSection from './InsightsSection';
import LiveClock from './LiveClock';
import { formatNumber } from '../../utils/format';

function DashboardContent({ setActiveMenu, setPendingFilter }) {
  const { user, userSettings } = useAuth();
  const { transactions = [], accounts = [], categories = [], createTransaction } = useFinancial();
  const cs = getCurrencySymbol(userSettings?.currency);

  const currentMonthIndex = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentMonthNumber = currentMonthIndex + 1;

  useEffect(() => {
    if (!user?.uid) return;
    const key = `aurora_recurring_processed_${new Date().toISOString().split('T')[0]}`;
    if (sessionStorage.getItem(key)) return;

    processRecurring(user.uid, createTransaction)
      .then((count) => {
        if (count > 0) console.log(`✅ Generate ${count} transazioni ricorrenti`);
        sessionStorage.setItem(key, '1');
      })
      .catch((e) => console.error('Errore processing ricorrenti:', e));
  }, [user?.uid, createTransaction]);

  const [budgets, setBudgets] = useState([]);
  const [budgetsLoading, setBudgetsLoading] = useState(false);
  const [budgetsError, setBudgetsError] = useState('');

  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function loadBirthdays() {
      if (!user?.uid) return;
      try {
        const all = await getBirthdays(user.uid);
        const sorted = all
          .map((b) => ({ ...b, daysUntil: getDaysUntilBirthday(b.date) }))
          .filter((b) => b.daysUntil != null)
          .sort((a, b) => a.daysUntil - b.daysUntil)
          .slice(0, 2);
        if (mounted) setUpcomingBirthdays(sorted);
      } catch (e) {
        console.error('Errore caricamento compleanni:', e);
      }
    }
    loadBirthdays();
    return () => {
      mounted = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    let mounted = true;

    async function loadBudgets() {
      if (!user?.uid) return;

      setBudgetsLoading(true);
      setBudgetsError('');
      try {
        const data = await getBudgetsByMonth(user.uid, currentYear, currentMonthNumber);
        if (mounted) setBudgets(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Errore budgets:', e);
        if (mounted) setBudgetsError(e?.message || 'Errore caricamento budgets');
      } finally {
        if (mounted) setBudgetsLoading(false);
      }
    }

    loadBudgets();
    return () => {
      mounted = false;
    };
  }, [user?.uid, currentYear, currentMonthNumber]);

  const parseDate = (date) => {
    if (!date) return new Date();
    if (date && typeof date === 'object' && typeof date.toDate === 'function') return date.toDate();
    if (date instanceof Date) return date;
    return new Date(date);
  };

  const getAmount = (t) => {
    const n = Number(t?.amount);
    return Number.isFinite(n) ? n : 0;
  };

  const getType = (t) => {
    if (t?.type === 'income' || t?.type === 'expense' || t?.type === 'transfer') return t.type;
    return getAmount(t) >= 0 ? 'income' : 'expense';
  };

  const getAccountName = (t) => {
    const acc = accounts.find((a) => a.id === t?.accountId);
    return acc?.name || 'Conto';
  };

  const getCategoryName = (t) => {
    const raw = t?.categoryId || t?.category;
    if (!raw) return 'Senza categoria';

    const found = categories.find((c) => c.id === raw);
    if (found?.name) return found.name;

    if (typeof raw === 'string') return raw;
    return 'Senza categoria';
  };

  const getSubCategoryName = (t) => {
    const raw = t?.subCategoryId || t?.subCategory || t?.subcategory;
    if (!raw) return '';

    const catRaw = t?.categoryId || t?.category;
    const catObj =
      categories.find((c) => c.id === catRaw) ||
      categories.find((c) => (c.name || '').toLowerCase() === String(catRaw || '').toLowerCase());

    const subs = catObj?.subCategories || catObj?.subcategories || catObj?.children || [];
    const found =
      subs.find((s) => s?.id === raw) ||
      subs.find((s) => String(s?.name || '').toLowerCase() === String(raw || '').toLowerCase());

    if (found?.name) return found.name;
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
    return '';
  };

  const monthlyTransactions = transactions.filter((t) => {
    const d = parseDate(t.date);
    return d.getMonth() === currentMonthIndex && d.getFullYear() === currentYear;
  });

  const monthlyIncome = monthlyTransactions
    .filter((t) => getType(t) === 'income')
    .reduce((sum, t) => sum + Math.abs(getAmount(t)), 0);

  const monthlyExpenses = monthlyTransactions
    .filter((t) => getType(t) === 'expense')
    .reduce((sum, t) => sum + Math.abs(getAmount(t)), 0);

  const monthlySavings = monthlyIncome - monthlyExpenses;
  const totalBalance = accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);

  const topMonthlyExpenses = useMemo(() => {
    return monthlyTransactions
      .filter((t) => getType(t) === 'expense')
      .map((t) => ({
        id: t.id,
        description: t.description || getCategoryName(t),
        category: getCategoryName(t),
        account: getAccountName(t),
        amount: Math.abs(getAmount(t)),
        date: parseDate(t.date)
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [monthlyTransactions, getAmount, getType, getCategoryName, getAccountName]);

  const topMonthlyIncomes = useMemo(() => {
    return monthlyTransactions
      .filter((t) => getType(t) === 'income')
      .map((t) => ({
        id: t.id,
        description: t.description || getCategoryName(t),
        category: getCategoryName(t),
        account: getAccountName(t),
        amount: Math.abs(getAmount(t)),
        date: parseDate(t.date)
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [monthlyTransactions, getAmount, getType, getCategoryName, getAccountName]);

  const monthlyExpenseByCategoryKey = monthlyTransactions
    .filter((t) => getType(t) === 'expense')
    .reduce((acc, t) => {
      const key = t?.categoryId || t?.categoryName || t?.category || 'Senza categoria';
      acc[key] = (acc[key] || 0) + Math.abs(getAmount(t));
      return acc;
    }, {});

  const monthlyExpenseByCategoryName = monthlyTransactions
    .filter((t) => getType(t) === 'expense')
    .reduce((acc, t) => {
      const rawName = t?.categoryName || t?.category || '';
      const name = String(rawName).trim().toLowerCase();
      if (!name) return acc;
      acc[name] = (acc[name] || 0) + Math.abs(getAmount(t));
      return acc;
    }, {});

  const budgetByCategoryId = (budgets || []).reduce((acc, b) => {
    if (!b?.categoryId) return acc;
    acc[b.categoryId] = b;
    return acc;
  }, {});

  const budgetByCategoryName = (budgets || []).reduce((acc, b) => {
    const name = String(b?.categoryName || '').trim().toLowerCase();
    if (!name) return acc;
    acc[name] = b;
    return acc;
  }, {});

  const budgetAlerts = categories
    .filter((c) => c?.type === 'expense')
    .map((c) => {
      const byName = budgetByCategoryName[String(c?.name || '').trim().toLowerCase()];
      const b = budgetByCategoryId[c.id] || byName;
      if (!b) return null;

      const key = c.id;
      const label = c.name || b?.categoryName || 'Categoria';
      const budget = Number(b?.amount ?? b?.budget ?? 0) || 0;
      const spent =
        monthlyExpenseByCategoryKey[key] || monthlyExpenseByCategoryName[String(c?.name || '').trim().toLowerCase()] || 0;
      const pct = budget > 0 ? spent / budget : 0;

      let level = 'ok';
      if (budget > 0 && pct >= 1) level = 'over';
      else if (budget > 0 && pct >= 0.9) level = 'danger';
      else if (budget > 0 && pct >= 0.75) level = 'warn';
      else if (budget > 0 && pct >= 0.5) level = 'watch';

      return { key, label, budget, spent, pct, level };
    })
    .filter(Boolean)
    .sort((a, b) => b.pct - a.pct);

  const monthlyUncategorizedCount = monthlyTransactions.filter((t) => {
    const cat = t?.categoryId || t?.category;
    const isTransfer = !!(t?.isTransfer || t?.transferId || t?.type === 'transfer');
    return !cat && !isTransfer;
  }).length;

  const todayActions = useMemo(() => {
    const items = [];

    if (monthlyIncome > 0 && monthlyExpenses > monthlyIncome) {
      items.push({
        id: 'cashflow',
        title: 'Spese mese superiori alle entrate',
        detail: `Uscite ${cs} ${formatNumber(monthlyExpenses)} vs entrate ${cs} ${formatNumber(monthlyIncome)}`,
        cta: 'Apri Reports',
        menu: 'reports',
        level: 'danger'
      });
    }

    if (monthlyUncategorizedCount > 0) {
      items.push({
        id: 'uncategorized',
        title: 'Transazioni da categorizzare',
        detail: `${monthlyUncategorizedCount} movimenti del mese senza categoria`,
        cta: 'Apri Transazioni',
        menu: 'transactions',
        filter: 'uncategorized',
        level: 'warn'
      });
    }

    const criticalBudget = budgetAlerts.find((a) => a.level === 'over' || a.level === 'danger' || a.level === 'warn');
    if (criticalBudget) {
      items.push({
        id: 'budget',
        title: 'Budget da monitorare',
        detail: `${criticalBudget.label}: ${Math.round((criticalBudget.pct || 0) * 100)}% utilizzato`,
        cta: 'Apri Budget',
        menu: 'budgets',
        level: criticalBudget.level === 'over' ? 'danger' : 'warn'
      });
    }

    const nearBirthday = upcomingBirthdays.find((b) => (b.daysUntil ?? 999) <= 7);
    if (nearBirthday) {
      items.push({
        id: 'birthday',
        title: 'Compleanno imminente',
        detail: `${nearBirthday.name} ${nearBirthday.daysUntil === 0 ? 'oggi' : `tra ${nearBirthday.daysUntil} giorni`}`,
        cta: 'Apri Compleanni',
        menu: 'birthdays',
        level: 'info'
      });
    }

    if (items.length === 0) {
      items.push({
        id: 'ok',
        title: 'Situazione sotto controllo',
        detail: 'Nessuna urgenza: puoi registrare nuove operazioni o controllare i report.',
        cta: 'Aggiungi Transazione',
        menu: 'transactions',
        level: 'ok'
      });
    }

    return items.slice(0, 4);
  }, [
    monthlyIncome,
    monthlyExpenses,
    monthlyUncategorizedCount,
    budgetAlerts,
    upcomingBirthdays,
    cs
  ]);

  return (
    <div className="content-page">
      <div className="aurora-background">
        <div className="aurora-layer-1"></div>
        <div className="aurora-layer-2"></div>
        <div className="aurora-layer-3"></div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <div className="header-main">
            <h1>Buongiorno, {user?.displayName?.split(' ')[0] || 'Utente'}! 👋</h1>
            <LiveClock />
          </div>
          <button className="quick-add-btn" onClick={() => setActiveMenu('transactions')} type="button">
            + Transazione
          </button>
          <div className="header-stats mobile-only-stats">
            <div className="mini-stat">
              <div className="mini-value mini-value-income">
                {cs} {formatNumber(monthlyIncome)}
              </div>
              <div className="mini-label">Entrate Mese</div>
            </div>
            <div className="mini-stat">
              <div className="mini-value mini-value-expense">
                {cs} {formatNumber(monthlyExpenses)}
              </div>
              <div className="mini-label">Uscite Mese</div>
            </div>
          </div>
        </div>

        <div className="financial-overview">
          <div className="finance-card total-balance">
            <div className="card-content">
              <h3>Saldo Totale</h3>
              <div className="amount">
                {cs} {formatNumber(totalBalance)}
              </div>
              <div className="trend positive">{accounts.length} conti attivi</div>
            </div>
          </div>

          <div className="finance-card cash-flow">
            <div className="card-content">
              <h3>Cash Flow Mensile</h3>
              <div className="amount" style={{ color: monthlySavings >= 0 ? '#10b981' : '#ef4444' }}>
                {monthlySavings < 0 ? '−' : ''}{cs} {formatNumber(monthlySavings)}
              </div>
              <div className="cashflow-detail">
                <span className="cf-income">
                  +{cs} {formatNumber(monthlyIncome)}
                </span>
                <span className="cf-expense">
                  −{cs} {formatNumber(monthlyExpenses)}
                </span>
              </div>
            </div>
          </div>

          <div className="finance-card budget">
            <div className="card-graphic">
              <div className="progress-ring">
                <div className="progress-fill" style={{ '--progress': '75%' }} />
              </div>
            </div>
            <div className="card-content">
              <h3>Transazioni Mese</h3>
              <div className="amount">{monthlyTransactions.length} operazioni</div>
              <div className="trend">{transactions.length} totali</div>
            </div>
          </div>
        </div>

        <InsightsSection
          transactions={transactions}
          categories={categories}
          accounts={accounts}
          monthlyIncome={monthlyIncome}
          monthlyExpenses={monthlyExpenses}
          currentMonthIndex={currentMonthIndex}
          currentYear={currentYear}
          cs={cs}
        />

        <div className="section">
          <h2 className="section-title">Top 5 Spese & Entrate del Mese</h2>
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Spese principali</div>
              {topMonthlyExpenses.length === 0 ? (
                <div style={{ opacity: 0.7 }}>Nessuna spesa questo mese.</div>
              ) : (
                topMonthlyExpenses.map((t, idx) => (
                  <div key={`${t.id}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.description}
                      </div>
                      <div style={{ opacity: 0.7, fontSize: 12 }}>
                        {t.category} • {t.account}
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, color: '#ef4444', whiteSpace: 'nowrap' }}>
                      −{cs} {formatNumber(t.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Entrate principali</div>
              {topMonthlyIncomes.length === 0 ? (
                <div style={{ opacity: 0.7 }}>Nessuna entrata questo mese.</div>
              ) : (
                topMonthlyIncomes.map((t, idx) => (
                  <div key={`${t.id}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.description}
                      </div>
                      <div style={{ opacity: 0.7, fontSize: 12 }}>
                        {t.category} • {t.account}
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, color: '#10b981', whiteSpace: 'nowrap' }}>
                      +{cs} {formatNumber(t.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">Azioni Consigliate Oggi</h2>
          <div className="today-actions-grid">
            {todayActions.map((a) => (
              <div key={a.id} className={`today-action-card ${a.level}`}>
                <div>
                  <div className="today-action-title">{a.title}</div>
                  <div className="today-action-detail">{a.detail}</div>
                </div>
                <button type="button" className="today-action-btn" onClick={() => { if (a.filter) setPendingFilter(a.filter); setActiveMenu(a.menu); }}>
                  {a.cta}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">Alert Budget 📌</h2>

          {budgetsLoading ? (
            <div className="empty-state">
              <p>Caricamento budget...</p>
            </div>
          ) : budgetsError ? (
            <div className="empty-state">
              <p style={{ color: '#dc2626' }}>Errore: {budgetsError}</p>
            </div>
          ) : !budgets?.length ? (
            <div className="empty-state">
              <p>Nessun budget impostato per questo mese.</p>
              <p style={{ opacity: 0.8, marginTop: 6 }}>Vai su "Budget" per aggiungerne uno.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {budgetAlerts.slice(0, 6).map((a) => {
                const badge =
                  a.level === 'over'
                    ? '100%+ SUPERATO'
                    : a.level === 'danger'
                    ? '90%+ ALTO'
                    : a.level === 'warn'
                    ? '75%+ ATTENZIONE'
                    : a.level === 'watch'
                    ? '50%+ MONITORA'
                    : 'OK';
                const border =
                  a.level === 'over'
                    ? '2px solid #ef4444'
                    : a.level === 'danger'
                    ? '2px solid #f97316'
                    : a.level === 'warn'
                    ? '2px solid #f59e0b'
                    : a.level === 'watch'
                    ? '2px solid #eab308'
                    : '2px solid #22c55e';

                return (
                  <div
                    key={a.key}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border,
                      borderRadius: 12,
                      padding: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontWeight: 700 }}>
                        {a.label}
                        <span style={{ marginLeft: 10, fontWeight: 600, opacity: 0.9 }}>{badge}</span>
                      </div>
                      <div style={{ opacity: 0.85, marginTop: 4 }}>
                        Speso: {cs} {formatNumber(a.spent)} / Budget: {cs} {formatNumber(a.budget)}
                      </div>
                    </div>

                    <div style={{ fontWeight: 800, fontSize: 16 }}>
                      {a.budget > 0 ? `${Math.round(a.pct * 100)}%` : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {upcomingBirthdays.length > 0 && (
          <div className="section">
            <h2 className="section-title">Prossimi Compleanni 🎂</h2>
            <div style={{ display: 'grid', gap: 10 }}>
              {upcomingBirthdays.map((b) => {
                const age = b.birthYear ? calculateAge(b.date, b.birthYear) : null;
                const nextAge = age != null ? age + 1 : null;
                return (
                  <div
                    key={b.id}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: b.daysUntil <= 7 ? '2px solid #ec4899' : '2px solid #8b5cf6',
                      borderRadius: 12,
                      padding: 14,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: b.daysUntil <= 7 ? 'rgba(236,72,153,0.15)' : 'rgba(139,92,246,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                        flexShrink: 0
                      }}
                    >
                      🎂
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{b.name}</div>
                      <div style={{ opacity: 0.8, fontSize: 13, marginTop: 2 }}>
                        {b.date}
                        {nextAge != null ? ` — compie ${nextAge} anni` : ''}
                      </div>
                    </div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 14,
                        color: b.daysUntil <= 7 ? '#ec4899' : '#8b5cf6',
                        textAlign: 'right',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {b.daysUntil === 0 ? 'Oggi!' : b.daysUntil === 1 ? 'Domani' : `tra ${b.daysUntil} gg`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default DashboardContent;
