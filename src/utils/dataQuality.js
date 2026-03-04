export function analyzeDataQuality(
  transactions = [],
  { isTransferTx, dateKey, normalizeDescKey } = {}
) {
  const safeIsTransfer = typeof isTransferTx === 'function'
    ? isTransferTx
    : (tx) => !!(tx?.isTransfer || tx?.transferId);
  const safeDateKey = typeof dateKey === 'function'
    ? dateKey
    : (d) => {
      const dt = d && typeof d.toDate === 'function' ? d.toDate() : new Date(d);
      if (Number.isNaN(dt.getTime())) return '';
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    };
  const safeNormalize = typeof normalizeDescKey === 'function'
    ? normalizeDescKey
    : (v) => String(v || '').trim().toLowerCase();

  const groups = new Map();
  let missingCategory = 0;
  const expenseValues = [];

  for (const tx of transactions) {
    if (safeIsTransfer(tx)) continue;
    const amountRaw = Number(tx?.amount) || 0;
    const type = tx?.type || (amountRaw >= 0 ? 'income' : 'expense');
    const amountAbs = Math.abs(amountRaw).toFixed(2);
    const accKey = String(tx?.accountId || tx?.accountName || '').trim().toLowerCase();
    const key = `${safeDateKey(tx?.date)}|${type}|${amountAbs}|${safeNormalize(tx?.description)}|${accKey}`;
    groups.set(key, (groups.get(key) || 0) + 1);

    const hasCategory = !!(tx?.categoryId || String(tx?.category || tx?.categoryName || '').trim());
    if (type === 'expense' && !hasCategory) missingCategory += 1;
    if (type === 'expense' && Math.abs(amountRaw) > 0) expenseValues.push(Math.abs(amountRaw));
  }

  let duplicateGroups = 0;
  let duplicateCount = 0;
  for (const count of groups.values()) {
    if (count > 1) {
      duplicateGroups += 1;
      duplicateCount += count - 1;
    }
  }

  const avgExpense = expenseValues.length
    ? expenseValues.reduce((sum, n) => sum + n, 0) / expenseValues.length
    : 0;
  const anomalyThreshold = avgExpense > 0 ? avgExpense * 2 : Number.POSITIVE_INFINITY;
  const highExpenseCount = expenseValues.filter((v) => v >= anomalyThreshold).length;

  const issueCount = duplicateCount + missingCategory + highExpenseCount;
  const severity = issueCount >= 8 ? 'high' : issueCount >= 3 ? 'medium' : issueCount > 0 ? 'low' : 'none';

  return {
    duplicateGroups,
    duplicateCount,
    missingCategory,
    highExpenseCount,
    avgExpense,
    anomalyThreshold,
    issueCount,
    severity
  };
}

