import type { Cohort } from './ads/types.ts';
import type { AttributionInfo } from './services/contracts.ts';

const NATURAL_NETWORKS = new Set(['', 'unknown', 'organic', 'untrusted devices', 'google organic search']);

/** Empty, unknown, organic, untrusted devices and Google organic search are natural; any other network is paid. */
export function cohortForNetwork(network: string | null | undefined): Cohort {
  const n = (network ?? '').trim().toLowerCase();
  return NATURAL_NETWORKS.has(n) ? 'natural' : 'paid';
}

export interface StickyCohortStore {
  get(): AttributionInfo | null;
  set(a: AttributionInfo): void;
}

/**
 * The first classification sticks; later attribution callbacks update the
 * stored metadata only if nothing was stored yet.
 */
export function applyAttribution(store: StickyCohortStore, incoming: Omit<AttributionInfo, 'cohort'>): AttributionInfo {
  const existing = store.get();
  if (existing) return existing;
  const info: AttributionInfo = { ...incoming, cohort: cohortForNetwork(incoming.network) };
  store.set(info);
  return info;
}

/** utm_medium values that mean the install came from a bought ad. */
const PAID_MEDIA = new Set(['cpc', 'ppc', 'paid', 'paidsearch', 'paid_search', 'cpi', 'cpa', 'cpm', 'display', 'paidsocial', 'paid_social', 'banner', 'ads', 'ad', 'app_campaign', 'uac']);

/**
 * utm_source values that only ad networks set in the Play referrer, usually without utm_medium
 * (Meta sends utm_source=apps.facebook.com plus encrypted utm_content).
 */
const AD_NETWORK_SOURCE = /(^|\.)(apps\.facebook\.com|apps\.instagram\.com)$|tiktok|bytedance|pangle|applovin|unity(ads)?|ironsource|mintegral|liftoff|vungle|moloco|digitalturbine|appier|kwai|snapchat|twitter|x-ads|reddit-ads/i;

/** Minimal query-string parser (RN's URLSearchParams polyfill has no get() on older engines). */
function parseQuery(q: string): Map<string, string> {
  const out = new Map<string, string>();
  const dec = (s: string) => {
    try {
      return decodeURIComponent(s.replace(/\+/g, ' '));
    } catch {
      return s;
    }
  };
  // The Play API returns the raw referrer; some installs arrive URL-encoded once more.
  const raw = /%3D|%26/i.test(q) && !q.includes('=') ? dec(q) : q;
  for (const part of raw.replace(/^[?#]/, '').split('&')) {
    if (!part) continue;
    const i = part.indexOf('=');
    const k = dec(i < 0 ? part : part.slice(0, i)).trim().toLowerCase();
    const v = dec(i < 0 ? '' : part.slice(i + 1)).trim();
    if (k && !out.has(k)) out.set(k, v);
  }
  return out;
}

const clean = (v: string | undefined, max = 100): string | null => {
  const s = (v ?? '').trim();
  return s && s !== '(not set)' && s !== '(not provided)' ? s.slice(0, max) : null;
};

/**
 * Google Play install referrer → attribution. Only an explicit paid signal makes an install
 * "paid": a Google Ads click id (gclid / gbraid / wbraid), a paid utm_medium (cpc, display, …) or
 * an ad network's own referrer source (apps.facebook.com, TikTok, AppLovin …).
 * Play's own organic value ("utm_source=google-play&utm_medium=organic"), an empty referrer
 * (sideload / no data) and non-paid media (referral, email, social …) are organic.
 */
export function attributionFromReferrer(referrer: string | null | undefined): Omit<AttributionInfo, 'cohort'> {
  const q = parseQuery(referrer ?? '');
  const source = clean(q.get('utm_source'));
  const medium = (clean(q.get('utm_medium')) ?? '').toLowerCase();
  const base = {
    campaign: clean(q.get('utm_campaign')),
    adGroup: clean(q.get('utm_term')),
    creative: clean(q.get('utm_content')),
    fixture: false,
    source: 'install_referrer' as const,
  };
  if (clean(q.get('gclid')) || clean(q.get('gbraid')) || clean(q.get('wbraid'))) {
    return { ...base, network: source && source !== 'google-play' ? `${source} (google ads)` : 'google ads' };
  }
  if (PAID_MEDIA.has(medium)) return { ...base, network: source ?? `paid (${medium})` };
  if (source && AD_NETWORK_SOURCE.test(source)) return { ...base, network: source };
  return { ...base, network: 'organic' };
}

export const DEFAULT_ATTRIBUTION: AttributionInfo = {
  cohort: 'natural',
  network: null,
  campaign: null,
  adGroup: null,
  creative: null,
  fixture: false,
};
