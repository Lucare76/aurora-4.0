// src/utils/currency.js

export const CURRENCY_MAP = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CHF: 'CHF',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  SEK: 'kr',
  NOK: 'kr',
  PLN: 'zł',
  BRL: 'R$',
  INR: '₹'
};

export const CURRENCY_OPTIONS = Object.entries(CURRENCY_MAP).map(([code, symbol]) => ({
  code,
  symbol,
  label: `${code} (${symbol})`
}));

export function getCurrencySymbol(currencyCode = 'EUR') {
  return CURRENCY_MAP[currencyCode] || '€';
}

export function formatCurrency(value, currencyCode = 'EUR', options = {}) {
  const { decimals = 2, showPlus = false } = options;
  const num = Number(value) || 0;
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : showPlus && num > 0 ? '+' : '';
  const symbol = getCurrencySymbol(currencyCode);

  const fixed = abs.toFixed(decimals);
  const [intPart, decPart = ''] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (decimals <= 0) {
    return `${sign}${symbol} ${grouped}`;
  }

  return `${sign}${symbol} ${grouped},${decPart}`;
}
