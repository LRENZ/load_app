import { AppState as RNAppState } from 'react-native';
import { NoOpAdAdapter, type AdAdapter } from '../core/ads/adapters.ts';
import { emptyUnits, mockUnits, normalizeAdConfig, resolveAdConfig, type EffectiveAdConfig } from '../core/ads/config.ts';
import { FrequencyTracker, MemoryCounterStore, type Counter } from '../core/ads/frequency.ts';
import { AdGateway } from '../core/ads/gateway.ts';
import { DEFAULT_MOCK_SCENARIO, MockAdAdapter, type MockProviderScenario } from '../core/ads/mockAdapter.ts';
import { CACHED_NATURAL, CACHED_PAID, EMBEDDED_NATURAL, EMBEDDED_PAID, RISK_CONFIG } from '../core/ads/presets.ts';
import { RevenueLedger } from '../core/ads/revenue.ts';
import { FixtureRiskSignals, NoRiskSignals, noSignals, type RiskSignalProvider, type RiskSignals } from '../core/ads/risk.ts';
import type { Cohort, Provider } from '../core/ads/types.ts';
import { DEFAULT_ATTRIBUTION } from '../core/cohort.ts';
import type { CurrencyCode } from '../core/currency.ts';
import type { FxCacheStore, FxQuote } from '../core/fx.ts';
import {
  LocalAnalyticsSink,
  LocalCrashReporter,
  NoOpRemoteMessagingProvider,
  type AttributionInfo,
} from '../core/services/contracts.ts';
import { kv, KEYS } from '../storage/kv.ts';

/**
 * Runtime modes: "functional" (default; NoOp ads, no external services) and
 * "mock" (debug only; deterministic local ad fixtures). Set at build time with
 * EXPO_PUBLIC_APP_MODE. A production / real-ads mode does not exist yet.
 */
export const APP_MODE: 'functional' | 'mock' = process.env.EXPO_PUBLIC_APP_MODE === 'mock' ? 'mock' : 'functional';
export const DEBUG_TOOLS = __DEV__ || APP_MODE === 'mock';

export const analytics = new LocalAnalyticsSink();
export const crash = new LocalCrashReporter();
export const messaging = new NoOpRemoteMessagingProvider();
export const ledger = new RevenueLedger();

// ---- attribution (sticky; natural unless a debug fixture says otherwise) ----
export function attribution(): AttributionInfo {
  if (DEBUG_TOOLS) {
    const fixture = kv.get<Cohort | null>(KEYS.debugCohort, null);
    if (fixture) return { ...DEFAULT_ATTRIBUTION, cohort: fixture, network: fixture === 'paid' ? 'local-fixture' : null, fixture: true };
  }
  return kv.get<AttributionInfo>(KEYS.attribution, DEFAULT_ATTRIBUTION);
}

// ---- frequency counters persisted across restarts ----
const counterStore = new MemoryCounterStore();
counterStore.load(kv.get<Record<string, Counter>>(KEYS.adCounters, {}));
const persistentCounters = {
  get: (k: string) => counterStore.get(k),
  set: (k: string, c: Counter) => {
    counterStore.set(k, c);
    kv.set(KEYS.adCounters, counterStore.dump());
  },
};
export const frequency = new FrequencyTracker(persistentCounters);
export function resetAdCounters() {
  counterStore.load({});
  kv.set(KEYS.adCounters, {});
}

// ---- risk (no detector ships; fixtures in debug mode only) ----
const riskFixture = new FixtureRiskSignals(kv.get<RiskSignals>(KEYS.debugRisk, noSignals()));
export const risk: RiskSignalProvider = DEBUG_TOOLS ? riskFixture : new NoRiskSignals();
export function setRiskFixture(s: RiskSignals) {
  riskFixture.set(s);
  kv.set(KEYS.debugRisk, s);
}

// ---- adapters ----
export const mockAdapter = new MockAdAdapter();
const noopAdapter = new NoOpAdAdapter();
mockAdapter.scenarios = kv.get<Partial<Record<Provider, MockProviderScenario>>>(KEYS.debugScenario, {});

export type AdMode = 'noop' | 'mock';
export function adMode(): AdMode {
  if (!DEBUG_TOOLS) return 'noop';
  return kv.get<AdMode>(KEYS.debugAdMode, APP_MODE === 'mock' ? 'mock' : 'noop');
}
export function setAdMode(m: AdMode) {
  if (DEBUG_TOOLS) kv.set(KEYS.debugAdMode, m);
  rebuildGateway();
}
export function setMockScenario(p: Provider, s: MockProviderScenario | null) {
  if (s) mockAdapter.scenarios[p] = s;
  else delete mockAdapter.scenarios[p];
  kv.set(KEYS.debugScenario, mockAdapter.scenarios);
  mockAdapter.clear();
}
export { DEFAULT_MOCK_SCENARIO };

export function currentAdConfig(): EffectiveAdConfig {
  const cohort = attribution().cohort;
  const mode = adMode();
  const units = mode === 'mock' ? mockUnits() : emptyUnits();
  if (mode === 'mock') {
    // the dated reference cache plays the role of a stored remote config
    return normalizeAdConfig(cohort === 'paid' ? CACHED_PAID : CACHED_NATURAL, {
      version: `reference-cache-2026-11-07-${cohort}`,
      provenance: 'stored',
      units,
    });
  }
  return resolveAdConfig(null, cohort === 'paid' ? EMBEDDED_PAID : EMBEDDED_NATURAL, { version: `embedded-${cohort}`, units });
}

let foreground = RNAppState.currentState === 'active';
RNAppState.addEventListener('change', (s) => {
  foreground = s === 'active';
});
let simulatedOffline = false;
export function setSimulatedOffline(v: boolean) {
  simulatedOffline = v;
}

function makeGateway(adapter: AdAdapter) {
  return new AdGateway({
    adapter,
    config: currentAdConfig,
    cohort: () => attribution().cohort,
    risk,
    riskConfig: RISK_CONFIG,
    frequency,
    ledger,
    analytics,
    now: Date.now,
    isOnline: () => !simulatedOffline,
    isForeground: () => foreground,
    presentTimeoutMs: 120_000,
  });
}

export let ads = makeGateway(adMode() === 'mock' ? mockAdapter : noopAdapter);
const gwSubs = new Set<() => void>();
function rebuildGateway() {
  ads = makeGateway(adMode() === 'mock' ? mockAdapter : noopAdapter);
  gwSubs.forEach((f) => f());
}
export function onGatewayChange(fn: () => void) {
  gwSubs.add(fn);
  return () => {
    gwSubs.delete(fn);
  };
}

// ---- FX cache ----
export const fxCache: FxCacheStore = {
  async read(from: CurrencyCode, to: CurrencyCode) {
    return kv.get<FxQuote | null>(KEYS.fxCache(from, to), null);
  },
  async write(q: FxQuote) {
    kv.set(KEYS.fxCache(q.from, q.to), q);
    kv.set(KEYS.lastFxPair, { from: q.from, to: q.to });
  },
};
