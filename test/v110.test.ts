import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectiveLanguage, isLanguagePref, languageForLocale, resolveDeviceLanguage } from '../src/i18n/resolve.ts';
import { applyAttribution, attributionFromReferrer, cohortForNetwork } from '../src/core/cohort.ts';
import { repaymentSplit } from '../src/core/breakdown.ts';
import { PLACEMENTS } from '../src/core/ads/placements.ts';
import { normalizeAdConfig, resolveAdConfig, emptyUnits } from '../src/core/ads/config.ts';
import { CACHED_NATURAL, CACHED_PAID, EMBEDDED_NATURAL, EMBEDDED_PAID } from '../src/core/ads/presets.ts';
import type { AttributionInfo } from '../src/core/services/contracts.ts';

const loc = (tag: string, script?: string) => ({ languageTag: tag, languageCode: tag.split('-')[0], languageScriptCode: script ?? null, regionCode: tag.split('-')[1] ?? null });

test('device language: each supported language, region variants, first supported wins, fallback English', () => {
  assert.equal(resolveDeviceLanguage([loc('es-MX')]), 'es');
  assert.equal(resolveDeviceLanguage([loc('pt-PT')]), 'pt-BR');
  assert.equal(resolveDeviceLanguage([loc('pt-BR')]), 'pt-BR');
  assert.equal(resolveDeviceLanguage([loc('zh-CN', 'Hans')]), 'zh-Hans');
  assert.equal(resolveDeviceLanguage([loc('zh-TW', 'Hant')]), 'zh-Hans');
  assert.equal(resolveDeviceLanguage([loc('ja-JP')]), 'ja');
  assert.equal(resolveDeviceLanguage([loc('ko-KR')]), 'ko');
  assert.equal(resolveDeviceLanguage([loc('en-GB')]), 'en');
  // unsupported first choice → the next preferred locale
  assert.equal(resolveDeviceLanguage([loc('fr-FR'), loc('de-DE'), loc('ja-JP')]), 'ja');
  assert.equal(resolveDeviceLanguage([loc('fr-FR')]), 'en');
  assert.equal(resolveDeviceLanguage([]), 'en');
  assert.equal(resolveDeviceLanguage(null), 'en');
  // tag only (no languageCode)
  assert.equal(languageForLocale({ languageTag: 'ko_KR' }), 'ko');
});

test('language preference: "system" follows the device, an explicit choice wins', () => {
  assert.equal(effectiveLanguage('system', [loc('ko-KR')]), 'ko');
  assert.equal(effectiveLanguage('ja', [loc('ko-KR')]), 'ja');
  assert.ok(isLanguagePref('system'));
  assert.ok(isLanguagePref('zh-Hans'));
  assert.ok(!isLanguagePref('fr'));
  assert.ok(!isLanguagePref(null));
});

test('install referrer → traffic cohort: only explicit paid signals are paid', () => {
  const c = (r: string | null) => cohortForNetwork(attributionFromReferrer(r).network);
  // organic
  assert.equal(c('utm_source=google-play&utm_medium=organic'), 'natural');
  assert.equal(c(''), 'natural');
  assert.equal(c(null), 'natural');
  assert.equal(c('utm_source=newsletter&utm_medium=email'), 'natural');
  assert.equal(c('utm_source=(not%20set)&utm_medium=(not%20set)'), 'natural');
  // paid
  assert.equal(c('gclid=Cj0KCQiA&utm_source=google&utm_medium=cpc'), 'paid');
  assert.equal(c('gclid=Cj0KCQiA'), 'paid');
  assert.equal(c('gbraid=0AAAA'), 'paid');
  assert.equal(c('utm_source=facebook&utm_medium=paid_social&utm_campaign=launch'), 'paid');
  assert.equal(c('utm_medium=cpc'), 'paid');
  assert.equal(c('utm_source=apps.facebook.com&utm_campaign=fb4a&utm_content=%7B%22app%22%3A1%7D'), 'paid');
  assert.equal(c('utm_source=tiktok&utm_campaign=x'), 'paid');
  assert.equal(c('utm_source=facebook.com&utm_medium=referral'), 'natural');
  // URL-encoded once more (some installs)
  assert.equal(c('utm_source%3Dgoogle%26utm_medium%3Dcpc'), 'paid');
  const a = attributionFromReferrer('gclid=X&utm_source=google&utm_medium=cpc&utm_campaign=Spring%20Sale&utm_term=emi&utm_content=ad1');
  assert.deepEqual(a, { network: 'google (google ads)', campaign: 'Spring Sale', adGroup: 'emi', creative: 'ad1', fixture: false, source: 'install_referrer' });
  assert.equal(attributionFromReferrer('gclid=X&utm_source=google-play').network, 'google ads');
});

test('install referrer classification is sticky (first value wins)', () => {
  let stored: AttributionInfo | null = null;
  const store = { get: () => stored, set: (x: AttributionInfo) => void (stored = x) };
  assert.equal(applyAttribution(store, attributionFromReferrer('gclid=abc')).cohort, 'paid');
  assert.equal(applyAttribution(store, attributionFromReferrer('utm_medium=organic')).cohort, 'paid');
});

test('repayment split: exact one-decimal shares that add up to 100', () => {
  assert.deepEqual(repaymentSplit('10000.00', '10327.92'), { principalPct: '96.8', interestPct: '3.2', principalFraction: 0.968 });
  assert.deepEqual(repaymentSplit('100.00', '100.00'), { principalPct: '100.0', interestPct: '0.0', principalFraction: 1 });
  assert.deepEqual(repaymentSplit('400000.00', '863353.93'), { principalPct: '46.3', interestPct: '53.7', principalFraction: 0.463 });
  assert.equal(repaymentSplit('5', '0').principalPct, '100.0');
  assert.equal(repaymentSplit(null, null).interestPct, '0.0');
  assert.equal(repaymentSplit('abc', '10').principalPct, '100.0');
});

test('ad readiness: every wired placement has a format config in both cohorts; cohorts really differ', () => {
  const cfg = {
    natural: normalizeAdConfig(EMBEDDED_NATURAL, { version: 'n', provenance: 'embedded', units: emptyUnits() }),
    paid: normalizeAdConfig(EMBEDDED_PAID, { version: 'p', provenance: 'embedded', units: emptyUnits() }),
  };
  for (const p of PLACEMENTS.filter((x) => x.wired)) {
    for (const [cohort, c] of Object.entries(cfg)) {
      assert.ok(c.formats[p.format], `${p.id}: no ${p.format} config for ${cohort}`);
    }
  }
  assert.notDeepEqual(EMBEDDED_NATURAL, EMBEDDED_PAID, 'natural and paid presets are identical');
  assert.notDeepEqual(CACHED_NATURAL, CACHED_PAID);
  // Unit IDs are placeholders: nothing in the shipped config can request a real ad.
  const units = resolveAdConfig(null, EMBEDDED_PAID, { version: 'x', units: emptyUnits() }).units;
  for (const byFormat of Object.values(units)) for (const id of Object.values(byFormat ?? {})) assert.ok(!id, 'a real unit id shipped');
});
