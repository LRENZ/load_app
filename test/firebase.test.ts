import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adImpressionFor, firebaseEventName, firebaseParams, maskToken, RC_DEFAULTS, RC_KEYS, rcMinimumFetchIntervalMs, screenNameFor, shouldForward } from '../src/core/services/firebaseMapping.ts';
import { resolveAdConfig, emptyUnits } from '../src/core/ads/config.ts';
import { EMBEDDED_NATURAL } from '../src/core/ads/presets.ts';
import type { PaidRevenue } from '../src/core/ads/types.ts';

test('event names: reserved names get app_ prefix, invalid characters and prefixes fixed, 40 chars max', () => {
  assert.equal(firebaseEventName('calc_success'), 'calc_success');
  assert.equal(firebaseEventName('ad_click'), 'app_ad_click');
  assert.equal(firebaseEventName('ad_impression'), 'app_ad_impression');
  assert.equal(firebaseEventName('error'), 'app_error');
  assert.equal(firebaseEventName('firebase_x'), 'x_firebase_x');
  assert.equal(firebaseEventName('google_y'), 'x_google_y');
  assert.equal(firebaseEventName('fx-load.v2'), 'fx_load_v2');
  assert.equal(firebaseEventName('1st'), 'e_1st');
  assert.equal(firebaseEventName('a'.repeat(60)).length, 40);
});

test('params: null/undefined dropped, booleans 0/1, strings ≤ 100, ≤ 25 params', () => {
  assert.deepEqual(firebaseParams({ a: 1, b: 'x', c: true, d: false, e: null, f: undefined, g: Number.NaN }), { a: 1, b: 'x', c: 1, d: 0 });
  assert.equal((firebaseParams({ s: 'z'.repeat(300) }).s as string).length, 100);
  const many: Record<string, number> = {};
  for (let i = 0; i < 40; i++) many['p' + i] = i;
  assert.equal(Object.keys(firebaseParams(many)).length, 25);
  assert.deepEqual(firebaseParams({ 'bad-key': 1 }), { bad_key: 1 });
});

const rev = (o: Partial<PaidRevenue> = {}): PaidRevenue => ({
  impressionId: 'i1',
  provider: 'max',
  mediationNetwork: 'applovin',
  valueMicros: '1234567',
  currency: 'USD',
  precision: 'precise',
  sourceCallback: 'onAdRevenuePaid',
  isTest: false,
  origin: 'provider_sdk',
  ...o,
});

test('ad revenue → ad_impression: real SDK revenue only, AdMob left to auto-collection', () => {
  assert.deepEqual(adImpressionFor(rev()), { send: true, event: { ad_platform: 'max', ad_source: 'applovin', value: 1.234567, currency: 'USD' } });
  assert.deepEqual(adImpressionFor(rev({ isTest: true })), { send: false, reason: 'test' });
  assert.deepEqual(adImpressionFor(rev({ origin: 'local_mock' })), { send: false, reason: 'test' });
  assert.deepEqual(adImpressionFor(rev({ provider: 'admob' })), { send: false, reason: 'auto_collected' });
  assert.deepEqual(adImpressionFor(rev({ provider: 'gam', mediationNetwork: '' })), { send: true, event: { ad_platform: 'gam', ad_source: 'gam', value: 1.234567, currency: 'USD' } });
  assert.deepEqual(adImpressionFor(rev({ valueMicros: '1.5' })), { send: false, reason: 'invalid' });
  assert.deepEqual(adImpressionFor(rev({ currency: 'usd' })), { send: false, reason: 'invalid' });
});

test('remote config: defaults are empty, so the embedded ad preset applies until a valid remote JSON exists', () => {
  assert.deepEqual(Object.keys(RC_DEFAULTS).sort(), [RC_KEYS.adConfigNatural, RC_KEYS.adConfigPaid].sort());
  const opts = { version: 'v', units: emptyUnits() };
  assert.equal(resolveAdConfig(RC_DEFAULTS[RC_KEYS.adConfigNatural] || null, EMBEDDED_NATURAL, opts).provenance, 'embedded');
  assert.equal(resolveAdConfig('{bad json', EMBEDDED_NATURAL, opts).provenance, 'fallback_default');
  const remote = resolveAdConfig(JSON.stringify(EMBEDDED_NATURAL), EMBEDDED_NATURAL, opts);
  assert.equal(remote.provenance, 'stored');
  // A remote policy never brings ad unit IDs: units stay empty placeholders, so NoOp shows nothing.
  assert.deepEqual(remote.units, emptyUnits());
  assert.equal(rcMinimumFetchIntervalMs(true), 0);
  assert.equal(rcMinimumFetchIntervalMs(false), 43_200_000);
});

test('forwarding: product events go, ad-policy events wait for a live ad SDK, debug events never', () => {
  for (const e of ['app_start', 'calc_success', 'calc_invalid', 'calc_failure', 'fx_load', 'rating_submit', 'intro_complete']) assert.equal(shouldForward(e, false), true, e);
  for (const e of ['ad_opportunity', 'ad_skip', 'ad_show_started', 'ad_impression_observed']) {
    assert.equal(shouldForward(e, false), false, e);
    assert.equal(shouldForward(e, true), true, e);
  }
  assert.equal(shouldForward('debug_outcome_a', true), false);
  assert.equal(shouldForward('something_else', true), false);
});

test('screen names: numeric ids collapsed, root is home', () => {
  assert.equal(screenNameFor('/'), 'home');
  assert.equal(screenNameFor('/result/42'), 'result/[id]');
  assert.equal(screenNameFor('/loan/personal'), 'loan/personal');
  assert.equal(screenNameFor('/tools/exchange'), 'tools/exchange');
});

test('FCM token is masked in logs', () => {
  assert.equal(maskToken('abcdefghijklmnopqrstuvwxyz'), 'abcdef…wxyz (26 chars)');
  assert.equal(maskToken('short'), '***');
});
