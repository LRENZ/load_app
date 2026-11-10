import type { CurrencyCode } from './currency.ts';

export const FX_SCHEMA_VERSION = 1;
export const FX_FRESH_MS = 24 * 60 * 60 * 1000;
export const FX_TIMEOUT_MS = 10_000;
export const FX_ENDPOINT = 'https://api.frankfurter.dev/v1/latest';

export interface FxQuote {
  schema: number;
  from: CurrencyCode;
  to: CurrencyCode;
  rate: number;
  /** service date reported by the API, e.g. 2026-11-06 */
  date: string;
  fetchedAt: number;
}

export interface FxCacheStore {
  read(from: CurrencyCode, to: CurrencyCode): Promise<FxQuote | null>;
  write(q: FxQuote): Promise<void>;
}

export type FxFetch = (url: string, signal: AbortSignal) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export type FxState =
  | { kind: 'same_currency' }
  | { kind: 'fresh'; quote: FxQuote; source: 'cache' | 'network' }
  | { kind: 'stale'; quote: FxQuote; reason: FxError }
  | { kind: 'error'; reason: FxError };

export type FxError = 'offline' | 'timeout' | 'http' | 'invalid_payload';

export function fxUrl(from: CurrencyCode, to: CurrencyCode): string {
  return `${FX_ENDPOINT}?from=${from}&to=${to}`;
}

/** Validates the Frankfurter payload {amount, base, date, rates: {TO: n}}. */
export function parseFxPayload(json: unknown, from: CurrencyCode, to: CurrencyCode): { rate: number; date: string } | null {
  if (!json || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  if (o.base !== from) return null;
  const rates = o.rates as Record<string, unknown> | undefined;
  const rate = rates?.[to];
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) return null;
  if (typeof o.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.date)) return null;
  return { rate, date: o.date };
}

/**
 * Loads a pair: fresh cache (< 24 h, not from the future) wins; otherwise fetch;
 * on failure fall back to a stale cache entry, labelled stale.
 */
export async function loadFx(
  from: CurrencyCode,
  to: CurrencyCode,
  deps: { cache: FxCacheStore; fetch: FxFetch; now: () => number; timeoutMs?: number },
): Promise<FxState> {
  if (from === to) return { kind: 'same_currency' };
  const now = deps.now();
  let cached = await deps.cache.read(from, to).catch(() => null);
  if (cached && (cached.schema !== FX_SCHEMA_VERSION || cached.fetchedAt > now)) cached = null;
  if (cached && now - cached.fetchedAt < FX_FRESH_MS) return { kind: 'fresh', quote: cached, source: 'cache' };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), deps.timeoutMs ?? FX_TIMEOUT_MS);
  let reason: FxError;
  try {
    const res = await deps.fetch(fxUrl(from, to), ctrl.signal);
    if (!res.ok) {
      reason = 'http';
    } else {
      const parsed = parseFxPayload(await res.json(), from, to);
      if (parsed) {
        const quote: FxQuote = { schema: FX_SCHEMA_VERSION, from, to, rate: parsed.rate, date: parsed.date, fetchedAt: deps.now() };
        await deps.cache.write(quote).catch(() => undefined);
        return { kind: 'fresh', quote, source: 'network' };
      }
      reason = 'invalid_payload';
    }
  } catch {
    reason = ctrl.signal.aborted ? 'timeout' : 'offline';
  } finally {
    clearTimeout(timer);
  }
  return cached ? { kind: 'stale', quote: cached, reason } : { kind: 'error', reason };
}

/** amount × rate, half-up to 2 decimals. */
export function applyRate(amount: number, rate: number): string {
  const v = Math.round((amount * rate + Number.EPSILON) * 100) / 100;
  return v.toFixed(2);
}

/**
 * Guards against response races: only the latest request's result is applied.
 */
export class LatestOnly {
  private seq = 0;
  next(): number {
    return ++this.seq;
  }
  isLatest(id: number): boolean {
    return id === this.seq;
  }
}
