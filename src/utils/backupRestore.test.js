import { hasBackupConflict, parseBackupJson, reviveBackupValue, summarizeBackupPayload } from './backupRestore';

describe('backupRestore utils', () => {
  it('parses backup json and summarizes profile', () => {
    const payload = parseBackupJson(
      JSON.stringify({
        exportedAt: '2026-03-04T10:00:00.000Z',
        profile: 'full',
        userId: 'u1',
        data: {
          transactions: [{ id: 't1' }],
          accounts: [{ id: 'a1' }],
          birthdays: [{ id: 'b1' }]
        }
      })
    );
    const s = summarizeBackupPayload(payload, 'finance');
    expect(payload.userId).toBe('u1');
    expect(s.total).toBe(2);
  });

  it('revives date fields safely', () => {
    const value = reviveBackupValue({
      createdAt: '2026-03-04T10:00:00.000Z',
      description: '2026-03-04T10:00:00.000Z'
    });
    expect(value.createdAt instanceof Date).toBe(true);
    expect(typeof value.description).toBe('string');
  });

  it('detects meaningful conflict and ignores metadata fields', () => {
    const noConflict = hasBackupConflict(
      { id: 't1', amount: 10, userId: 'old', updatedAt: '2026-01-01T00:00:00.000Z' },
      { id: 't1', amount: 10, userId: 'new', updatedAt: '2026-02-01T00:00:00.000Z' }
    );
    const conflict = hasBackupConflict(
      { id: 't1', amount: 10 },
      { id: 't1', amount: 20 }
    );
    expect(noConflict).toBe(false);
    expect(conflict).toBe(true);
  });
});
