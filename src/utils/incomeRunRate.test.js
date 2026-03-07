import { computeIncomeRunRate } from './incomeRunRate';

describe('incomeRunRate', () => {
  test('ok quando proiezione supera target', () => {
    const out = computeIncomeRunRate({
      monthlyIncome: 1800,
      targetIncome: 2500,
      now: new Date('2026-03-15T12:00:00Z')
    });
    expect(out.projectedIncome).toBeGreaterThanOrEqual(2500);
    expect(out.level).toBe('ok');
  });

  test('critical quando proiezione molto sotto target', () => {
    const out = computeIncomeRunRate({
      monthlyIncome: 400,
      targetIncome: 2500,
      now: new Date('2026-03-20T12:00:00Z')
    });
    expect(out.level).toBe('critical');
  });
});

