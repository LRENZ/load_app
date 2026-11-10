export type CurrencyCode = 'GBP' | 'USD' | 'AUD' | 'CNY' | 'INR' | 'EUR';

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
}

/** Selection order shown in the currency picker. */
export const CURRENCIES: CurrencyInfo[] = [
  { code: 'GBP', symbol: '£' },
  { code: 'USD', symbol: '$' },
  { code: 'AUD', symbol: 'A$' },
  { code: 'CNY', symbol: '¥' },
  { code: 'INR', symbol: '₹' },
  { code: 'EUR', symbol: '€' },
];

export const DEFAULT_CURRENCY: CurrencyCode = 'GBP';

export function symbolOf(code: CurrencyCode): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

export function isCurrency(x: unknown): x is CurrencyCode {
  return typeof x === 'string' && CURRENCIES.some((c) => c.code === x);
}

/** Groups the integer part of a plain decimal string: "10000.00" → "10,000.00". */
export function groupDigits(plain: string): string {
  const neg = plain.startsWith('-');
  const body = neg ? plain.slice(1) : plain;
  const [i, f] = body.split('.');
  const grouped = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (neg ? '-' : '') + grouped + (f !== undefined ? `.${f}` : '');
}

/** "£10,000.00" from a 2-decimal plain string. */
export function formatMoney(code: CurrencyCode, plain: string): string {
  const fixed = plain.includes('.') ? plain : `${plain}.00`;
  return symbolOf(code) + groupDigits(fixed);
}
