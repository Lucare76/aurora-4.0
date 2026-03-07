import { computeEmergencyFundCoverage } from './emergencyFundCoverage';

describe('emergencyFundCoverage', () => {
  test('critical con copertura sotto 2 mesi', () => {
    const out = computeEmergencyFundCoverage({ totalBalance: 1000, monthlyExpenses: 700 });
    expect(out.level).toBe('critical');
  });

  test('ok con copertura sopra 4 mesi', () => {
    const out = computeEmergencyFundCoverage({ totalBalance: 9000, monthlyExpenses: 1500 });
    expect(out.level).toBe('ok');
  });
});

