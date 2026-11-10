import { PROVIDERS, type Provider } from './types.ts';

export interface Candidate {
  provider: Provider;
  /** Expected pre-show value in currency units (a selection input, never booked revenue). */
  value: number | null | undefined;
}

/** Google reports micros; the reference divides by 1,000,000 for comparison. */
export function admobValueFromMicros(micros: number | null | undefined): number {
  return micros == null || !Number.isFinite(micros) ? 0 : micros / 1_000_000;
}

/** Pangle reports win revenue as a string. */
export function pangleValueFromString(s: string | null | undefined): number {
  const v = s == null ? NaN : Number.parseFloat(s);
  return Number.isFinite(v) ? v : 0;
}

/**
 * Highest value wins; missing values count as 0; equal values keep the
 * reference order AdMob, GAM, Pangle, TopOn, MAX.
 */
export function selectCandidate(cands: Candidate[]): Provider | null {
  const ordered = [...cands].sort((a, b) => PROVIDERS.indexOf(a.provider) - PROVIDERS.indexOf(b.provider));
  let best: Candidate | null = null;
  for (const c of ordered) {
    const v = c.value != null && Number.isFinite(c.value) ? c.value : 0;
    const bv = best ? (best.value != null && Number.isFinite(best.value) ? best.value : 0) : -Infinity;
    if (v > bv) best = c;
  }
  return best?.provider ?? null;
}
