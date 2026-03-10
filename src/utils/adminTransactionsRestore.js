function toDateOrNull(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') {
    const d = value.toDate();
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseTransactionsBackupJson(rawText = '') {
  if (!rawText || typeof rawText !== 'string') return { transactions: [], meta: null, error: 'EMPTY' };
  try {
    const parsed = JSON.parse(rawText);
    if (Array.isArray(parsed)) {
      return { transactions: parsed, meta: null, error: null };
    }
    if (parsed && Array.isArray(parsed.transactions)) {
      return {
        transactions: parsed.transactions,
        meta: {
          generatedAt: parsed.generatedAt || null,
          source: parsed.source || null,
          count: Number(parsed.count) || parsed.transactions.length
        },
        error: null
      };
    }
    return { transactions: [], meta: null, error: 'INVALID_SHAPE' };
  } catch {
    return { transactions: [], meta: null, error: 'INVALID_JSON' };
  }
}

export function normalizeRestoreTransactionDetailed(tx, fallbackAccountId = '') {
  if (!tx || typeof tx !== 'object') {
    return { transaction: null, error: 'Riga non valida (formato non oggetto)' };
  }
  const typeCandidate = String(tx.type || '').trim().toLowerCase();
  const rawAmount = Number(tx.amount);
  const amount = Number.isFinite(rawAmount) ? Math.abs(rawAmount) : NaN;
  if (!Number.isFinite(amount) || amount <= 0) {
    return { transaction: null, error: 'Importo non valido o assente' };
  }

  const type =
    typeCandidate === 'income' || typeCandidate === 'expense' || typeCandidate === 'transfer'
      ? typeCandidate
      : rawAmount < 0
      ? 'expense'
      : 'income';

  const description = String(tx.description || tx.title || '').trim() || 'Transazione ripristinata';
  const date = toDateOrNull(tx.date) || toDateOrNull(tx.createdAt) || new Date();

  return {
    transaction: {
      description,
      amount,
      type,
      date,
      accountId: tx.accountId || fallbackAccountId || null,
      categoryId: tx.categoryId || null,
      category: tx.category || tx.categoryName || null,
      subCategoryId: tx.subCategoryId || null,
      subCategory: tx.subCategory || tx.subCategoryName || null,
      notes: tx.notes || '',
      isTransfer: tx.isTransfer === true,
      transferId: tx.transferId || null,
      transferPeerAccountId: tx.transferPeerAccountId || null
    },
    error: null
  };
}

export function normalizeRestoreTransaction(tx, fallbackAccountId = '') {
  return normalizeRestoreTransactionDetailed(tx, fallbackAccountId).transaction;
}
