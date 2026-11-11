/**
 * Platform-free rules for handing local events to Firebase. The native calls
 * live in src/state/firebase.ts; everything that decides WHAT is sent lives
 * here so it can be unit-tested in Node.
 */
import type { PaidRevenue } from '../ads/types.ts';
import { microsToDecimal } from '../ads/revenue.ts';
import type { EventParams } from './contracts.ts';

/**
 * Event names Google Analytics for Firebase reserves for automatic collection.
 * Logging one of these by hand is rejected (or double counted), so local names
 * that collide get an "app_" prefix instead.
 */
export const RESERVED_EVENTS = new Set([
  'ad_activeview', 'ad_click', 'ad_exposure', 'ad_impression', 'ad_query', 'ad_reward', 'adunit_exposure',
  'app_background', 'app_clear_data', 'app_exception', 'app_remove', 'app_store_refund',
  'app_store_subscription_cancel', 'app_store_subscription_convert', 'app_store_subscription_renew',
  'app_update', 'app_upgrade', 'dynamic_link_app_open', 'dynamic_link_app_update', 'dynamic_link_first_open',
  'error', 'first_open', 'first_visit', 'in_app_purchase', 'notification_dismiss', 'notification_foreground',
  'notification_open', 'notification_receive', 'os_update', 'screen_view', 'session_start',
  'session_start_with_rollout', 'user_engagement',
]);
const RESERVED_PREFIXES = ['firebase_', 'google_', 'ga_'];

const NAME_MAX = 40;
const PARAM_NAME_MAX = 40;
const PARAM_VALUE_MAX = 100;
const PARAMS_MAX = 25;

function cleanName(raw: string, max: number): string {
  let s = raw.replace(/[^A-Za-z0-9_]/g, '_');
  if (!/^[A-Za-z]/.test(s)) s = 'e_' + s;
  for (const p of RESERVED_PREFIXES) if (s.toLowerCase().startsWith(p)) s = 'x_' + s;
  return s.slice(0, max);
}

/** Local event name → a valid, non-reserved Firebase event name. */
export function firebaseEventName(name: string): string {
  const s = cleanName(name, NAME_MAX);
  return RESERVED_EVENTS.has(s) ? ('app_' + s).slice(0, NAME_MAX) : s;
}

/**
 * Local params → Firebase params: drop null / undefined, booleans as 0 / 1,
 * strings cut to 100 characters, at most 25 params, names made valid.
 */
export function firebaseParams(params: EventParams = {}): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  let n = 0;
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined) continue;
    if (n >= PARAMS_MAX) break;
    const key = cleanName(k, PARAM_NAME_MAX);
    if (typeof v === 'boolean') out[key] = v ? 1 : 0;
    else if (typeof v === 'number') {
      if (!Number.isFinite(v)) continue;
      out[key] = v;
    } else out[key] = String(v).slice(0, PARAM_VALUE_MAX);
    n += 1;
  }
  return out;
}

/** Product events sent to Firebase. Params carry the loan type / outcome only, never loan inputs. */
export const PRODUCT_EVENTS = new Set(['app_start', 'intro_complete', 'calc_success', 'calc_invalid', 'calc_failure', 'fx_load', 'rating_submit', 'result_share', 'install_attribution']);

/**
 * Which local trace events go to Firebase. Ad-policy events (ad_opportunity,
 * ad_skip, ad_show_* …) only go once a real ad SDK is live: with the NoOp
 * placeholder every opportunity ends as "not_configured", which is noise.
 * Debug-only events never go.
 */
export function shouldForward(name: string, adsLive: boolean): boolean {
  if (name.startsWith('debug_')) return false;
  if (PRODUCT_EVENTS.has(name)) return true;
  return adsLive && name.startsWith('ad_');
}

/** expo-router pathname → stable screen name ("/result/42" → "result/[id]", "/" → "home"). */
export function screenNameFor(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean).map((p) => (/^\d+$/.test(p) ? '[id]' : p));
  return (parts.join('/') || 'home').slice(0, 100);
}

export interface AdImpressionEvent {
  ad_platform: string;
  ad_source: string;
  value: number;
  currency: string;
}

/**
 * Paid-revenue record → Firebase `ad_impression` parameters, or the reason it
 * must not be sent:
 * - test / local mock revenue is never transported;
 * - AdMob already reports ad_impression to a linked Firebase project by itself,
 *   so sending it by hand would count the same revenue twice.
 */
export function adImpressionFor(r: PaidRevenue): { send: true; event: AdImpressionEvent } | { send: false; reason: 'test' | 'auto_collected' | 'invalid' } {
  if (r.isTest || r.origin !== 'provider_sdk') return { send: false, reason: 'test' };
  if (r.provider === 'admob') return { send: false, reason: 'auto_collected' };
  let value: number;
  try {
    value = Number(microsToDecimal(r.valueMicros));
  } catch {
    return { send: false, reason: 'invalid' };
  }
  if (!Number.isFinite(value) || !/^[A-Z]{3}$/.test(r.currency)) return { send: false, reason: 'invalid' };
  return { send: true, event: { ad_platform: r.provider, ad_source: r.mediationNetwork || r.provider, value, currency: r.currency } };
}

/** Remote Config keys this app reads. Absent / empty keys keep the embedded defaults. */
export const RC_KEYS = {
  /** JSON in the same shape as the embedded natural ad preset (caps, intervals, strategies). */
  adConfigNatural: 'ad_config_natural',
  /** JSON for the paid cohort. */
  adConfigPaid: 'ad_config_paid',
} as const;

/** Every value is the empty string by default: "not set remotely, use embedded". */
export const RC_DEFAULTS: Record<string, string> = {
  [RC_KEYS.adConfigNatural]: '',
  [RC_KEYS.adConfigPaid]: '',
};

/** Development fetch interval (0 = always fetch) vs. the production 12 h. */
export function rcMinimumFetchIntervalMs(debugTools: boolean): number {
  return debugTools ? 0 : 12 * 60 * 60 * 1000;
}

/** Shortened FCM token for logs: never print the full registration token. */
export function maskToken(token: string): string {
  return token.length <= 12 ? '***' : `${token.slice(0, 6)}…${token.slice(-4)} (${token.length} chars)`;
}
