import { analyzeDataQuality } from './dataQuality';

describe('analyzeDataQuality', () => {
  it('detects duplicates, missing categories and anomalies', () => {
    const data = [
      { date: '2026-03-01', amount: -50, type: 'expense', description: 'Spesa', accountId: 'a1', categoryId: 'c1' },
      { date: '2026-03-01', amount: -50, type: 'expense', description: 'Spesa', accountId: 'a1', categoryId: 'c1' },
      { date: '2026-03-02', amount: -10, type: 'expense', description: 'Bar', accountId: 'a1' },
      { date: '2026-03-03', amount: -400, type: 'expense', description: 'Laptop', accountId: 'a1', categoryId: 'c2' },
      { date: '2026-03-03', amount: 2000, type: 'income', description: 'Stipendio', accountId: 'a1' }
    ];

    const report = analyzeDataQuality(data);
    expect(report.duplicateGroups).toBe(1);
    expect(report.duplicateCount).toBe(1);
    expect(report.missingCategory).toBe(1);
    expect(report.highExpenseCount).toBeGreaterThanOrEqual(1);
    expect(report.severity).not.toBe('none');
  });
});

