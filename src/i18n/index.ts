import { en, type StringKey, type Strings } from './en.ts';
import { es } from './es.ts';
import { zh } from './zh.ts';
import { ja } from './ja.ts';
import { ko } from './ko.ts';
import { pt } from './pt.ts';

export type Language = 'en' | 'es' | 'zh-Hans' | 'ja' | 'ko' | 'pt-BR';

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'zh-Hans', label: '简体中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'pt-BR', label: 'Português (Brasil)' },
];

export const CATALOGS: Record<Language, Strings> = { en, es, 'zh-Hans': zh, ja, ko, 'pt-BR': pt };

export function isLanguage(x: unknown): x is Language {
  return typeof x === 'string' && LANGUAGES.some((l) => l.code === x);
}

export type Translate = (key: StringKey, vars?: Record<string, string | number>) => string;

export function translator(lang: Language): Translate {
  const cat = CATALOGS[lang] ?? en;
  return (key, vars) => {
    let s = cat[key] ?? en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
    return s;
  };
}

export function termLabel(t: Translate, value: number, unit: 'months' | 'years'): string {
  if (unit === 'years') return t(value === 1 ? 'year_1' : 'years_n', { n: value });
  return t(value === 1 ? 'month_1' : 'months_n', { n: value });
}

export type { StringKey, Strings };
