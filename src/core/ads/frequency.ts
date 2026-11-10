import type { AdFormat, Provider, SkipReason } from './types.ts';
import type { FormatPolicy } from './config.ts';

export interface Counter {
  lastDate: string; // device-local yyyy-MM-dd
  shows: number;
  clicks: number;
  lastShowAt: number; // wall-clock ms, 0 = never
}

export interface CounterStore {
  get(key: string): Counter | undefined;
  set(key: string, c: Counter): void;
}

export class MemoryCounterStore implements CounterStore {
  private m = new Map<string, Counter>();
  get(key: string) {
    const c = this.m.get(key);
    return c ? { ...c } : undefined;
  }
  set(key: string, c: Counter) {
    this.m.set(key, { ...c });
  }
  dump(): Record<string, Counter> {
    return Object.fromEntries(this.m);
  }
  load(data: Record<string, Counter>) {
    this.m = new Map(Object.entries(data));
  }
}

export function localDateKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const totalKey = (f: AdFormat) => `total:${f}`;
export const platformKey = (p: Provider, f: AdFormat) => `${p}:${f}`;

/**
 * Daily counters at format-total and platform×format scope. A new local calendar
 * date resets show/click counts but NOT lastShowAt (reference behaviour).
 */
export class FrequencyTracker {
  private store: CounterStore;
  constructor(store: CounterStore) {
    this.store = store;
  }

  private read(key: string, now: number): Counter {
    const today = localDateKey(now);
    const c = this.store.get(key) ?? { lastDate: today, shows: 0, clicks: 0, lastShowAt: 0 };
    if (c.lastDate !== today) {
      c.lastDate = today;
      c.shows = 0;
      c.clicks = 0;
      this.store.set(key, c);
    }
    return c;
  }

  counter(key: string, now: number): Counter {
    return this.read(key, now);
  }

  /** Reasons a provider may not show this format now (empty = allowed). */
  check(format: AdFormat, provider: Provider, policy: FormatPolicy, now: number): SkipReason[] {
    const reasons: SkipReason[] = [];
    const t = this.read(totalKey(format), now);
    const p = this.read(platformKey(provider, format), now);
    const pl = policy.platform[provider];
    if (t.shows >= policy.total.maxDailyShow || p.shows >= pl.maxDailyShow) reasons.push('daily_show_cap');
    if (t.clicks >= policy.total.maxDailyClick || p.clicks >= pl.maxDailyClick) reasons.push('daily_click_cap');
    if (p.lastShowAt > 0 && now - p.lastShowAt < pl.minIntervalSec * 1000) reasons.push('interval');
    return reasons;
  }

  recordShow(format: AdFormat, provider: Provider, now: number) {
    for (const key of [totalKey(format), platformKey(provider, format)]) {
      const c = this.read(key, now);
      c.shows += 1;
      c.lastShowAt = now;
      this.store.set(key, c);
    }
  }

  recordClick(format: AdFormat, provider: Provider, now: number) {
    for (const key of [totalKey(format), platformKey(provider, format)]) {
      const c = this.read(key, now);
      c.clicks += 1;
      this.store.set(key, c);
    }
  }
}
