export function computeCategorizationScore30(input = {}) {
  const transactions = Array.isArray(input.transactions) ? input.transactions : [];
  const parseDate = typeof input.parseDate === 'function' ? input.parseDate : (v) => new Date(v);

  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 29);
  start.setHours(0, 0, 0, 0);

  const scoped = transactions.filter((t) => {
    const d = parseDate(t?.date);
    return d instanceof Date && !Number.isNaN(d.getTime()) && d >= start && d <= now;
  });

  const total = scoped.length;
  if (total === 0) {
    return {
      level: 'ok',
      message: 'Nessuna transazione negli ultimi 30 giorni.',
      total: 0,
      categorized: 0,
      uncategorized: 0,
      scorePct: 100
    };
  }

  const uncategorized = scoped.filter((t) => {
    const isTransfer = !!(t?.isTransfer || t?.transferId || t?.type === 'transfer');
    if (isTransfer) return false;
    const hasCategory = !!(t?.categoryId || String(t?.category || t?.categoryName || '').trim());
    return !hasCategory;
  }).length;

  const categorized = Math.max(0, total - uncategorized);
  const scorePct = (categorized / total) * 100;

  let level = 'ok';
  if (scorePct < 85) level = 'critical';
  else if (scorePct < 95) level = 'warn';

  const message =
    level === 'critical'
      ? 'Molte transazioni da categorizzare.'
      : level === 'warn'
      ? 'Qualche transazione senza categoria.'
      : 'Categorizzazione ottima.';

  return {
    level,
    message,
    total,
    categorized,
    uncategorized,
    scorePct
  };
}

