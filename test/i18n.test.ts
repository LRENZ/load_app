import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGS, translator, termLabel } from '../src/i18n/index.ts';
import { en } from '../src/i18n/en.ts';

test('every language has every key, non-empty, with the same placeholders', () => {
  const keys = Object.keys(en) as (keyof typeof en)[];
  for (const [lang, cat] of Object.entries(CATALOGS)) {
    assert.deepEqual(Object.keys(cat).sort(), [...keys].sort(), `${lang} key set`);
    for (const k of keys) {
      assert.ok(cat[k].length > 0, `${lang}.${k} empty`);
      const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
      assert.equal(vars(cat[k]), vars(en[k]), `${lang}.${k} placeholders`);
    }
  }
});

test('non-English catalogs are actually translated', () => {
  for (const [lang, cat] of Object.entries(CATALOGS)) {
    if (lang === 'en') continue;
    const same = (Object.keys(en) as (keyof typeof en)[]).filter((k) => cat[k] === en[k] && !/^(\{|1 \{|PMI|HOA|OK|Loan Calc)/.test(en[k]));
    assert.ok(same.length < 15, `${lang} has ${same.length} untranslated: ${same.join(', ')}`);
  }
});

test('interpolation and term labels', () => {
  const t = translator('en');
  assert.equal(t('fx_rate_line', { from: 'USD', rate: '0.8957', to: 'EUR' }), '1 USD = 0.8957 EUR');
  assert.equal(termLabel(t, 1, 'months'), '1 Month');
  assert.equal(termLabel(t, 12, 'months'), '12 Months');
  assert.equal(termLabel(translator('zh-Hans'), 2, 'years'), '2 年');
});
