/**
 * Firebase wiring (React Native Firebase 27 modular API + expo-notifications
 * for the FCM token). Project / app identity comes from google-services.json
 * at build time (app.json android.googleServicesFile); nothing is hard-coded.
 *
 * - Analytics: product events and screen views. Ad-policy events wait for a
 *   live ad SDK (see shouldForward); mock / debug builds collect nothing.
 * - Crashlytics: fatal JS errors through RNFB's own handler, non-fatal
 *   errors through FirebaseCrashReporter. Off in mock builds.
 * - Remote Config: ad-policy JSON (caps / intervals) per cohort. Values are
 *   activated once at startup and the next fetch applies on the next launch,
 *   so a config never changes in the middle of an ad opportunity. Ad unit IDs
 *   are never taken from Remote Config: units stay empty placeholders.
 * - Messaging: FCM registration token via expo-notifications (the same token
 *   a server uses for FCM HTTP v1). Remote display is handled by the system /
 *   expo-notifications.
 */
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getApp } from '@react-native-firebase/app';
import { getAnalytics, getAppInstanceId, logEvent, logScreenView, setAnalyticsCollectionEnabled, setUserProperty } from '@react-native-firebase/analytics';
import { getCrashlytics, log as crashLog, recordError, setCrashlyticsCollectionEnabled } from '@react-native-firebase/crashlytics';
import { activate, fetchConfig, getRemoteConfig, getString } from '@react-native-firebase/remote-config';
import type { AnalyticsSink, AttributionInfo, CrashReporter, EventParams, MessagingProvider, TokenResult } from '../core/services/contracts.ts';
import type { RevenueLedger } from '../core/ads/revenue.ts';
import {
  adImpressionFor,
  firebaseEventName,
  firebaseParams,
  maskToken,
  RC_DEFAULTS,
  RC_KEYS,
  rcMinimumFetchIntervalMs,
  screenNameFor,
  shouldForward,
} from '../core/services/firebaseMapping.ts';

export interface FirebaseStatus {
  appId: string | null;
  projectId: string | null;
  collection: boolean;
  analyticsInstanceId: string | null;
  remoteConfig: { activated: boolean | null; lastFetchStatus: string; fetchedAt: number | null; error: string | null; keys: Record<string, number> };
  fcm: { status: 'pending' | 'ok' | 'error'; token: string | null; error: string | null };
  revenue: { sent: number; skipped: number; failed: number };
  attribution: { cohort: string; network: string | null; source: string; fresh: boolean } | null;
  errors: string[];
}

const status: FirebaseStatus = {
  appId: null,
  projectId: null,
  collection: false,
  analyticsInstanceId: null,
  remoteConfig: { activated: null, lastFetchStatus: 'not_started', fetchedAt: null, error: null, keys: {} },
  fcm: { status: 'pending', token: null, error: null },
  revenue: { sent: 0, skipped: 0, failed: 0 },
  attribution: null,
  errors: [],
};
const subs = new Set<() => void>();
const changed = () => subs.forEach((f) => f());
export function firebaseStatus(): FirebaseStatus {
  return status;
}
export function onFirebaseStatus(fn: () => void) {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}
function note(err: unknown, where: string) {
  const msg = `${where}: ${err instanceof Error ? err.message : String(err)}`.slice(0, 300);
  status.errors.push(msg);
  if (status.errors.length > 20) status.errors.shift();
  console.warn('[firebase] ' + msg);
  changed();
}

/**
 * Resolves about 1.5 s after it is called, when the JS thread is idle: network / native work that
 * the first screen does not need (Remote Config fetch, FCM token, install referrer) waits for it
 * so it does not compete with the first render.
 */
export function afterFirstScreen(delayMs = 1500): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const ric = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
      if (ric) ric(() => resolve(), { timeout: 2000 });
      else resolve();
    }, delayMs);
  });
}

/** Whether ad-policy analytics may be sent. Stays false until a real ad SDK adapter replaces NoOp. */
export const ADS_LIVE = false;

let collectionEnabled = false;

/** logEvent validates synchronously (throws) and logs asynchronously (may reject); its typings say void. */
async function sendEvent(name: string, params: Record<string, string | number>): Promise<void> {
  const log = logEvent as unknown as (a: ReturnType<typeof getAnalytics>, n: string, p: Record<string, string | number>) => Promise<void> | void;
  await log(getAnalytics(), name, params);
}

export class FirebaseAnalyticsSink implements AnalyticsSink {
  track(name: string, params?: EventParams) {
    if (!collectionEnabled || !shouldForward(name, ADS_LIVE)) return;
    sendEvent(firebaseEventName(name), firebaseParams(params)).catch((e: unknown) => note(e, 'logEvent ' + name));
  }
}

export function trackScreen(pathname: string) {
  if (!collectionEnabled) return;
  const screen = screenNameFor(pathname);
  logScreenView(getAnalytics(), { screen_name: screen, screen_class: screen }).catch((e: unknown) => note(e, 'logScreenView'));
}

export class FirebaseCrashReporter implements CrashReporter {
  record(error: unknown, context?: string) {
    if (!collectionEnabled) return;
    try {
      const c = getCrashlytics();
      if (context) crashLog(c, 'context: ' + context);
      recordError(c, error instanceof Error ? error : new Error(String(error)), context);
    } catch (e) {
      note(e, 'recordError');
    }
  }
}

export class FcmMessagingProvider implements MessagingProvider {
  async remoteToken(): Promise<TokenResult> {
    if (status.fcm.status === 'ok' && status.fcm.token) return { status: 'ok', token: status.fcm.token };
    try {
      const t = await Notifications.getDevicePushTokenAsync();
      const token = typeof t.data === 'string' ? t.data : '';
      if (!token) throw new Error('empty token');
      status.fcm = { status: 'ok', token, error: null };
      console.log('[firebase] fcm token ' + maskToken(token));
      changed();
      return { status: 'ok', token };
    } catch (e) {
      status.fcm = { status: 'error', token: null, error: e instanceof Error ? e.message : String(e) };
      note(e, 'fcm token');
      return { status: 'not_configured' };
    }
  }
}

/** Activated Remote Config ad-policy JSON for a cohort, or null when not set remotely. */
export function remoteAdConfigJson(cohort: 'natural' | 'paid'): string | null {
  try {
    const v = getString(getRemoteConfig(), cohort === 'paid' ? RC_KEYS.adConfigPaid : RC_KEYS.adConfigNatural);
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

async function initRemoteConfig(debugTools: boolean) {
  const rc = getRemoteConfig();
  rc.settings = { minimumFetchIntervalMillis: rcMinimumFetchIntervalMs(debugTools), fetchTimeoutMillis: 30_000 };
  rc.defaultConfig = { ...RC_DEFAULTS };
  try {
    // 1) apply what the previous launch fetched (activation boundary = app start)
    status.remoteConfig.activated = await activate(rc);
  } catch (e) {
    note(e, 'rc activate');
  }
  const readKeys = () => {
    for (const k of Object.values(RC_KEYS)) status.remoteConfig.keys[k] = (remoteAdConfigJsonByKey(k) ?? '').length;
  };
  readKeys();
  await afterFirstScreen();
  try {
    // 2) fetch for the NEXT launch; values are not applied mid-session
    await fetchConfig(rc);
    status.remoteConfig.error = null;
  } catch (e) {
    status.remoteConfig.error = e instanceof Error ? e.message : String(e);
    note(e, 'rc fetch');
  }
  status.remoteConfig.lastFetchStatus = String(rc.lastFetchStatus);
  status.remoteConfig.fetchedAt = rc.fetchTimeMillis > 0 ? rc.fetchTimeMillis : null;
  console.log(`[firebase] remote config activated=${status.remoteConfig.activated} fetch=${status.remoteConfig.lastFetchStatus} keys=${JSON.stringify(status.remoteConfig.keys)}`);
  changed();
}
function remoteAdConfigJsonByKey(k: string): string | null {
  try {
    return getString(getRemoteConfig(), k) || null;
  } catch {
    return null;
  }
}

let started = false;
/**
 * Start Firebase services once. `collect` is false for mock / debug-fixture
 * builds so test traffic and synthetic ad revenue never reach the project.
 */
export function initFirebase(opts: { collect: boolean; debugTools: boolean; ledger: RevenueLedger; messaging: MessagingProvider }) {
  if (started) return;
  started = true;
  collectionEnabled = opts.collect;
  status.collection = opts.collect;
  try {
    const app = getApp();
    status.appId = app.options.appId ?? null;
    status.projectId = app.options.projectId ?? null;
  } catch (e) {
    note(e, 'getApp');
    return;
  }
  void setAnalyticsCollectionEnabled(getAnalytics(), opts.collect).catch((e: unknown) => note(e, 'analytics collection'));
  void setCrashlyticsCollectionEnabled(getCrashlytics(), opts.collect).catch((e: unknown) => note(e, 'crashlytics collection'));
  console.log(`[firebase] app=${status.appId} project=${status.projectId} collection=${opts.collect}`);
  void initRemoteConfig(opts.debugTools);
  void afterFirstScreen().then(() => {
    void opts.messaging.remoteToken();
    void getAppInstanceId(getAnalytics())
      .then((id) => {
        status.analyticsInstanceId = id ?? null;
        changed();
      })
      .catch((e: unknown) => note(e, 'app instance id'));
  });

  // Ad revenue → Firebase ad_impression (real SDK revenue only; nothing while ads are NoOp placeholders).
  const flush = () =>
    opts.ledger
      .flush(async (r) => {
        const d = adImpressionFor(r);
        if (!d.send) {
          status.revenue.skipped += 1;
          return; // handled locally: test / auto-collected / invalid revenue is never transported
        }
        if (!collectionEnabled) throw new Error('collection disabled');
        await sendEvent('ad_impression', { ...d.event });
        status.revenue.sent += 1;
      })
      .then((r) => {
        status.revenue.failed += r.failed;
        if (r.sent || r.failed) changed();
      })
      .catch((e: unknown) => note(e, 'revenue flush'));
  setInterval(flush, 60_000);
  AppState.addEventListener('change', (s) => {
    if (s !== 'active') void flush();
  });
}

/**
 * Traffic cohort as a Firebase user property (natural / paid), so Analytics reports and Remote
 * Config conditions can split by it. Also shown on the diagnostics screen.
 */
export function setTrafficCohort(a: AttributionInfo, fresh: boolean) {
  status.attribution = { cohort: a.cohort, network: a.network, source: a.source ?? 'default', fresh };
  changed();
  if (!collectionEnabled) return;
  setUserProperty(getAnalytics(), 'traffic_cohort', a.cohort).catch((e: unknown) => note(e, 'user property'));
}

/** Debug-only: send one labelled non-fatal so Crashlytics delivery can be checked in the console. */
export function sendTestNonFatal(): boolean {
  if (!collectionEnabled) return false;
  new FirebaseCrashReporter().record(new Error('Repayly Crashlytics test (non-fatal, safe to ignore)'), 'debug.test');
  return true;
}

export { getApp };
