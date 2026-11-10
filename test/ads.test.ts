import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AdGateway } from '../src/core/ads/gateway.ts';
import { NoOpAdAdapter } from '../src/core/ads/adapters.ts';
import { MockAdAdapter, DEFAULT_MOCK_SCENARIO } from '../src/core/ads/mockAdapter.ts';
import { FrequencyTracker, MemoryCounterStore } from '../src/core/ads/frequency.ts';
import { RevenueLedger, microsToDecimal, decimalToMicros } from '../src/core/ads/revenue.ts';
import { excludedProviders, FixtureRiskSignals, noSignals } from '../src/core/ads/risk.ts';
import { selectCandidate, admobValueFromMicros, pangleValueFromString } from '../src/core/ads/selection.ts';
import { mockUnits, normalizeAdConfig, resolveAdConfig, type EffectiveAdConfig } from '../src/core/ads/config.ts';
import { CACHED_NATURAL, CACHED_PAID, EMBEDDED_NATURAL, RISK_CONFIG } from '../src/core/ads/presets.ts';
import { PLACEMENTS } from '../src/core/ads/placements.ts';
import { LocalAnalyticsSink } from '../src/core/services/contracts.ts';
import { applyAttribution, cohortForNetwork } from '../src/core/cohort.ts';
import type { Cohort } from '../src/core/ads/types.ts';

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

function setup(opts: { cohort?: Cohort; noop?: boolean; online?: boolean; cfg?: EffectiveAdConfig } = {}) {
  let now = new Date(2026, 10, 10, 10, 0, 0).getTime();
  const clock = { get: () => now, advance: (ms: number) => (now += ms), set: (t: number) => (now = t) };
  const adapter = opts.noop ? new NoOpAdAdapter() : new MockAdAdapter(() => now, (fn) => setTimeout(fn, 0));
  const cohort = opts.cohort ?? 'natural';
  const cfg =
    opts.cfg ??
    normalizeAdConfig(cohort === 'paid' ? CACHED_PAID : CACHED_NATURAL, {
      version: `cached-${cohort}`,
      provenance: 'stored',
      units: mockUnits(),
    });
  const store = new MemoryCounterStore();
  const analytics = new LocalAnalyticsSink(() => now);
  const ledger = new RevenueLedger();
  const risk = new FixtureRiskSignals(noSignals());
  let online = opts.online ?? true;
  const gw = new AdGateway({
    adapter,
    config: () => cfg,
    cohort: () => cohort,
    risk,
    riskConfig: RISK_CONFIG,
    frequency: new FrequencyTracker(store),
    ledger,
    analytics,
    now: () => now,
    isOnline: () => online,
    isForeground: () => true,
    presentTimeoutMs: 2000,
  });
  return { gw, adapter, clock, store, analytics, ledger, risk, setOnline: (v: boolean) => (online = v), cfg };
}

async function warm(gw: AdGateway, id: Parameters<AdGateway['preload']>[0]) {
  gw.preload(id);
  await tick(5);
}

test('every placement in the registry: 25 ids, uninstall and config-only keys unwired', () => {
  assert.equal(PLACEMENTS.length, 25);
  const unwired = PLACEMENTS.filter((p) => !p.wired).map((p) => p.id).sort();
  assert.deepEqual(unwired, ['BA_HOME', 'IV_UNINSTALL_1', 'NA_ONBOARDING', 'NA_UNINSTALL_1_BOTTOM', 'NA_UNINSTALL_2_BOTTOM']);
});

test('NoOp: every wired opportunity continues once with deferred, no impression or revenue', async () => {
  const { gw, ledger, analytics } = setup({ noop: true });
  for (const p of PLACEMENTS) {
    if (p.format === 'native' || p.format === 'banner') {
      assert.equal(gw.leaseNative(p.id, 'test'), null);
      continue;
    }
    const out = await gw.showFullScreen(p.id, 'test');
    assert.equal(out.status, 'deferred');
  }
  assert.equal(ledger.list().length, 0);
  assert.equal(analytics.entries().filter((e) => e.name === 'ad_impression_observed').length, 0);
});

test('mock success path: impression, synthetic revenue isTest/local_mock, one continuation', async () => {
  const { gw, ledger } = setup();
  await warm(gw, 'IV_CALCULATION_COMPLETE');
  const out = await gw.showFullScreen('IV_CALCULATION_COMPLETE', 'result');
  assert.equal(out.status, 'shown');
  const rows = ledger.list();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].revenue.isTest, true);
  assert.equal(rows[0].revenue.origin, 'local_mock');
  assert.equal(rows[0].revenue.valueMicros, '2000');
});

test('mock: no cache on first opportunity → skipped, never blocks', async () => {
  const { gw } = setup();
  const out = await gw.showFullScreen('IV_CALCULATION_COMPLETE', 'result');
  assert.equal(out.status, 'skipped');
  assert.ok(out.status === 'skipped' && out.reasons.includes('no_cache'));
});

test('mock: duplicate callbacks resolve once and record one paid event', async () => {
  const { gw, adapter, ledger } = setup();
  (adapter as MockAdAdapter).scenarios.admob = { ...DEFAULT_MOCK_SCENARIO, duplicateCallbacks: true };
  await warm(gw, 'IV_CALCULATION_COMPLETE');
  let continuations = 0;
  await gw.showFullScreen('IV_CALCULATION_COMPLETE', 'r').then(() => continuations++);
  await tick(5);
  assert.equal(continuations, 1);
  assert.equal(ledger.list().length, 1);
  assert.equal(ledger.duplicateCount(), 1);
});

test('mock: show failure and no fill continue', async () => {
  const a = setup();
  (a.adapter as MockAdAdapter).scenarios.admob = { ...DEFAULT_MOCK_SCENARIO, showFails: true, duplicateCallbacks: true };
  await warm(a.gw, 'IV_CALCULATION_COMPLETE');
  const out = await a.gw.showFullScreen('IV_CALCULATION_COMPLETE', 'r');
  assert.deepEqual({ s: out.status, r: out.status === 'failed' && out.reason }, { s: 'failed', r: 'sdk_error' });
  const b = setup();
  (b.adapter as MockAdAdapter).scenarios.admob = { ...DEFAULT_MOCK_SCENARIO, fill: 'no_fill' };
  await warm(b.gw, 'IV_CALCULATION_COMPLETE');
  const out2 = await b.gw.showFullScreen('IV_CALCULATION_COMPLETE', 'r');
  assert.equal(out2.status, 'skipped');
});

test('natural cap: AdMob 2 shows per day for interstitials; interval 120 s; midnight resets counts', async () => {
  const { gw, clock } = setup();
  const show = async () => {
    await warm(gw, 'IV_CALCULATION_COMPLETE');
    return gw.showFullScreen('IV_CALCULATION_COMPLETE', 'r');
  };
  assert.equal((await show()).status, 'shown');
  clock.advance(119_999);
  const tooSoon = await show();
  assert.ok(tooSoon.status === 'skipped' && tooSoon.reasons.includes('interval'));
  clock.advance(1);
  assert.equal((await show()).status, 'shown');
  clock.advance(200_000);
  const capped = await show();
  assert.ok(capped.status === 'skipped' && capped.reasons.includes('daily_show_cap'));
  // next local day: counts reset (lastShowAt kept but interval already elapsed)
  const d = new Date(clock.get());
  clock.set(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 1).getTime());
  assert.equal((await show()).status, 'shown');
});

test('paid cohort: multiple providers, highest value wins, ties keep provider order', async () => {
  const { gw, adapter, ledger } = setup({ cohort: 'paid' });
  const m = adapter as MockAdAdapter;
  m.scenarios.admob = { ...DEFAULT_MOCK_SCENARIO, value: 0.001 };
  m.scenarios.pangle = { ...DEFAULT_MOCK_SCENARIO, value: 0.005 };
  m.scenarios.topon = { ...DEFAULT_MOCK_SCENARIO, value: 0.005 };
  m.scenarios.max = { ...DEFAULT_MOCK_SCENARIO, value: 0.002 };
  await warm(gw, 'IV_CALCULATION_COMPLETE');
  const out = await gw.showFullScreen('IV_CALCULATION_COMPLETE', 'r');
  assert.ok(out.status === 'shown' && out.impression.provider === 'pangle');
  assert.equal(ledger.list()[0].revenue.provider, 'pangle');
  assert.equal(selectCandidate([{ provider: 'max', value: null }, { provider: 'admob', value: undefined }]), 'admob');
  assert.equal(admobValueFromMicros(2500), 0.0025);
  assert.equal(pangleValueFromString('0.004'), 0.004);
  assert.equal(pangleValueFromString('x'), 0);
});

test('risk mapping: -1 none, 0 AdMob, 1 all; natural with excluded AdMob has no provider', async () => {
  const sig = { ...noSignals(), simulator: true };
  assert.equal(excludedProviders(sig, { ...RISK_CONFIG, simulator_ad_config: -1 }).size, 0);
  assert.deepEqual([...excludedProviders(sig, { ...RISK_CONFIG, simulator_ad_config: 0 })], ['admob']);
  assert.equal(excludedProviders(sig, { ...RISK_CONFIG, simulator_ad_config: 1 }).size, 5);
  // the reference cache has 0 for every signal → a true signal excludes AdMob
  const { gw, risk } = setup();
  await warm(gw, 'IV_CALCULATION_COMPLETE');
  risk.set(sig);
  const out = await gw.showFullScreen('IV_CALCULATION_COMPLETE', 'r');
  assert.ok(out.status === 'skipped' && out.reasons.includes('no_platform_available_after_exclusion'));
});

test('disabled gates: layer2PageEnterEnabled=false and adHomeExitEnabled=false skip; unwired never shown', async () => {
  const { gw } = setup();
  await warm(gw, 'IV_ENTER_SECONDARY');
  const a = await gw.showFullScreen('IV_ENTER_SECONDARY', 'x');
  assert.ok(a.status === 'skipped' && a.reasons.includes('disabled_page'));
  const b = await gw.showFullScreen('IV_EXIT_APP', 'home');
  assert.ok(b.status === 'skipped' && b.reasons.includes('disabled_page'));
  const c = await gw.showFullScreen('IV_UNINSTALL_1', 'x');
  assert.ok(c.status === 'skipped' && c.reasons.includes('not_wired'));
});

test('offline and expired cache', async () => {
  const s = setup();
  await warm(s.gw, 'IV_CALCULATION_COMPLETE');
  s.setOnline(false);
  const off = await s.gw.showFullScreen('IV_CALCULATION_COMPLETE', 'r');
  assert.ok(off.status === 'skipped' && off.reasons.includes('offline'));
  s.setOnline(true);
  s.clock.advance(DEFAULT_MOCK_SCENARIO.ttlMs + 1);
  const exp = await s.gw.showFullScreen('IV_CALCULATION_COMPLETE', 'r');
  assert.ok(exp.status === 'skipped' && exp.reasons.includes('no_cache'));
});

test('two simultaneous full-screen triggers: second is presentation_busy', async () => {
  const { gw, adapter } = setup({ cohort: 'paid' });
  const m = adapter as MockAdAdapter;
  let close: (() => void) | null = null;
  m.presenter = (p) => {
    close = p.close;
  };
  await warm(gw, 'IV_CALCULATION_COMPLETE');
  const first = gw.showFullScreen('IV_CALCULATION_COMPLETE', 'r');
  const second = await gw.showFullScreen('IV_LANGUAGE_CONFIRM', 'lang');
  assert.ok(second.status === 'skipped' && second.reasons.includes('presentation_busy'));
  close!();
  assert.equal((await first).status, 'shown');
});

test('native lease: mount counts one impression, dispose is idempotent', async () => {
  const { gw, ledger, analytics } = setup();
  await warm(gw, 'NA_HOME');
  const lease = gw.leaseNative('NA_HOME', 'home');
  assert.ok(lease);
  lease.impression();
  lease.impression();
  lease.dispose();
  lease.dispose();
  assert.equal(analytics.entries().filter((e) => e.name === 'ad_impression_observed').length, 1);
  assert.equal(ledger.list().length, 1);
});

test('config resolution: stored → embedded → fallback on malformed', () => {
  const units = mockUnits();
  assert.equal(resolveAdConfig(JSON.stringify(CACHED_PAID), EMBEDDED_NATURAL, { version: 'v', units }).provenance, 'stored');
  assert.equal(resolveAdConfig('', EMBEDDED_NATURAL, { version: 'v' }).provenance, 'embedded');
  assert.equal(resolveAdConfig(null, EMBEDDED_NATURAL, { version: 'v' }).provenance, 'embedded');
  const bad = resolveAdConfig('{not json', EMBEDDED_NATURAL, { version: 'v' });
  assert.equal(bad.provenance, 'fallback_default');
  assert.equal(bad.formats.interstitial?.total.maxDailyShow, 10);
  // caps of 0 are coerced to 1 (a 0 cap is not a disable switch)
  const nat = normalizeAdConfig(CACHED_NATURAL, { version: 'v', provenance: 'stored' });
  assert.equal(nat.formats.interstitial?.platform.pangle.maxDailyShow, 1);
  assert.equal(nat.formats.interstitial?.enabled.pangle, false);
  assert.equal(nat.formats.interstitial?.platform.admob.minIntervalSec, 120);
  assert.equal(nat.formats.full_screen_native, nat.formats.native);
});

test('revenue ledger: micros conversion, dedupe, transport replay', async () => {
  assert.equal(microsToDecimal('2000'), '0.002000');
  assert.equal(microsToDecimal('1234567'), '1.234567');
  assert.equal(microsToDecimal('0'), '0.000000');
  assert.equal(decimalToMicros('1.2345675'), '1234568');
  assert.equal(decimalToMicros('0.002'), '2000');
  const l = new RevenueLedger();
  const r = { impressionId: 'i1', provider: 'admob' as const, mediationNetwork: 'admob', valueMicros: '1500', currency: 'USD', precision: 'estimated' as const, sourceCallback: 'x', isTest: true, origin: 'local_mock' as const };
  assert.equal(l.record(r, 1), 'recorded');
  assert.equal(l.record(r, 2), 'duplicate');
  l.record({ ...r, impressionId: 'i2', currency: 'EUR', valueMicros: '7' }, 3);
  let calls = 0;
  const flaky = async () => {
    calls++;
    if (calls === 1) throw new Error('network');
  };
  assert.deepEqual(await l.flush(flaky), { sent: 1, failed: 1 });
  assert.deepEqual(await l.flush(flaky), { sent: 1, failed: 0 });
  assert.deepEqual(await l.flush(flaky), { sent: 0, failed: 0 });
  assert.deepEqual(l.totals(true), { USD: '0.001500', EUR: '0.000007' });
  assert.deepEqual(l.totals(false), {});
});

test('cohort classification is sticky', () => {
  assert.equal(cohortForNetwork(''), 'natural');
  assert.equal(cohortForNetwork('Organic'), 'natural');
  assert.equal(cohortForNetwork('Google Organic Search'), 'natural');
  assert.equal(cohortForNetwork('Untrusted Devices'), 'natural');
  assert.equal(cohortForNetwork('Facebook Installs'), 'paid');
  let stored: ReturnType<typeof applyAttribution> | null = null;
  const store = { get: () => stored, set: (a: typeof stored) => (stored = a) };
  const first = applyAttribution(store as never, { network: 'Organic', campaign: null, adGroup: null, creative: null, fixture: true });
  const second = applyAttribution(store as never, { network: 'TikTok', campaign: 'c', adGroup: null, creative: null, fixture: true });
  assert.equal(first.cohort, 'natural');
  assert.equal(second.cohort, 'natural');
});
