import { useSyncExternalStore } from 'react';
import { AppState as RNAppState } from 'react-native';
import { getLocales } from 'expo-localization';
import { DEFAULT_CURRENCY, isCurrency, type CurrencyCode } from '../core/currency.ts';
import { translator, type Language, type Translate } from '../i18n/index.ts';
import { effectiveLanguage, isLanguagePref, type LanguagePref } from '../i18n/resolve.ts';
import { kv, KEYS } from '../storage/kv.ts';

export interface AppState {
  /** What the user chose: "system" (default) follows the device language. */
  languagePref: LanguagePref;
  /** The language actually shown. */
  language: Language;
  currency: CurrencyCode;
  notifEnabled: boolean;
  introDone: boolean;
}

function deviceLocales() {
  try {
    return getLocales();
  } catch {
    return [];
  }
}

function load(): AppState {
  // No saved choice (fresh install, or an install from before 1.1.0 that never picked one) = follow the device.
  const saved = kv.get<string>(KEYS.language, 'system');
  const languagePref: LanguagePref = isLanguagePref(saved) ? saved : 'system';
  const currency = kv.get<string>(KEYS.currency, DEFAULT_CURRENCY);
  return {
    languagePref,
    language: effectiveLanguage(languagePref, deviceLocales()),
    currency: isCurrency(currency) ? currency : DEFAULT_CURRENCY,
    notifEnabled: kv.get<boolean>(KEYS.notif, false),
    introDone: kv.get<boolean>(KEYS.introDone, false),
  };
}

let state: AppState | null = null;
const subs = new Set<() => void>();

function get(): AppState {
  if (!state) {
    state = load();
    watchDeviceLanguage();
  }
  return state;
}

function update(patch: Partial<AppState>) {
  state = { ...get(), ...patch };
  subs.forEach((f) => f());
}

/** Re-resolve "system" when the device / per-app language changes (live, or on return to the app). */
function refreshFromDevice() {
  const s = get();
  if (s.languagePref !== 'system') return;
  const lang = effectiveLanguage('system', deviceLocales());
  if (lang !== s.language) update({ language: lang });
}

let watching = false;
function watchDeviceLanguage() {
  if (watching) return;
  watching = true;
  // Live changes arrive through useLocales() in the root layout (appStore.refreshFromDevice);
  // returning to the app re-checks too, for changes made in system Settings meanwhile.
  RNAppState.addEventListener('change', (st) => {
    if (st === 'active') refreshFromDevice();
  });
}

export const appStore = {
  get,
  subscribe(fn: () => void) {
    subs.add(fn);
    return () => {
      subs.delete(fn);
    };
  },
  setLanguage(pref: LanguagePref) {
    kv.set(KEYS.language, pref);
    update({ languagePref: pref, language: effectiveLanguage(pref, deviceLocales()) });
  },
  refreshFromDevice,
  /** Language the device would give right now (for the "Use device language" label). */
  deviceLanguage(): Language {
    return effectiveLanguage('system', deviceLocales());
  },
  setCurrency(currency: CurrencyCode) {
    kv.set(KEYS.currency, currency);
    update({ currency });
  },
  setNotifEnabled(v: boolean) {
    kv.set(KEYS.notif, v);
    update({ notifEnabled: v });
  },
  /** Returns false when persisting failed (the intro then stays visible). */
  completeIntro(): boolean {
    const ok = kv.set(KEYS.introDone, true);
    if (ok) update({ introDone: true });
    return ok;
  },
  /** Debug only: show the intro again on next launch. */
  resetIntro() {
    kv.set(KEYS.introDone, false);
    update({ introDone: false });
  },
};

export function useApp(): AppState & { t: Translate } {
  const s = useSyncExternalStore(appStore.subscribe, appStore.get, appStore.get);
  return { ...s, t: translator(s.language) };
}
