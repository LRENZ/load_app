import { PROVIDERS, type Provider } from './types.ts';
import type { RawRiskConfig } from './config.ts';

export const RISK_SIGNALS = ['vpn', 'dns', 'ip', 'simulator', 'adb', 'sim', 'no_gp', 'sys_9_low', 'play'] as const;
export type RiskSignal = (typeof RISK_SIGNALS)[number];
export type RiskSignals = Record<RiskSignal, boolean>;

/**
 * Source of risk signals. The app ships NO device detector: the functional
 * provider reports every signal false. Deterministic fixtures exist only for
 * policy tests and the debug mock mode.
 */
export interface RiskSignalProvider {
  readonly kind: 'none' | 'fixture';
  signals(): RiskSignals;
}

export function noSignals(): RiskSignals {
  return Object.fromEntries(RISK_SIGNALS.map((s) => [s, false])) as RiskSignals;
}

export class NoRiskSignals implements RiskSignalProvider {
  readonly kind = 'none' as const;
  signals() {
    return noSignals();
  }
}

export class FixtureRiskSignals implements RiskSignalProvider {
  readonly kind = 'fixture' as const;
  private value: RiskSignals;
  constructor(value: RiskSignals) {
    this.value = value;
  }
  signals() {
    return { ...this.value };
  }
  set(v: RiskSignals) {
    this.value = { ...v };
  }
}

function mappingFor(cfg: RawRiskConfig, s: RiskSignal): number {
  return (cfg as unknown as Record<string, number>)[`${s}_ad_config`] ?? -1;
}

/** For each true signal: -1 excludes nothing, 0 excludes AdMob, 1 excludes all five providers. */
export function excludedProviders(signals: RiskSignals, cfg: RawRiskConfig): Set<Provider> {
  const out = new Set<Provider>();
  for (const s of RISK_SIGNALS) {
    if (!signals[s]) continue;
    const v = mappingFor(cfg, s);
    if (v === 0) out.add('admob');
    else if (v === 1) PROVIDERS.forEach((p) => out.add(p));
  }
  return out;
}
