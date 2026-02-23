export function formatNumber(value) {
  const num = Math.abs(Number(value) || 0);
  const fixed = num.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withSep},${decPart}`;
}
