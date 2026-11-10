import type { AdAdapter, CachedAd } from './adapters.ts';
import type { EffectiveAdConfig, RawRiskConfig } from './config.ts';
import { FrequencyTracker } from './frequency.ts';
import { placement } from './placements.ts';
import { excludedProviders, type RiskSignalProvider } from './risk.ts';
import { RevenueLedger } from './revenue.ts';
import { selectCandidate } from './selection.ts';
import {
  PROVIDERS,
  type AdDecision,
  type AdFormat,
  type AdOutcome,
  type Cohort,
  type Impression,
  type PlacementId,
  type Provider,
  type ProviderVerdict,
  type SkipReason,
} from './types.ts';
import type { AnalyticsSink } from '../services/contracts.ts';

export interface GatewayDeps {
  adapter: AdAdapter;
  config: () => EffectiveAdConfig;
  cohort: () => Cohort;
  risk: RiskSignalProvider;
  riskConfig: RawRiskConfig;
  frequency: FrequencyTracker;
  ledger: RevenueLedger;
  analytics: AnalyticsSink;
  now: () => number;
  isOnline: () => boolean;
  isForeground: () => boolean;
  /** Provisional safety net so a stuck presentation can never hold the user. */
  presentTimeoutMs?: number;
}

export interface NativeAdLease {
  ad: CachedAd;
  attemptId: string;
  impression(): void;
  click(): void;
  dispose(): void;
}

export class AdGateway {
  private busy = false;
  private seq = 0;
  private d: GatewayDeps;
  constructor(d: GatewayDeps) {
    this.d = d;
  }

  private attemptId(): string {
    this.seq += 1;
    return `att-${this.d.now()}-${this.seq}`;
  }

  get mode() {
    return this.d.adapter.mode;
  }

  /** Full eligibility evaluation with every reason recorded. */
  decide(placementId: PlacementId): AdDecision & { format: AdFormat } {
    const def = placement(placementId);
    const cfg = this.d.config();
    const now = this.d.now();
    const reasons: SkipReason[] = [];
    if (!def.wired) reasons.push('not_wired');
    if (!cfg.slotSwitch[placementId]) reasons.push('disabled_slot');
    if (def.gate && !cfg.flags[def.gate]) reasons.push('disabled_page');
    const policy = cfg.formats[def.format];
    if (!policy) reasons.push('format_disabled');
    if (!this.d.isForeground()) reasons.push('background');
    if (!this.d.isOnline()) reasons.push('offline');
    const excluded = excludedProviders(this.d.risk.signals(), this.d.riskConfig);
    const perProvider: ProviderVerdict[] = [];
    if (policy) {
      for (const p of PROVIDERS) {
        const r: SkipReason[] = [];
        if (!policy.enabled[p]) r.push('format_disabled');
        const unit = cfg.units[p][def.format];
        if (!unit) r.push('missing_unit');
        if (!this.d.adapter.isInitialized(p)) r.push('not_initialized');
        if (excluded.has(p)) r.push('risk_restricted');
        r.push(...this.d.frequency.check(def.format, p, policy, now));
        if (r.length === 0 && unit && !this.d.adapter.peek(p, def.format, unit, now)) r.push('no_cache');
        perProvider.push({ provider: p, eligible: r.length === 0, reasons: r });
      }
    }
    const enabledProviders = perProvider.filter((v) => !v.reasons.includes('format_disabled'));
    if (policy && enabledProviders.length > 0 && enabledProviders.every((v) => v.reasons.includes('risk_restricted'))) {
      reasons.push('no_platform_available_after_exclusion');
    }
    const candidates = perProvider.filter((v) => v.eligible).map((v) => v.provider);
    if (reasons.length === 0 && candidates.length === 0) {
      const merged = new Set<SkipReason>();
      enabledProviders.forEach((v) => v.reasons.forEach((x) => merged.add(x)));
      reasons.push(...(merged.size ? merged : new Set<SkipReason>(['no_cache'])));
    }
    return { allowed: reasons.length === 0 && candidates.length > 0, candidates, reasons, perProvider, format: def.format };
  }

  /** Background preload for eligible providers without a cache (never shown here). */
  preload(placementId: PlacementId) {
    if (this.d.adapter.mode === 'noop') return;
    const def = placement(placementId);
    const cfg = this.d.config();
    const policy = cfg.formats[def.format];
    if (!def.wired || !policy || !this.d.isOnline()) return;
    const excluded = excludedProviders(this.d.risk.signals(), this.d.riskConfig);
    for (const p of PROVIDERS) {
      const unit = cfg.units[p][def.format];
      if (!policy.enabled[p] || !unit || excluded.has(p)) continue;
      if (this.d.adapter.peek(p, def.format, unit, this.d.now())) continue;
      void this.d.adapter.load(p, def.format, unit).then((r) =>
        this.d.analytics.track(r.ok ? 'ad_load_success' : 'ad_load_failed', {
          placement: placementId,
          provider: p,
          format: def.format,
          reason: r.ok ? undefined : r.reason,
        }),
      );
    }
  }

  /**
   * Full-screen opportunity. Resolves exactly once; the caller continues its
   * navigation after the promise settles, whatever happened.
   */
  showFullScreen(placementId: PlacementId, screen: string): Promise<AdOutcome> {
    const def = placement(placementId);
    const cfg = this.d.config();
    const attemptId = this.attemptId();
    this.d.analytics.track('ad_opportunity', {
      attemptId,
      placement: placementId,
      format: def.format,
      cohort: this.d.cohort(),
      configVersion: cfg.version,
      screen,
      trigger: def.trigger,
    });
    if (this.d.adapter.mode === 'noop') {
      this.d.analytics.track('ad_skip', { attemptId, placement: placementId, reason: 'not_configured' });
      return Promise.resolve({ status: 'deferred', reason: 'not_configured', attemptId });
    }
    const decision = this.decide(placementId);
    if (this.busy) decision.reasons.push('presentation_busy');
    if (!decision.allowed || this.busy) {
      this.d.analytics.track('ad_skip', { attemptId, placement: placementId, reason: decision.reasons.join(',') });
      this.preload(placementId);
      return Promise.resolve({ status: 'skipped', reasons: decision.reasons, attemptId });
    }
    const now = this.d.now();
    const cands = decision.candidates.map((p) => ({
      provider: p,
      value: this.d.adapter.peek(p, def.format, cfg.units[p][def.format]!, now)?.value ?? null,
    }));
    const provider = selectCandidate(cands) as Provider;
    const unit = cfg.units[provider][def.format]!;
    const ad = this.d.adapter.peek(provider, def.format, unit, now);
    if (!ad) {
      // provider became unavailable between selection and show
      this.d.analytics.track('ad_skip', { attemptId, placement: placementId, reason: 'expired' });
      return Promise.resolve({ status: 'skipped', reasons: ['expired'], attemptId });
    }
    ad.state = 'reserved';
    this.busy = true;
    return new Promise<AdOutcome>((resolve) => {
      let settled = false;
      let impression: Impression | null = null;
      const finish = (outcome: AdOutcome) => {
        if (settled) return;
        settled = true;
        this.busy = false;
        clearTimeout(timer);
        this.d.adapter.destroy(ad.handle);
        resolve(outcome);
        this.preload(placementId);
      };
      const timer = setTimeout(
        () => finish({ status: 'failed', reason: 'timeout', attemptId }),
        this.d.presentTimeoutMs ?? 120_000,
      );
      this.d.analytics.track('ad_show_started', { attemptId, placement: placementId, provider });
      this.d.adapter.present(ad, placementId, {
        onShown: () => {},
        onImpression: () => {
          if (impression || settled) return;
          impression = this.makeImpression(attemptId, placementId, def.format, ad);
          this.d.frequency.recordShow(def.format, provider, this.d.now());
          this.d.analytics.track('ad_impression_observed', { ...impression });
        },
        onPaid: (micros, currency, precision) => {
          if (!impression) return;
          this.recordPaid(impression, micros, currency, precision, 'interstitial.onPaid');
        },
        onClick: () => {
          if (settled) return;
          this.d.frequency.recordClick(def.format, provider, this.d.now());
          this.d.analytics.track('ad_click', { attemptId, placement: placementId, provider });
        },
        onDismissed: () => {
          this.d.analytics.track('ad_dismissed', { attemptId, placement: placementId, provider });
          finish(impression ? { status: 'shown', impression, attemptId } : { status: 'failed', reason: 'sdk_error', attemptId });
        },
        onFailed: (reason) => {
          this.d.analytics.track('ad_show_failed', { attemptId, placement: placementId, provider, reason });
          finish({ status: 'failed', reason, attemptId });
        },
      });
    });
  }

  /** Native slot. Returns a lease to render, or null (render nothing). */
  leaseNative(placementId: PlacementId, screen: string): NativeAdLease | null {
    const def = placement(placementId);
    if (this.d.adapter.mode === 'noop' || !def.wired) return null;
    const cfg = this.d.config();
    const decision = this.decide(placementId);
    const attemptId = this.attemptId();
    this.d.analytics.track('ad_opportunity', { attemptId, placement: placementId, format: def.format, screen, cohort: this.d.cohort(), configVersion: cfg.version });
    if (!decision.allowed) {
      this.d.analytics.track('ad_skip', { attemptId, placement: placementId, reason: decision.reasons.join(',') });
      this.preload(placementId);
      return null;
    }
    const now = this.d.now();
    const provider = selectCandidate(
      decision.candidates.map((p) => ({ provider: p, value: this.d.adapter.peek(p, def.format, cfg.units[p][def.format]!, now)?.value ?? null })),
    ) as Provider;
    const ad = this.d.adapter.peek(provider, def.format, cfg.units[provider][def.format]!, now)!;
    let imp: Impression | null = null;
    let disposed = false;
    const lease: NativeAdLease = {
      ad,
      attemptId,
      impression: () => {
        if (imp || disposed) return;
        imp = this.makeImpression(attemptId, placementId, def.format, ad);
        ad.state = 'showing';
        this.d.frequency.recordShow(def.format, provider, this.d.now());
        this.d.analytics.track('ad_impression_observed', { ...imp });
        this.d.adapter.present(ad, placementId, {
          onShown() {},
          onImpression() {},
          onPaid: (micros, currency, precision) => imp && this.recordPaid(imp, micros, currency, precision, 'native.onPaid'),
          onClick() {},
          onDismissed() {},
          onFailed() {},
        });
      },
      click: () => {
        if (disposed) return;
        this.d.frequency.recordClick(def.format, provider, this.d.now());
        this.d.analytics.track('ad_click', { attemptId, placement: placementId, provider });
      },
      dispose: () => {
        if (disposed) return;
        disposed = true;
        this.d.adapter.destroy(ad.handle);
        this.preload(placementId);
      },
    };
    return lease;
  }

  private makeImpression(attemptId: string, placementId: PlacementId, format: AdFormat, ad: CachedAd): Impression {
    return {
      impressionId: `imp-${attemptId}`,
      attemptId,
      provider: ad.provider,
      network: ad.provider,
      unit: ad.unit,
      placementId,
      format,
      timestamp: this.d.now(),
    };
  }

  private recordPaid(imp: Impression, micros: string, currency: string, precision: 'unknown' | 'estimated' | 'publisher_defined' | 'precise', source: string) {
    const isMock = this.d.adapter.mode === 'mock';
    const res = this.d.ledger.record(
      {
        impressionId: imp.impressionId,
        provider: imp.provider,
        mediationNetwork: imp.network,
        valueMicros: micros,
        currency,
        precision,
        sourceCallback: source,
        isTest: isMock,
        origin: isMock ? 'local_mock' : 'provider_sdk',
      },
      this.d.now(),
    );
    if (res === 'recorded') {
      this.d.analytics.track('ad_revenue_received', { impressionId: imp.impressionId, provider: imp.provider, currency, isTest: isMock });
    }
  }
}
