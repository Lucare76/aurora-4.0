import {
  normalizeRestoreTransaction,
  normalizeRestoreTransactionDetailed,
  parseTransactionsBackupJson
} from './adminTransactionsRestore';

describe('adminTransactionsRestore', () => {
  it('parses payload with transactions root object', () => {
    const raw = JSON.stringify({
      generatedAt: '2026-03-09T10:00:00.000Z',
      source: 'aurora_loans_admin_mass_delete',
      count: 2,
      transactions: [{ amount: 10 }, { amount: 20 }]
    });
    const parsed = parseTransactionsBackupJson(raw);
    expect(parsed.error).toBe(null);
    expect(parsed.transactions).toHaveLength(2);
    expect(parsed.meta?.source).toBe('aurora_loans_admin_mass_delete');
  });

  it('returns error for invalid json', () => {
    const parsed = parseTransactionsBackupJson('{not-valid');
    expect(parsed.error).toBe('INVALID_JSON');
    expect(parsed.transactions).toHaveLength(0);
  });

  it('normalizes a valid transaction and applies fallback account', () => {
    const tx = normalizeRestoreTransaction(
      {
        description: 'Spesa test',
        amount: -45.2,
        date: '2026-03-08T10:30:00.000Z',
        category: 'Casa'
      },
      'acc_fallback'
    );
    expect(tx).toBeTruthy();
    expect(tx.type).toBe('expense');
    expect(tx.amount).toBe(45.2);
    expect(tx.accountId).toBe('acc_fallback');
    expect(tx.date instanceof Date).toBe(true);
  });

  it('returns null for invalid amount', () => {
    const tx = normalizeRestoreTransaction({
      description: 'No amount',
      amount: 0
    });
    expect(tx).toBe(null);
  });

  it('returns a detailed reason for invalid rows', () => {
    const detailed = normalizeRestoreTransactionDetailed({ description: 'No amount', amount: 0 });
    expect(detailed.transaction).toBe(null);
    expect(detailed.error).toBe('Importo non valido o assente');
  });
});
