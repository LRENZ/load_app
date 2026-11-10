export type AdFormat = 'app_open' | 'interstitial' | 'native' | 'banner' | 'rewarded' | 'full_screen_native';

/** Candidate order matters: ties keep this order (AdMob, GAM, Pangle, TopOn, MAX). */
export const PROVIDERS = ['admob', 'gam', 'pangle', 'topon', 'max'] as const;
export type Provider = (typeof PROVIDERS)[number];

export type Cohort = 'natural' | 'paid';

export type PlacementId =
  | 'SP_APP_OPEN'
  | 'IV_ONBOARDING_COMPLETE'
  | 'NA_ONBOARDING'
  | 'IV_ENTER_SECONDARY'
  | 'IV_CALCULATION_COMPLETE'
  | 'IV_RETURN_TO_HOME'
  | 'NA_HOME'
  | 'BA_HOME'
  | 'NA_CALCULATOR_ACTIONS'
  | 'NA_RESULT_DISCLAIMER'
  | 'NA_EXCHANGE_RATE'
  | 'NA_TEMPERATURE'
  | 'NA_MASS_CONVERTER'
  | 'NA_SPEED_CONVERTER'
  | 'NA_LENGTH_CONVERTER'
  | 'NA_WORLD_CLOCK'
  | 'IV_HOME_TAB'
  | 'IV_LANGUAGE_CONFIRM'
  | 'IV_CURRENCY_CONFIRM'
  | 'NA_LANGUAGE'
  | 'NA_CURRENCY'
  | 'IV_EXIT_APP'
  | 'IV_UNINSTALL_1'
  | 'NA_UNINSTALL_1_BOTTOM'
  | 'NA_UNINSTALL_2_BOTTOM';

export type SkipReason =
  | 'not_wired'
  | 'disabled_slot'
  | 'disabled_page'
  | 'format_disabled'
  | 'missing_unit'
  | 'not_initialized'
  | 'not_configured'
  | 'offline'
  | 'background'
  | 'no_cache'
  | 'expired'
  | 'risk_restricted'
  | 'no_platform_available_after_exclusion'
  | 'daily_show_cap'
  | 'daily_click_cap'
  | 'interval'
  | 'presentation_busy'
  | 'sdk_error'
  | 'no_fill'
  | 'timeout';

export interface AdOpportunity {
  attemptId: string;
  placementId: PlacementId;
  format: AdFormat;
  cohort: Cohort;
  configVersion: string;
  screen: string;
  trigger: string;
  timestamp: number;
}

export interface ProviderVerdict {
  provider: Provider;
  eligible: boolean;
  reasons: SkipReason[];
}

export interface AdDecision {
  allowed: boolean;
  candidates: Provider[];
  reasons: SkipReason[];
  perProvider: ProviderVerdict[];
}

export interface Impression {
  impressionId: string;
  attemptId: string;
  provider: Provider;
  network: string;
  unit: string;
  placementId: PlacementId;
  format: AdFormat;
  timestamp: number;
}

export interface PaidRevenue {
  impressionId: string;
  provider: Provider;
  mediationNetwork: string;
  /** Integer micros of the currency unit, as a decimal string (no float). */
  valueMicros: string;
  currency: string;
  precision: 'unknown' | 'estimated' | 'publisher_defined' | 'precise';
  sourceCallback: string;
  isTest: boolean;
  origin: 'local_mock' | 'provider_sdk';
}

/** Outcome of a full-screen opportunity; the caller's continuation runs once after this resolves. */
export type AdOutcome =
  | { status: 'skipped'; reasons: SkipReason[]; attemptId: string }
  | { status: 'deferred'; reason: 'not_configured'; attemptId: string }
  | { status: 'failed'; reason: SkipReason; attemptId: string }
  | { status: 'shown'; impression: Impression; attemptId: string };
