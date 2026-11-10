import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertText, parseToolInput } from '../src/core/converters.ts';
import { applyRate, loadFx, LatestOnly, parseFxPayload, type FxCacheStore, type FxQuote } from '../src/core/fx.ts';
import { timeIn, dateIn } from '../src/core/worldClock.ts';

test('temperature both directions and negatives', () => {
  assert.equal(convertText('temperature', '25', true).output, '77.00');
  assert.equal(convertText('temperature', '77', false).output, '25.00');
  assert.equal(convertText('temperature', '-40', true).output, '-40.00');
  assert.equal(convertText('temperature', '-17.78', true).output, '0.00');
  assert.equal(parseToolInput('-', 'temperature').kind, 'partial');
  assert.deepEqual(parseToolInput('1234567', 'temperature'), { kind: 'error', error: 'integer_too_long' });
  assert.deepEqual(parseToolInput('1.234', 'temperature'), { kind: 'error', error: 'too_many_decimals' });
});

test('mass, speed, length forward and reverse', () => {
  assert.equal(convertText('mass', '10', true).output, '22.0462');
  assert.equal(convertText('mass', '22.0462', false).output, '10.0000');
  assert.equal(convertText('speed', '100', true).output, '62.1371');
  assert.equal(convertText('speed', '62.1371', false).output, '100.0000');
  assert.equal(convertText('length', '1', true).output, '3.2808');
  assert.equal(convertText('length', '3.2808', false).output, '1.0000');
});

test('tool input rejection rules', () => {
  assert.deepEqual(parseToolInput('-5', 'mass'), { kind: 'error', error: 'negative_not_allowed' });
  assert.deepEqual(parseToolInput('1e3', 'speed'), { kind: 'error', error: 'scientific_notation' });
  assert.deepEqual(parseToolInput('1.2.3', 'length'), { kind: 'error', error: 'invalid' });
  assert.deepEqual(parseToolInput('12a', 'length'), { kind: 'error', error: 'invalid_character' });
  assert.deepEqual(parseToolInput('1.23456', 'length'), { kind: 'error', error: 'too_many_decimals' });
  assert.deepEqual(parseToolInput('1234567890123', 'length'), { kind: 'error', error: 'integer_too_long' });
  assert.deepEqual(parseToolInput('', 'length'), { kind: 'empty' });
  assert.deepEqual(parseToolInput('.', 'length'), { kind: 'error', error: 'invalid' });
  assert.deepEqual(parseToolInput('5.', 'length'), { kind: 'value', value: 5 });
});

class MemFx implements FxCacheStore {
  m = new Map<string, FxQuote>();
  async read(f: string, t: string) {
    return this.m.get(`${f}>${t}`) ?? null;
  }
  async write(q: FxQuote) {
    this.m.set(`${q.from}>${q.to}`, q);
  }
}

const RECORDED = { amount: 1, base: 'USD', date: '2026-11-06', rates: { EUR: 0.89566 } };
const okFetch = (body: unknown) => async () => ({ ok: true, status: 200, json: async () => body });

test('FX historical fixture 123.45 USD → EUR = 110.57', async () => {
  const cache = new MemFx();
  const s = await loadFx('USD', 'EUR', { cache, fetch: okFetch(RECORDED), now: () => 1_000 });
  assert.equal(s.kind, 'fresh');
  assert.ok(s.kind === 'fresh' && s.source === 'network');
  assert.equal(applyRate(123.45, (s as { quote: FxQuote }).quote.rate), '110.57');
});

test('FX fresh cache, stale fallback, offline without cache, invalid payload, timeout', async () => {
  const cache = new MemFx();
  await loadFx('USD', 'EUR', { cache, fetch: okFetch(RECORDED), now: () => 0 });
  const fresh = await loadFx('USD', 'EUR', { cache, fetch: async () => { throw new Error('should not fetch'); }, now: () => 60_000 });
  assert.ok(fresh.kind === 'fresh' && fresh.source === 'cache');
  const day = 24 * 3600 * 1000;
  const stale = await loadFx('USD', 'EUR', { cache, fetch: async () => { throw new TypeError('Network request failed'); }, now: () => day + 1 });
  assert.ok(stale.kind === 'stale' && stale.reason === 'offline');
  const none = await loadFx('USD', 'GBP', { cache, fetch: async () => { throw new TypeError('offline'); }, now: () => 5 });
  assert.deepEqual(none, { kind: 'error', reason: 'offline' });
  const bad = await loadFx('USD', 'AUD', { cache, fetch: okFetch({ base: 'USD', rates: { AUD: 'x' }, date: '2026-11-06' }), now: () => 5 });
  assert.deepEqual(bad, { kind: 'error', reason: 'invalid_payload' });
  const slow = await loadFx('USD', 'INR', {
    cache,
    timeoutMs: 20,
    now: () => 5,
    fetch: (_u, signal) => new Promise((_, rej) => signal.addEventListener('abort', () => rej(new Error('aborted')))),
  });
  assert.deepEqual(slow, { kind: 'error', reason: 'timeout' });
  assert.deepEqual(await loadFx('EUR', 'EUR', { cache, fetch: okFetch(RECORDED), now: () => 5 }), { kind: 'same_currency' });
});

test('FX cache from the future is ignored', async () => {
  const cache = new MemFx();
  await cache.write({ schema: 1, from: 'USD', to: 'EUR', rate: 2, date: '2030-01-01', fetchedAt: 10_000 });
  const s = await loadFx('USD', 'EUR', { cache, fetch: okFetch(RECORDED), now: () => 5_000 });
  assert.ok(s.kind === 'fresh' && s.quote.rate === 0.89566);
});

test('FX payload validation and race guard', () => {
  assert.equal(parseFxPayload({ base: 'EUR', rates: { USD: 1 }, date: '2026-01-01' }, 'USD', 'EUR'), null);
  const g = new LatestOnly();
  const a = g.next();
  const b = g.next();
  assert.equal(g.isLatest(a), false);
  assert.equal(g.isLatest(b), true);
});

test('world clock zones', () => {
  const at = new Date(Date.UTC(2026, 6, 1, 12, 0)); // 1 Jul 2026 12:00 UTC (BST / EDT)
  assert.equal(timeIn('Asia/Taipei', at), '20:00');
  assert.equal(timeIn('Europe/London', at), '13:00');
  assert.equal(timeIn('America/New_York', at), '08:00');
  assert.equal(timeIn('Asia/Tokyo', at), '21:00');
  const winter = new Date(Date.UTC(2026, 0, 15, 23, 30));
  assert.equal(timeIn('Europe/London', winter), '23:30');
  assert.equal(timeIn('America/New_York', winter), '18:30');
  assert.equal(dateIn('Asia/Tokyo', winter), '2026-01-16');
});
