const EPS = 0.0001;

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function toDateKey(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function computeTransactionAnomalies(input = {}) {
  const transactions = Array.isArray(input.transactions) ? input.transactions : [];
  const parseDate = typeof input.parseDate === 'function' ? input.parseDate : (v) => new Date(v);
  const getAmount = typeof input.getAmount === 'function' ? input.getAmount : (t) => Number(t?.amount) || 0;
  const getType = typeof input.getType === 'function' ? input.getType : (t) => (getAmount(t) >= 0 ? 'income' : 'expense');
  const getCategoryName = typeof input.getCategoryName === 'function' ? input.getCategoryName : (t) => t?.categoryName || t?.category || 'Senza categoria';
  const getAccountName = typeof input.getAccountName === 'function' ? input.getAccountName : (t) => t?.accountName || 'Conto';

  const monthly = transactions
    .map((t) => ({ ...t, _amountAbs: Math.abs(getAmount(t)), _dateObj: parseDate(t?.date) }))
    .filter((t) => t._dateObj instanceof Date && !Number.isNaN(t._dateObj.getTime()));

  const duplicatesByKey = new Map();
  monthly.forEach((t) => {
    const key = [
      normalizeText(t?.description || ''),
      toDateKey(t._dateObj),
      String(Math.round(t._amountAbs * 100)),
      String(t?.accountId || ''),
      String(t?.type || getType(t))
    ].join('|');
    const list = duplicatesByKey.get(key) || [];
    list.push(t);
    duplicatesByKey.set(key, list);
  });

  const duplicateGroups = Array.from(duplicatesByKey.values())
    .filter((rows) => rows.length >= 2)
    .map((rows) => ({
      kind: 'duplicate',
      severity: rows.length >= 3 ? 'high' : 'medium',
      title: 'Possibile duplicato',
      detail: `${rows[0]?.description || 'Transazione'} x${rows.length} nello stesso giorno`,
      category: getCategoryName(rows[0]),
      account: getAccountName(rows[0]),
      amount: rows[0]._amountAbs,
      count: rows.length,
      transactionIds: rows.map((r) => r.id).filter(Boolean)
    }));

  const expenses = monthly.filter((t) => getType(t) === 'expense');
  const byCategory = new Map();
  expenses.forEach((t) => {
    const key = normalizeText(getCategoryName(t));
    const list = byCategory.get(key) || [];
    list.push(t);
    byCategory.set(key, list);
  });

  const spikes = [];
  byCategory.forEach((rows) => {
    if (rows.length < 4) return;
    const sorted = rows.map((r) => r._amountAbs).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] || 0;
    if (median <= EPS) return;
    rows.forEach((r) => {
      if (r._amountAbs >= median * 2.5 && r._amountAbs - median >= 20) {
        spikes.push({
          kind: 'spike',
          severity: r._amountAbs >= median * 4 ? 'high' : 'medium',
          title: 'Spesa anomala',
          detail: `${r?.description || getCategoryName(r)} (${Math.round((r._amountAbs / median) * 10) / 10}x media categoria)`,
          category: getCategoryName(r),
          account: getAccountName(r),
          amount: r._amountAbs,
          baseline: median,
          transactionIds: r?.id ? [r.id] : []
        });
      }
    });
  });

  const all = [...duplicateGroups, ...spikes]
    .sort((a, b) => {
      const sev = (v) => (v === 'high' ? 2 : v === 'medium' ? 1 : 0);
      const s = sev(b.severity) - sev(a.severity);
      if (s !== 0) return s;
      return (Number(b.amount) || 0) - (Number(a.amount) || 0);
    })
    .slice(0, 6);

  return {
    total: all.length,
    highCount: all.filter((a) => a.severity === 'high').length,
    items: all
  };
}

