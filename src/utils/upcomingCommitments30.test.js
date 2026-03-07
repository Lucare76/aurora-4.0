import { computeUpcomingCommitments30 } from './upcomingCommitments30';

describe('upcomingCommitments30', () => {
  test('calcola totale e urgenze', () => {
    const out = computeUpcomingCommitments30({
      dueSubscriptions: [
        { id: 's1', name: 'Netflix', amount: 12.99, daysTo: 2 },
        { id: 's2', name: 'Prime', amount: 4.99, daysTo: 20 },
        { id: 's3', name: 'Old', amount: 8, daysTo: -1 }
      ]
    });
    expect(out.total).toBeGreaterThan(0);
    expect(out.urgentCount).toBeGreaterThan(0);
    expect(out.overdueCount).toBeGreaterThan(0);
  });
});

