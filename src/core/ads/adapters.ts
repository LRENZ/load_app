import type { AdFormat, PlacementId, Provider, SkipReason } from './types.ts';

export interface CachedAd {
  handle: string;
  requestId: string;
  provider: Provider;
  format: AdFormat;
  unit: string;
  loadedAt: number;
  expiresAt: number;
  /** expected value in currency units, for candidate comparison */
  value: number | null;
  state: 'ready' | 'reserved' | 'showing' | 'dismissed' | 'failed' | 'expired' | 'destroyed';
}

export interface PresentListener {
  onShown(): void;
  onImpression(): void;
  onPaid(valueMicros: string, currency: string, precision: 'unknown' | 'estimated' | 'publisher_defined' | 'precise'): void;
  onClick(): void;
  onDismissed(): void;
  onFailed(reason: SkipReason): void;
}

/**
 * Provider-neutral adapter boundary. Real SDK adapters (AdMob, GAM, Pangle,
 * TopOn, AppLovin MAX) implement this later; screens never see it.
 */
export interface AdAdapter {
  readonly mode: 'noop' | 'mock' | 'provider';
  isInitialized(provider: Provider): boolean;
  /** Ready, unexpired cached ad, or null. */
  peek(provider: Provider, format: AdFormat, unit: string, now: number): CachedAd | null;
  load(provider: Provider, format: AdFormat, unit: string): Promise<{ ok: true; ad: CachedAd } | { ok: false; reason: SkipReason }>;
  present(ad: CachedAd, placementId: PlacementId, listener: PresentListener): void;
  destroy(handle: string): void;
}

/** Default adapter: nothing is configured, nothing is requested, nothing is shown. */
export class NoOpAdAdapter implements AdAdapter {
  readonly mode = 'noop' as const;
  isInitialized() {
    return false;
  }
  peek() {
    return null;
  }
  async load() {
    return { ok: false as const, reason: 'not_configured' as const };
  }
  present(_ad: CachedAd, _p: PlacementId, listener: PresentListener) {
    listener.onFailed('not_configured');
  }
  destroy() {}
}

/** Contract summary for later vendor integrations (no vendor package imported). */
export const PROVIDER_CAPABILITIES: Record<Provider, { formats: AdFormat[]; status: 'deferred'; needs: string[] }> = {
  admob: { formats: ['app_open', 'interstitial', 'native', 'banner', 'rewarded'], status: 'deferred', needs: ['AdMob app ID', 'unit IDs per format', 'react-native-google-mobile-ads or Kotlin bridge', 'native ad view registration'] },
  gam: { formats: ['app_open', 'interstitial', 'native', 'banner', 'rewarded'], status: 'deferred', needs: ['Ad Manager network code', 'ad unit paths'] },
  pangle: { formats: ['app_open', 'interstitial', 'native'], status: 'deferred', needs: ['Pangle app ID', 'placement IDs', 'Kotlin bridge'] },
  topon: { formats: ['app_open', 'interstitial', 'native'], status: 'deferred', needs: ['TopOn app ID + app key', 'placement IDs', 'Kotlin bridge'] },
  max: { formats: ['app_open', 'interstitial', 'native'], status: 'deferred', needs: ['AppLovin SDK key', 'MAX ad unit IDs', 'react-native-applovin-max or bridge'] },
};
