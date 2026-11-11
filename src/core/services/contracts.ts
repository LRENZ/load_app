/**
 * External-service contracts. Every implementation in this phase is local or
 * NoOp; real Firebase / attribution / messaging adapters plug in later
 * (see FUTURE_INTEGRATIONS.md). Nothing here performs network requests.
 */
import type { Cohort } from '../ads/types.ts';

export type EventParams = Record<string, string | number | boolean | null | undefined>;

export interface AnalyticsSink {
  track(name: string, params?: EventParams): void;
}

export interface TraceEntry {
  at: number;
  name: string;
  params: EventParams;
}

/** In-memory ordered trace (bounded); inspectable from the debug screen. */
export class LocalAnalyticsSink implements AnalyticsSink {
  private buf: TraceEntry[] = [];
  private now: () => number;
  private max: number;
  constructor(now: () => number = Date.now, max = 500) {
    this.now = now;
    this.max = max;
  }
  track(name: string, params: EventParams = {}) {
    this.buf.push({ at: this.now(), name, params });
    if (this.buf.length > this.max) this.buf.shift();
  }
  entries(): TraceEntry[] {
    return [...this.buf];
  }
  clear() {
    this.buf = [];
  }
}

export interface ConfigSnapshot<T> {
  value: T;
  source: 'bundled' | 'remote' | 'default';
  version: string;
  fetchedAt: number | null;
}

export interface ConfigProvider<T> {
  getSnapshot(): ConfigSnapshot<T>;
  subscribe(fn: (s: ConfigSnapshot<T>) => void): () => void;
}

export class BundledConfigProvider<T> implements ConfigProvider<T> {
  private subs = new Set<(s: ConfigSnapshot<T>) => void>();
  private snap: ConfigSnapshot<T>;
  constructor(snap: ConfigSnapshot<T>) {
    this.snap = snap;
  }
  getSnapshot() {
    return this.snap;
  }
  /** Activation boundary: callers apply a new snapshot between opportunities. */
  replace(s: ConfigSnapshot<T>) {
    this.snap = s;
    this.subs.forEach((f) => f(s));
  }
  subscribe(fn: (s: ConfigSnapshot<T>) => void) {
    this.subs.add(fn);
    return () => {
      this.subs.delete(fn);
    };
  }
}

export interface CrashReporter {
  record(error: unknown, context?: string): void;
}

export class LocalCrashReporter implements CrashReporter {
  readonly items: { at: number; message: string; context?: string }[] = [];
  record(error: unknown, context?: string) {
    const message = error instanceof Error ? error.message : String(error);
    this.items.push({ at: Date.now(), message, context });
    if (this.items.length > 100) this.items.shift();
  }
}

export type TokenResult = { status: 'not_configured' } | { status: 'ok'; token: string };

export interface MessagingProvider {
  remoteToken(): Promise<TokenResult>;
}

export class NoOpRemoteMessagingProvider implements MessagingProvider {
  async remoteToken(): Promise<TokenResult> {
    return { status: 'not_configured' };
  }
}

export interface AttributionInfo {
  cohort: Cohort;
  network: string | null;
  campaign: string | null;
  adGroup: string | null;
  creative: string | null;
  /** true when the value came from a local debug fixture (never real paid traffic) */
  fixture: boolean;
  /** Where the classification came from (absent on records stored before 1.1.0). */
  source?: 'install_referrer' | 'mmp' | 'fixture' | 'default';
}

export interface AttributionProvider {
  current(): AttributionInfo;
  subscribe(fn: (a: AttributionInfo) => void): () => void;
}
