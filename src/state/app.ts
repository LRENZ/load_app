import { useSyncExternalStore } from 'react';
import { DEFAULT_CURRENCY, isCurrency, type CurrencyCode } from '../core/currency.ts';
import { isLanguage, translator, type Language, type Translate } from '../i18n/index.ts';
import { kv, KEYS } from '../storage/kv.ts';

export interface AppState {
  language: Language;
  currency: CurrencyCode;
  notifEnabled: boolean;
  introDone: boolean;
}

function load(): AppState {
  const language = kv.get<string>(KEYS.language, 'en');
  const currency = kv.get<string>(KEYS.currency, DEFAULT_CURRENCY);
  return {
    language: isLanguage(language) ? language : 'en',
    currency: isCurrency(currency) ? currency : DEFAULT_CURRENCY,
    notifEnabled: kv.get<boolean>(KEYS.notif, false),
    introDone: kv.get<boolean>(KEYS.introDone, false),
  };
}

let state: AppState | null = null;
const subs = new Set<() => void>();

function get(): AppState {
  if (!state) state = load();
  return state;
}

function update(patch: Partial<AppState>) {
  state = { ...get(), ...patch };
  subs.forEach((f) => f());
}

export const appStore = {
  get,
  subscribe(fn: () => void) {
    subs.add(fn);
    return () => {
      subs.delete(fn);
    };
  },
  setLanguage(language: Language) {
    kv.set(KEYS.language, language);
    update({ language });
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
