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

export const DEFAULT_ATTRIBUTION: AttributionInfo = {
  cohort: 'natural',
  network: null,
  campaign: null,
  adGroup: null,
  creative: null,
  fixture: false,
};
