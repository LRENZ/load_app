import { PROVIDERS, type AdFormat, type Cohort, type PlacementId, type Provider } from './types.ts';

// ---------- raw (as delivered by config) ----------
export interface RawLimit {
  max_daily_show: number;
  max_daily_click: number;
  min_interval?: number;
}
export interface RawFormatConfig {
  compete_with_interstitial?: boolean;
  bidding_platforms: Partial<Record<Provider, boolean>>;
  total_frequency_limits: RawLimit;
  bidding_frequency_limits: Partial<Record<Provider, RawLimit>>;
}
export interface RawAdConfig {
  app_open?: RawFormatConfig;
  interstitial?: RawFormatConfig;
  native?: RawFormatConfig;
  rewarded?: RawFormatConfig;
  banner?: RawFormatConfig;
  ad_strategies?: { fullscreen_native_after_interstitial?: number; app_open_after_interstitial?: number };
}
export interface RawRiskConfig {
  behavior_mode: number;
  mistake_click_time: number;
  mistake_click_count: number;
  restrict_interval: number;
  close_click_count: number;
  close_activity_class_names: string[];
  limits: Record<string, { request_limit: number; show_limit: number; click_limit: number; fill_fail_limit: number }>;
  vpn_ad_config: number;
  dns_ad_config: number;
  ip_ad_config: number;
  simulator_ad_config: number;
  adb_ad_config: number;
  sim_ad_config: number;
  no_gp_ad_config: number;
  sys_9_low_ad_config: number;
  play_ad_config: number;
}
export type RawClickProtection = Record<Cohort, { protection_enabled: boolean; threshold: number }>;

// ---------- effective ----------
export interface EffectiveLimit {
  maxDailyShow: number;
  maxDailyClick: number;
  minIntervalSec: number;
}
export interface FormatPolicy {
  enabled: Record<Provider, boolean>;
  total: EffectiveLimit;
  platform: Record<Provider, EffectiveLimit>;
}
export interface AdFlags {
  layer2PageEnterEnabled: boolean;
  layer2PageExitEnabled: boolean;
  adHomeExitEnabled: boolean;
  adSecondaryNativeEnabled: boolean;
}
/** Owner-supplied identifiers. Empty until real integration (see FUTURE_INTEGRATIONS.md). */
export type UnitMap = Record<Provider, Partial<Record<AdFormat, string>>>;

export interface EffectiveAdConfig {
  version: string;
  provenance: 'stored' | 'embedded' | 'fallback_default';
  formats: Partial<Record<AdFormat, FormatPolicy>>;
  strategies: { fullscreenNativeAfterInterstitial: number; appOpenAfterInterstitial: number };
  slotSwitch: Record<PlacementId, boolean>;
  flags: AdFlags;
  units: UnitMap;
}

/** Reference cached flag values (7 Nov 2026 cache); every slot switch was 1. */
export const REFERENCE_FLAGS: AdFlags = {
  layer2PageEnterEnabled: false,
  layer2PageExitEnabled: true,
  adHomeExitEnabled: false,
  adSecondaryNativeEnabled: true,
};

export function emptyUnits(): UnitMap {
  return { admob: {}, gam: {}, pangle: {}, topon: {}, max: {} };
}

/**
 * Mock-only handles for formats where the reference had a configured unit
 * (runtimeUnitPresence). They are not network identifiers and are only
 * understood by MockAdAdapter.
 */
export function mockUnits(): UnitMap {
  const u = emptyUnits();
  for (const p of ['admob', 'pangle', 'topon', 'max'] as const) {
    for (const f of ['app_open', 'interstitial', 'native'] as const) u[p][f] = `mock://${p}/${f}`;
  }
  return u;
}

/** Tracker factory coercion: show/click limits at least 1, interval at least 0. */
function totalLimit(r: RawLimit | undefined): EffectiveLimit {
  return {
    maxDailyShow: Math.max(1, Math.floor(r?.max_daily_show ?? 1)),
    maxDailyClick: Math.max(1, Math.floor(r?.max_daily_click ?? 1)),
    // Total trackers are built with interval 30 in the reference factory; whether it is
    // enforced is unresolved, so the policy does not consume it (see PARITY notes).
    minIntervalSec: 30,
  };
}
function platformLimit(r: RawLimit | undefined): EffectiveLimit {
  return {
    maxDailyShow: Math.max(1, Math.floor(r?.max_daily_show ?? 1)),
    maxDailyClick: Math.max(1, Math.floor(r?.max_daily_click ?? 1)),
    minIntervalSec: Math.max(0, Math.floor(r?.min_interval ?? 0)),
  };
}

function normalizeFormat(raw: RawFormatConfig | undefined): FormatPolicy | undefined {
  if (!raw || typeof raw !== 'object' || !raw.bidding_platforms) return undefined;
  const enabled = {} as Record<Provider, boolean>;
  const platform = {} as Record<Provider, EffectiveLimit>;
  for (const p of PROVIDERS) {
    enabled[p] = raw.bidding_platforms[p] === true;
    platform[p] = platformLimit(raw.bidding_frequency_limits?.[p]);
  }
  return { enabled, total: totalLimit(raw.total_frequency_limits), platform };
}

export function allSlotsOn(): Record<PlacementId, boolean> {
  const ids: PlacementId[] = [
    'SP_APP_OPEN', 'IV_ONBOARDING_COMPLETE', 'NA_ONBOARDING', 'IV_ENTER_SECONDARY', 'IV_CALCULATION_COMPLETE',
    'IV_RETURN_TO_HOME', 'NA_HOME', 'BA_HOME', 'NA_CALCULATOR_ACTIONS', 'NA_RESULT_DISCLAIMER', 'NA_EXCHANGE_RATE',
    'NA_TEMPERATURE', 'NA_MASS_CONVERTER', 'NA_SPEED_CONVERTER', 'NA_LENGTH_CONVERTER', 'NA_WORLD_CLOCK',
    'IV_HOME_TAB', 'IV_LANGUAGE_CONFIRM', 'IV_CURRENCY_CONFIRM', 'NA_LANGUAGE', 'NA_CURRENCY', 'IV_EXIT_APP',
    'IV_UNINSTALL_1', 'NA_UNINSTALL_1_BOTTOM', 'NA_UNINSTALL_2_BOTTOM',
  ];
  return Object.fromEntries(ids.map((id) => [id, true])) as Record<PlacementId, boolean>;
}

export function normalizeAdConfig(
  raw: RawAdConfig,
  opts: { version: string; provenance: EffectiveAdConfig['provenance']; flags?: AdFlags; units?: UnitMap; slotSwitch?: Partial<Record<PlacementId, boolean>> },
): EffectiveAdConfig {
  const formats: EffectiveAdConfig['formats'] = {};
  for (const f of ['app_open', 'interstitial', 'native', 'banner', 'rewarded'] as const) {
    const n = normalizeFormat(raw[f]);
    if (n) formats[f] = n;
  }
  // Full-screen native reads the native config but keeps its own tracker type.
  if (formats.native) formats.full_screen_native = formats.native;
  return {
    version: opts.version,
    provenance: opts.provenance,
    formats,
    strategies: {
      fullscreenNativeAfterInterstitial: raw.ad_strategies?.fullscreen_native_after_interstitial ?? 0,
      appOpenAfterInterstitial: raw.ad_strategies?.app_open_after_interstitial ?? 0,
    },
    slotSwitch: { ...allSlotsOn(), ...(opts.slotSwitch ?? {}) },
    flags: opts.flags ?? REFERENCE_FLAGS,
    units: opts.units ?? emptyUnits(),
  };
}

/**
 * Selection order of the reference loader: a non-empty stored (remote) string,
 * otherwise the embedded default; malformed input falls back to the embedded default.
 */
export function resolveAdConfig(
  stored: string | null | undefined,
  embedded: RawAdConfig,
  opts: { version: string; flags?: AdFlags; units?: UnitMap },
): EffectiveAdConfig {
  if (typeof stored === 'string' && stored.trim().length > 0) {
    try {
      const parsed = JSON.parse(stored) as RawAdConfig;
      if (parsed && typeof parsed === 'object' && parsed.interstitial) {
        return normalizeAdConfig(parsed, { ...opts, provenance: 'stored' });
      }
    } catch {
      /* fall through */
    }
    return normalizeAdConfig(embedded, { ...opts, provenance: 'fallback_default' });
  }
  return normalizeAdConfig(embedded, { ...opts, provenance: 'embedded' });
}
