import type { AdAdapter, CachedAd, PresentListener } from './adapters.ts';
import type { AdFormat, PlacementId, Provider, SkipReason } from './types.ts';

/**
 * Deterministic local test adapter (debug "mock" mode only). Every timing and
 * value here is a TEST FIXTURE, not a recovered production behaviour.
 */
export interface MockProviderScenario {
  fill: 'success' | 'no_fill' | 'error' | 'offline';
  loadDelayMs: number;
  ttlMs: number;
  /** expected value for candidate comparison (currency units) */
  value: number | null;
  /** paid callback amount in micros; null = no paid callback */
  paidMicros: string | null;
  currency: string;
  showFails: boolean;
  duplicateCallbacks: boolean;
}

export const DEFAULT_MOCK_SCENARIO: MockProviderScenario = {
  fill: 'success',
  loadDelayMs: 300,
  ttlMs: 60 * 60 * 1000,
  value: 0.002,
  paidMicros: '2000',
  currency: 'USD',
  showFails: false,
  duplicateCallbacks: false,
};

export interface MockPresentation {
  ad: CachedAd;
  placementId: PlacementId;
  /** user closes the mock ad */
  close(): void;
  click(): void;
}

export class MockAdAdapter implements AdAdapter {
  readonly mode = 'mock' as const;
  private cache = new Map<string, CachedAd>();
  private inflight = new Map<string, Promise<{ ok: true; ad: CachedAd } | { ok: false; reason: SkipReason }>>();
  private seq = 0;
  scenarios: Partial<Record<Provider, MockProviderScenario>> = {};
  presenter: ((p: MockPresentation) => void) | null = null;

  private now: () => number;
  private schedule: (fn: () => void, ms: number) => void;
  constructor(
    now: () => number = Date.now,
    schedule: (fn: () => void, ms: number) => void = (fn, ms) => {
      setTimeout(fn, ms);
    },
  ) {
    this.now = now;
    this.schedule = schedule;
  }

  scenario(p: Provider): MockProviderScenario {
    return this.scenarios[p] ?? DEFAULT_MOCK_SCENARIO;
  }

  isInitialized() {
    return true;
  }

  private key(p: Provider, f: AdFormat, unit: string) {
    return `${p}|${f}|${unit}`;
  }

  peek(provider: Provider, format: AdFormat, unit: string, now: number): CachedAd | null {
    const ad = this.cache.get(this.key(provider, format, unit));
    if (!ad || ad.state !== 'ready') return null;
    if (now >= ad.expiresAt) {
      ad.state = 'expired';
      this.cache.delete(this.key(provider, format, unit));
      return null;
    }
    return ad;
  }

  /** Overlapping loads for the same provider/format/unit share one request. */
  load(provider: Provider, format: AdFormat, unit: string) {
    const k = this.key(provider, format, unit);
    const existing = this.inflight.get(k);
    if (existing) return existing;
    const s = this.scenario(provider);
    const requestId = `req-${++this.seq}`;
    const p = new Promise<{ ok: true; ad: CachedAd } | { ok: false; reason: SkipReason }>((resolve) => {
      this.schedule(() => {
        this.inflight.delete(k);
        if (s.fill !== 'success') {
          resolve({ ok: false, reason: s.fill === 'no_fill' ? 'no_fill' : s.fill === 'offline' ? 'offline' : 'sdk_error' });
          return;
        }
        const t = this.now();
        const ad: CachedAd = {
          handle: `mock-${provider}-${format}-${this.seq}`,
          requestId,
          provider,
          format,
          unit,
          loadedAt: t,
          expiresAt: t + s.ttlMs,
          value: s.value,
          state: 'ready',
        };
        this.cache.set(k, ad);
        resolve({ ok: true, ad });
      }, s.loadDelayMs);
    });
    this.inflight.set(k, p);
    return p;
  }

  present(ad: CachedAd, placementId: PlacementId, listener: PresentListener) {
    const s = this.scenario(ad.provider);
    this.cache.delete(this.key(ad.provider, ad.format, ad.unit));
    const twice = (fn: () => void) => {
      fn();
      if (s.duplicateCallbacks) fn();
    };
    if (s.showFails) {
      ad.state = 'failed';
      twice(() => listener.onFailed('sdk_error'));
      return;
    }
    ad.state = 'showing';
    listener.onShown();
    twice(() => listener.onImpression());
    if (s.paidMicros) {
      const micros = s.paidMicros;
      twice(() => listener.onPaid(micros, s.currency, 'estimated'));
    }
    const finish = () => {
      if (ad.state !== 'showing') {
        if (s.duplicateCallbacks) listener.onDismissed();
        return;
      }
      ad.state = 'dismissed';
      twice(() => listener.onDismissed());
    };
    if (ad.format === 'native' || ad.format === 'banner') return; // natives stay mounted until disposed
    if (this.presenter) {
      this.presenter({ ad, placementId, close: finish, click: () => listener.onClick() });
    } else {
      this.schedule(finish, 0);
    }
  }

  destroy(handle: string) {
    for (const [k, ad] of this.cache) {
      if (ad.handle === handle) {
        ad.state = 'destroyed';
        this.cache.delete(k);
      }
    }
  }

  clear() {
    this.cache.clear();
    this.inflight.clear();
  }
}
