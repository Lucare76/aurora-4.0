import { BACKUP_PROFILES, getBackupCollections } from './backupProfiles';

describe('backup profiles', () => {
  it('returns finance profile collections', () => {
    const cols = getBackupCollections('finance');
    expect(cols).toEqual(BACKUP_PROFILES.finance);
    expect(cols).toContain('transactions');
    expect(cols).not.toContain('birthdays');
  });

  it('falls back to full profile', () => {
    const cols = getBackupCollections('unknown');
    expect(cols).toEqual(BACKUP_PROFILES.full);
  });
});

