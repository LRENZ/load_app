import DecimalBase from 'decimal.js';

/**
 * Decimal arithmetic matching Java BigDecimal with MathContext(34, HALF_UP).
 * Every arithmetic step rounds to 34 significant digits, like the reference
 * implementation passes `mathContext` to each operation.
 */
export const D = DecimalBase.clone({
  precision: 34,
  rounding: DecimalBase.ROUND_HALF_UP,
  toExpNeg: -40,
  toExpPos: 40,
});
export type Dec = InstanceType<typeof D>;

/** Java `setScale(2, HALF_UP)`. */
export function round2(x: Dec): Dec {
  return x.toDecimalPlaces(2, D.ROUND_HALF_UP);
}

/** Fixed 2-decimal string, e.g. "860.66", "0.00". */
export function money(x: Dec): string {
  return round2(x).toFixed(2);
}

/** Java BigDecimal.scale() for a value built from a plain decimal string. */
export function scaleOf(text: string): number {
  const i = text.indexOf('.');
  return i < 0 ? 0 : text.length - i - 1;
}
