import { getRecurringNextRunLabel } from './recurring';

describe('recurring utils', () => {
  test('returns Oggi for current date', () => {
    const now = new Date();
    expect(getRecurringNextRunLabel(now)).toBe('Oggi');
  });

  test('returns Domani for next day', () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    expect(getRecurringNextRunLabel(d)).toBe('Domani');
  });

  test('returns relative future label', () => {
    const d = new Date();
    d.setDate(d.getDate() + 4);
    expect(getRecurringNextRunLabel(d)).toBe('Tra 4 giorni');
  });

  test('returns N/D for invalid input', () => {
    expect(getRecurringNextRunLabel('invalid-date')).toBe('N/D');
  });
});
