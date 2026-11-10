import { D, type Dec } from './decimal.ts';

export type FieldError = 'empty' | 'invalid' | 'too_many_decimals' | 'out_of_range';

export type Parsed<T> = { ok: true; value: T; text: string } | { ok: false; error: FieldError };

const NUMBER_RE = /^[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)$/;
const INTEGER_RE = /^[0-9]+$/;

/**
 * Decimal field parser, same order of checks as the reference validator:
 * trim → empty → format → fraction digits → sign → integer digit count → range.
 * Returns the normalized plain decimal text (leading zeros removed, scale kept).
 */
export function parseDecimalField(
  raw: string,
  maxScale: number,
  min: string,
  max: string,
): Parsed<Dec> {
  const s = raw.trim();
  if (s.length === 0) return { ok: false, error: 'empty' };
  if (!NUMBER_RE.test(s)) return { ok: false, error: 'invalid' };
  const unsigned = s.replace(/^\+/, '').replace(/^-/, '');
  const dot = unsigned.indexOf('.');
  const intPart = dot >= 0 ? unsigned.slice(0, dot) : unsigned;
  const fracPart = dot >= 0 ? unsigned.slice(dot + 1) : '';
  if (fracPart.length > maxScale) return { ok: false, error: 'too_many_decimals' };
  if (s.startsWith('-')) return { ok: false, error: 'out_of_range' };
  const intTrim = intPart.replace(/^0+/, '') || '0';
  const maxInt = max.split('.')[0].replace(/^0+/, '');
  if (intTrim.length > maxInt.length) return { ok: false, error: 'out_of_range' };
  const text = fracPart.length > 0 ? `${intTrim}.${fracPart}` : intTrim;
  const value = new D(text);
  if (value.lt(min) || value.gt(max)) return { ok: false, error: 'out_of_range' };
  return { ok: true, value, text };
}

/** Whole-number field (term). */
export function parseIntegerField(raw: string, min: number, max: number): Parsed<number> {
  const s = raw.trim();
  if (s.length === 0) return { ok: false, error: 'empty' };
  if (!INTEGER_RE.test(s)) return { ok: false, error: 'invalid' };
  const trimmed = s.replace(/^0+/, '') || '0';
  if (trimmed.length > 6) return { ok: false, error: 'out_of_range' };
  const n = Number(trimmed);
  if (n < min || n > max) return { ok: false, error: 'out_of_range' };
  return { ok: true, value: n, text: String(n) };
}

/**
 * Keystroke filter for money/rate inputs: keeps the raw string while the user
 * types (partial values like "12." are allowed) and only blocks characters that
 * can never form a valid value.
 */
export function sanitizeDecimalTyping(next: string, maxScale: number): string {
  let s = next.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const dot = s.indexOf('.');
  if (dot >= 0) {
    s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');
    if (maxScale >= 0) s = s.slice(0, dot + 1 + maxScale);
  }
  return s;
}
