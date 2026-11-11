import Storage from 'expo-sqlite/kv-store';

/** Small synchronous key-value store (SQLite-backed, survives restarts). */
export const kv = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = Storage.getItemSync(key);
      return raw == null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T): boolean {
    try {
      Storage.setItemSync(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key: string) {
    try {
      Storage.removeItemSync(key);
    } catch {
      /* ignore */
    }
  },
};

export const KEYS = {
  language: 'pref.language',
  currency: 'pref.currency',
  notif: 'pref.notification_enabled',
  notifPrompted: 'pref.notification_prompted',
  introDone: 'onboarding_completed_v1',
  lastFxPair: 'fx.last_pair',
  fxCache: (from: string, to: string) => `fx.cache.${from}.${to}`,
  ratings: 'rating.local_submissions',
  adCounters: 'ads.frequency_counters',
  attribution: 'attribution.sticky',
  attributionTries: 'attribution.referrer_tries',
  debugAdMode: 'debug.ad_mode',
  debugCohort: 'debug.cohort_fixture',
  debugRisk: 'debug.risk_fixture',
  debugScenario: 'debug.mock_scenario',
};
