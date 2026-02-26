import { formatCategoryLabel, formatEntityLabel, toTitleCaseIt } from './text';

describe('text utils', () => {
  test('toTitleCaseIt formats mixed/caps and trims spaces', () => {
    expect(toTitleCaseIt('  REGALI   CASA ')).toBe('Regali Casa');
  });

  test('formatEntityLabel applies Deco exception', () => {
    expect(formatEntityLabel('DECÒ')).toBe("Deco'");
    expect(formatEntityLabel('deco')).toBe("Deco'");
  });

  test('formatCategoryLabel keeps fallback', () => {
    expect(formatCategoryLabel('')).toBe('-');
  });
});
