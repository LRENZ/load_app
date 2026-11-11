import { isLanguage, type Language } from './index.ts';

/** What the user picked on the Language page. "system" (the default) follows the device. */
export type LanguagePref = 'system' | Language;

export function isLanguagePref(x: unknown): x is LanguagePref {
  return x === 'system' || isLanguage(x);
}

/** The subset of expo-localization's Locale this needs. */
export interface DeviceLocale {
  languageTag?: string | null;
  languageCode?: string | null;
  languageScriptCode?: string | null;
  regionCode?: string | null;
}

/**
 * Map one device locale to a supported app language, or null.
 * - en-*, es-*, ja-*, ko-* → that language;
 * - pt-* (Brazil, Portugal, …) → pt-BR, the only Portuguese catalogue;
 * - zh-* (Hans, Hant, any region) → zh-Hans, the only Chinese catalogue.
 */
export function languageForLocale(l: DeviceLocale): Language | null {
  const tag = (l.languageTag ?? '').trim();
  const code = (l.languageCode ?? tag.split(/[-_]/)[0] ?? '').toLowerCase();
  switch (code) {
    case 'en':
    case 'es':
    case 'ja':
    case 'ko':
      return code;
    case 'pt':
      return 'pt-BR';
    case 'zh':
      return 'zh-Hans';
    default:
      return null;
  }
}

/**
 * The device's preferred locales are checked in order (Android lets people rank several);
 * the first supported one wins. Nothing supported → English.
 */
export function resolveDeviceLanguage(locales: readonly DeviceLocale[] | null | undefined): Language {
  for (const l of locales ?? []) {
    const lang = languageForLocale(l);
    if (lang) return lang;
  }
  return 'en';
}

/** Effective language for a saved preference. */
export function effectiveLanguage(pref: LanguagePref, locales: readonly DeviceLocale[] | null | undefined): Language {
  return pref === 'system' ? resolveDeviceLanguage(locales) : pref;
}
