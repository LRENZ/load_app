// Emulator scenarios for the standalone (functional, NoOp ads) APK.
// Usage: node scripts/emu/run-functional.mjs [outDir]   (app must be installed)
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  back, dump, expect, find, forceStop, hideKeyboard, launch, longPress, PKG, scenario, screenshot,
  scrollUntil, setBeforeEach, setField, setOutDir, shell, sleep, summary, tap, texts, waitFor,
} from './driver.mjs';

const out = process.argv[2] || 'evidence/functional';
setOutDir(out);
// Keep one failure from cascading: every scenario starts with the app in the foreground.
setBeforeEach(async (id) => {
  if (id === 'INST01') return;
  hideKeyboard();
  if (!shell('dumpsys activity activities | grep topResumedActivity').includes(PKG)) {
    launch();
    await waitFor({ id: 'tab-index' }, 30_000);
  }
});
const today = new Date();
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const plusMonths = (d, n) => {
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  return new Date(t.getFullYear(), t.getMonth(), Math.min(d.getDate(), last));
};
const has = (s) => texts().some((x) => x.includes(s));
async function expectText(s, timeout = 8000) {
  await waitFor({ contains: s }, timeout);
}
async function goHome() {
  hideKeyboard();
  if (!shell('dumpsys activity activities | grep topResumedActivity').includes(PKG)) {
    launch();
    await waitFor({ id: 'tab-index' }, 30_000);
  }
  for (let i = 0; i < 6 && !find({ id: 'tab-index' }); i++) {
    back();
    await sleep(700);
  }
  await tap({ id: 'tab-index' });
}
async function fillLoan({ amount, rate, term, unit, date }) {
  await setField('input-amount', amount);
  await setField('input-rate', rate);
  await setField('input-term', term);
  hideKeyboard();
  if (unit) {
    await tap({ id: 'term-unit' });
    await tap({ id: `term-unit-${unit}` });
  }
  if (date) {
    await tap({ id: 'start-date' });
    await tap({ id: 'date-mode-toggle' });
    await setField('date-text-input', date);
    await tap({ id: 'date-ok' });
  }
  hideKeyboard();
}
async function calculate() {
  hideKeyboard();
  await scrollUntil({ id: 'calculate' });
  await tap({ id: 'calculate' });
}
async function resultValue(id) {
  const n = await waitFor({ id });
  return n.text;
}
async function openTile(type) {
  await goHome();
  await tap({ id: `tile-${type}` });
  await waitFor({ id: type === 'mortgage' ? 'input-homePrice' : 'input-amount' });
}

const t0 = Date.now();

await scenario('INST01', 'fresh install: intro pages, Next/Start, persistent completion', async () => {
  launch({ clear: true });
  await waitFor({ id: 'intro-page-1' }, 30_000);
  screenshot('intro-1');
  await tap({ id: 'intro-next' });
  await waitFor({ id: 'intro-page-2' });
  screenshot('intro-2');
  await tap({ id: 'intro-next' });
  await waitFor({ id: 'intro-start' });
  screenshot('intro-3');
  await tap({ id: 'intro-start' });
  // Home is reached; on a fresh install the first-run notification prompt covers it.
  await waitFor({ id: 'notif-prompt' });
});

await scenario('NOT01', 'first-run notification prompt → Not now', async () => {
  await waitFor({ id: 'notif-prompt' });
  screenshot('notif-prompt');
  await tap({ id: 'notif-prompt-later' });
  await sleep(500);
  expect(!find({ id: 'notif-prompt' }), 'prompt still visible');
});

await scenario('ONB02', 'intro does not return after restart', async () => {
  launch();
  await waitFor({ id: 'tile-personal' }, 30_000);
  expect(!find({ id: 'intro-page-1' }), 'intro shown again');
  expect(!find({ id: 'notif-prompt' }), 'prompt shown again');
});

await scenario('UI03', 'home with sample history', async () => {
  await waitFor({ id: 'history-sample' });
  expect(has('£10,000.00'), 'sample amount missing');
  screenshot('home-sample');
});

await scenario('C01', 'personal 10000 @ 6% 12 months → 860.66 / 10327.92 / 327.92', async () => {
  await openTile('personal');
  screenshot('personal-form-empty');
  await fillLoan({ amount: '10000', rate: '6', term: '12' });
  screenshot('personal-form-filled');
  await calculate();
  expect((await resultValue('r-monthly')) === '£860.66', 'monthly');
  expect((await resultValue('r-total')) === '£10,327.92', 'total');
  expect((await resultValue('r-interest')) === '£327.92', 'interest');
  expect((await resultValue('r-payoff')) === iso(plusMonths(today, 12)), `payoff ${find({ id: 'r-payoff' })?.text}`);
  screenshot('C01-result');
});

await scenario('NAV01', 'Back from result keeps form input; Back again → home with saved entry', async () => {
  back();
  await waitFor({ id: 'input-amount' });
  expect(find({ id: 'input-amount' }).text === '10000', 'amount lost');
  back();
  await waitFor({ id: 'tile-personal' });
  expect(!find({ id: 'history-sample' }), 'sample still shown');
  expect(has('£10,000.00'), 'saved record missing');
  screenshot('home-history-1');
});

await scenario('VAL01', 'validation messages (empty, zero, term range)', async () => {
  await openTile('personal');
  await calculate();
  await expectText('Enter a loan amount.');
  screenshot('VAL-empty-amount');
  await setField('input-amount', '0');
  hideKeyboard();
  await calculate();
  await expectText('Enter an amount from 0.01');
  await setField('input-amount', '500');
  hideKeyboard();
  await calculate();
  await expectText('Enter an annual interest rate.');
  await setField('input-rate', '101');
  hideKeyboard();
  await calculate();
  await expectText('Enter a rate from 0% to 100%');
  await setField('input-rate', '5');
  await setField('input-term', '361');
  hideKeyboard();
  await calculate();
  await expectText('1 to 360 months');
  await tap({ id: 'term-unit' });
  screenshot('term-menu');
  await tap({ id: 'term-unit-years' });
  await setField('input-term', '31');
  hideKeyboard();
  await calculate();
  await expectText('1 to 30 years');
  await tap({ id: 'reset-fields' });
  expect(find({ id: 'input-amount' }).text !== '500', 'reset did not clear');
});

await scenario('C02', 'zero rate + month-end via text date 01/31/2026', async () => {
  await fillLoan({ amount: '100', rate: '0', term: '3', unit: 'months', date: '01/31/2026' });
  await calculate();
  expect((await resultValue('r-monthly')) === '£33.33', 'monthly');
  expect((await resultValue('r-total')) === '£100.00', 'total');
  expect((await resultValue('r-interest')) === '£0.00', 'interest');
  expect((await resultValue('r-payoff')) === '2026-04-30', 'payoff');
  screenshot('C02-result');
  back();
});

await scenario('C05', '1000 @ 12% 1 month from 2026-01-31 → 1010.00, 2026-02-28', async () => {
  await waitFor({ id: 'input-amount' });
  await fillLoan({ amount: '1000', rate: '12', term: '1', date: '01/31/2026' });
  await calculate();
  expect((await resultValue('r-monthly')) === '£1,010.00', 'monthly');
  expect((await resultValue('r-interest')) === '£10.00', 'interest');
  expect((await resultValue('r-payoff')) === '2026-02-28', 'payoff');
  back();
});

await scenario('C03', 'monthly payment too small (1 @ 0% 360 months)', async () => {
  await waitFor({ id: 'input-amount' });
  await fillLoan({ amount: '1', rate: '0', term: '360' });
  await calculate();
  await expectText('Monthly payment is too small');
});

await scenario('C04', 'rounded total below principal (0.17 @ 0.0001% 12 months)', async () => {
  await fillLoan({ amount: '0.17', rate: '0.0001', term: '12' });
  await calculate();
  await expectText('Total repayment cannot be below');
  screenshot('C04-failure');
});

await scenario('DATE01', 'date picker: calendar, month arrows, year list, invalid text, Cancel keeps date', async () => {
  const before = find({ id: 'start-date' }) && texts().find((x) => /^\d{4}-\d{2}-\d{2}$/.test(x));
  await tap({ id: 'start-date' });
  await waitFor({ id: 'date-picker' });
  screenshot('date-calendar');
  await tap({ id: 'date-next' });
  await tap({ id: 'date-prev' });
  await tap({ id: 'date-year-toggle' });
  await waitFor({ id: 'date-year-list' });
  screenshot('date-years');
  await tap({ id: 'date-year-toggle' });
  await tap({ id: 'date-mode-toggle' });
  await setField('date-text-input', '02/30/2026');
  await tap({ id: 'date-ok' });
  await expectText('Invalid date format.');
  screenshot('date-text-invalid');
  await tap({ id: 'date-cancel' });
  await sleep(400);
  const after = texts().find((x) => /^\d{4}-\d{2}-\d{2}$/.test(x));
  expect(before === after, `date changed ${before} → ${after}`);
  // Android Back closes the dialog without committing
  await tap({ id: 'start-date' });
  await tap({ id: 'date-day-1' });
  hideKeyboard();
  back();
  await sleep(500);
  expect(!find({ id: 'date-picker' }), 'dialog still open after Back');
  expect(texts().find((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)) === before, 'Back committed the date');
});

await scenario('CUR01', 'currency picker: Cancel does not commit, Confirm commits', async () => {
  await tap({ id: 'currency-button' });
  await waitFor({ id: 'currency-picker' });
  await tap({ id: 'currency-USD' });
  screenshot('currency-pending-usd');
  await tap({ id: 'currency-cancel' });
  await sleep(400);
  expect(find({ id: 'currency-button' })['content-desc']?.includes('GBP') || has('GBP'), 'cancel committed');
  await tap({ id: 'currency-button' });
  await tap({ id: 'currency-AUD' });
  await tap({ id: 'currency-confirm' });
  await sleep(500);
  expect((find({ id: 'currency-button' })['content-desc'] || '').includes('AUD'), 'confirm not committed');
  await fillLoan({ amount: '100000', rate: '10', term: '24', unit: 'months' });
  await calculate();
  expect((await resultValue('r-monthly')).startsWith('A$'), 'currency symbol not A$');
  screenshot('AUD-result');
  back();
  await tap({ id: 'currency-button' });
  await tap({ id: 'currency-GBP' });
  await tap({ id: 'currency-confirm' });
});

await scenario('C07', 'business 12347.89 @ 7.125% 17 months → 765.77', async () => {
  await openTile('business');
  await fillLoan({ amount: '12347.89', rate: '7.125', term: '17', unit: 'months' });
  await calculate();
  expect((await resultValue('r-monthly')) === '£765.77', 'monthly');
  expect((await resultValue('r-total')) === '£13,018.09', 'total');
  expect((await resultValue('r-interest')) === '£670.20', 'interest');
  screenshot('C07-business-result');
});

await scenario('EDIT01', 'Start new calculation clears the form', async () => {
  await tap({ id: 'new-calculation' });
  await waitFor({ id: 'input-amount' });
  expect(!find({ id: 'input-amount' }).text || find({ id: 'input-amount' }).text === 'Enter loan amount', 'form not cleared');
});

await scenario('C06', 'auto 25000 @ 5% 5 years → 471.78', async () => {
  await openTile('auto');
  await fillLoan({ amount: '25000', rate: '5', term: '5', unit: 'years' });
  await calculate();
  expect((await resultValue('r-monthly')) === '£471.78', 'monthly');
  expect((await resultValue('r-total')) === '£28,306.80', 'total');
  expect((await resultValue('r-interest')) === '£3,306.80', 'interest');
  screenshot('C06-auto-result');
  await tap({ id: 'edit-calculation' });
  await waitFor({ id: 'input-amount' });
  expect(find({ id: 'input-amount' }).text === '25000', 'edit lost input');
});

await scenario('C08', 'mortgage 500000 / 100000 (20%) 6% 30y + costs → 3298.20', async () => {
  await openTile('mortgage');
  await setField('input-homePrice', '500000');
  await setField('input-downPayment', '100000');
  hideKeyboard();
  expect(find({ id: 'input-downPaymentPercent' }).text === '20', `percent ${find({ id: 'input-downPaymentPercent' }).text}`);
  await setField('input-downPaymentPercent', '25');
  hideKeyboard();
  expect(find({ id: 'input-downPayment' }).text === '125000', `amount ${find({ id: 'input-downPayment' }).text}`);
  await setField('input-downPaymentPercent', '20');
  await setField('input-term', '30');
  await setField('input-rate', '6');
  hideKeyboard();
  await scrollUntil({ id: 'input-insurance' });
  await setField('input-propertyTax', '6000');
  await setField('input-pmi', '1200');
  await setField('input-hoa', '2400');
  await setField('input-insurance', '1200');
  hideKeyboard();
  screenshot('mortgage-form');
  await calculate();
  expect((await resultValue('r-monthly-total')) === '£3,298.20', 'monthly total');
  expect((await resultValue('r-pi')) === '£2,398.20', 'P&I');
  expect((await resultValue('r-principal')) === '£400,000.00', 'principal');
  screenshot('C08-mortgage-result');
});

await scenario('HIST01', 'history after process restart: all records, newest first, opening a record', async () => {
  forceStop();
  launch();
  await waitFor({ id: 'tile-personal' }, 30_000);
  const nodes = dump();
  const hist = nodes.filter((n) => /history-\d+/.test(n['resource-id'] || '')).sort((a, b) => a.box.y1 - b.box.y1);
  expect(hist.length >= 1, 'no history after restart');
  expect((hist[0]['content-desc'] || '').startsWith('Mortgage'), `newest first? ${hist[0]['content-desc']}`);
  screenshot('home-history-after-restart');
  await tap({ id: hist[0]['resource-id'].replace(/^.*:id\//, '') });
  expect((await resultValue('r-monthly-total')) === '£3,298.20', 'record did not reopen');
  back();
  await waitFor({ id: 'tile-personal' });
  await longPress({ id: hist[0]['resource-id'].replace(/^.*:id\//, '') });
  await expectText('Delete this calculation?');
  screenshot('history-delete-confirm');
  await tap({ text: 'CANCEL' }).catch(() => tap({ text: 'Cancel' }));
});

for (const [tool, input, expected, reverse] of [
  ['temperature', '25', '77.00', '-40'],
  ['mass', '10', '22.0462', null],
  ['speed', '100', '62.1371', null],
  ['length', '1', '3.2808', null],
]) {
  await scenario(`TOOL-${tool}`, `${tool}: ${input} → ${expected}, swap, invalid input`, async () => {
    await goHome();
    await tap({ id: 'tab-tools' });
    await tap({ id: `tool-${tool}` });
    await setField('conv-input', input);
    await sleep(300);
    expect(find({ id: 'conv-output' }).text === expected, `got ${find({ id: 'conv-output' }).text}`);
    screenshot(`tool-${tool}`);
    await tap({ id: 'swap' });
    expect(find({ id: 'conv-output' }).text.startsWith(input), `reverse ${find({ id: 'conv-output' }).text}`);
    if (reverse) {
      await setField('conv-input', reverse);
      expect(find({ id: 'conv-output' }).text === '-40.00', 'negative temperature');
    } else {
      await setField('conv-input', '-5');
      await expectText('Negative values are not allowed.');
    }
    await setField('conv-input', '1e3');
    await expectText('Scientific notation');
    hideKeyboard();
    back();
  });
}

await scenario('FX01', 'exchange rate: live USD→EUR, amount, swap, cache', async () => {
  await tap({ id: 'tool-fx' });
  await waitFor({ id: 'fx-rate-line' }, 25_000);
  const line = find({ id: 'fx-rate-line' }).text;
  expect(/^1 USD = [\d.]+ EUR$/.test(line), `rate line ${line}`);
  await setField('fx-amount', '123.45');
  hideKeyboard();
  const rate = Number(line.split(' = ')[1].split(' ')[0]);
  const exp = (Math.round(123.45 * rate * 100) / 100).toFixed(2);
  expect(find({ id: 'fx-output' }).text === exp, `output ${find({ id: 'fx-output' }).text} vs ${exp}`);
  screenshot('fx-live');
  await tap({ id: 'swap' });
  await waitFor({ contains: '1 EUR = ' }, 25_000);
  screenshot('fx-swapped');
  back();
});

await scenario('CLOCK01', 'world clock shows four zones', async () => {
  await tap({ id: 'tool-clock' });
  for (const c of ['taipei', 'london', 'new_york', 'tokyo']) {
    const n = await waitFor({ id: `clock-${c}` });
    expect(/^\d{2}:\d{2}$/.test(n.text), `${c} ${n.text}`);
  }
  const zone = (z) => new Intl.DateTimeFormat('en-GB', { timeZone: z, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
  const tokyo = find({ id: 'clock-tokyo' }).text;
  expect(tokyo === zone('Asia/Tokyo') || tokyo === zone('Asia/Tokyo').replace(/\d$/, (d) => String(+d - 1)), `tokyo ${tokyo} vs ${zone('Asia/Tokyo')}`);
  screenshot('world-clock');
  back();
});

await scenario('RATE01', 'rating dialog: star selection, Submit, Close', async () => {
  await tap({ id: 'tab-settings' });
  screenshot('settings');
  await tap({ id: 'settings-rate' });
  await waitFor({ id: 'rating-dialog' });
  screenshot('rating-empty');
  await tap({ id: 'rating-star-4' });
  screenshot('rating-4');
  await tap({ id: 'rating-submit' });
  await expectText('Thanks for your 4-star rating!');
  await tap({ id: 'settings-rate' });
  await tap({ id: 'rating-close' });
  expect(!find({ id: 'rating-dialog' }), 'close failed');
});

await scenario('LEGAL01', 'privacy and terms: placeholder content, scroll, Back', async () => {
  await tap({ id: 'settings-privacy' });
  await waitFor({ id: 'legal-placeholder' });
  screenshot('privacy');
  back();
  await tap({ id: 'settings-terms' });
  await waitFor({ id: 'legal-body' });
  screenshot('terms');
  back();
  await waitFor({ id: 'settings-terms' });
});

await scenario('NOT02', 'notification permission: deny keeps switch off', async () => {
  // Revoking a runtime permission restarts the app process, so relaunch and open Settings.
  shell(`pm revoke ${PKG} android.permission.POST_NOTIFICATIONS`);
  shell(`pm clear-permission-flags ${PKG} android.permission.POST_NOTIFICATIONS user-set user-fixed`);
  launch();
  await waitFor({ id: 'tab-settings' }, 30_000);
  await tap({ id: 'tab-settings' });
  expect(find({ id: 'settings-notif-switch' }).checked === 'false', 'switch on without permission');
  await tap({ id: 'settings-notif-switch' });
  await tap({ contains: 't allow' }, 10_000);
  await sleep(800);
  expect(find({ id: 'settings-notif-switch' }).checked === 'false', 'switch on after deny');
  screenshot('notif-denied');
});

await scenario('NOT03', 'notification permission: grant shows a local preview', async () => {
  await sleep(3500);
  await tap({ id: 'tab-settings' });
  await tap({ id: 'settings-notif-switch' });
  const allow = await waitFor({ text: 'Allow' }, 10_000).catch(() => null);
  if (allow) await tap({ text: 'Allow' });
  await sleep(1500);
  expect(find({ id: 'settings-notif-switch' }).checked === 'true', 'switch off after grant');
  const notifs = shell('dumpsys notification --noredact');
  expect(notifs.includes(PKG) && /Live exchange rate|1 USD =|1 EUR =/.test(notifs), 'preview notification not found');
  shell('cmd statusbar expand-notifications');
  await sleep(1200);
  screenshot('notif-preview-shade');
  shell('cmd statusbar collapse');
  await sleep(500);
  launch();
  await waitFor({ id: 'tile-personal' }, 20_000);
  await tap({ id: 'tab-settings' });
  expect(find({ id: 'settings-notif-switch' }).checked === 'true', 'switch not persisted');
});

const LANGS = [
  ['es', 'Calculadora de préstamos EMI', 'Ajustes'],
  ['zh-Hans', 'EMI 贷款计算器', '设置'],
  ['ja', 'EMI ローン計算機', '設定'],
  ['ko', 'EMI 대출 계산기', '설정'],
  ['pt-BR', 'Calculadora de empréstimo EMI', 'Configurações'],
];
await scenario('LANG00', 'language: Back without Confirm does not change language', async () => {
  await tap({ id: 'tab-settings' });
  await tap({ id: 'settings-language' });
  await tap({ id: 'lang-ja' });
  back();
  await waitFor({ id: 'settings-language' });
  expect(has('Settings'), 'language changed without confirm');
});
for (const [code, homeTitle, settingsTitle] of LANGS) {
  await scenario(`LANG-${code}`, `language ${code} applies app-wide and survives restart`, async () => {
    await tap({ id: 'tab-settings' });
    await tap({ id: 'settings-language' });
    await tap({ id: `lang-${code}` });
    await tap({ id: 'lang-confirm' });
    await waitFor({ text: settingsTitle });
    screenshot(`lang-${code}-settings`);
    forceStop();
    launch();
    await waitFor({ text: homeTitle }, 30_000);
    screenshot(`lang-${code}-home`);
    await tap({ id: 'tile-personal' });
    await calculate();
    await sleep(600);
    screenshot(`lang-${code}-validation`);
    back();
    await tap({ id: 'tab-tools' });
    screenshot(`lang-${code}-tools`);
  });
}
await scenario('LANG-en', 'back to English', async () => {
  await tap({ id: 'tab-settings' });
  await tap({ id: 'settings-language' });
  await tap({ id: 'lang-en' });
  await tap({ id: 'lang-confirm' });
  await waitFor({ text: 'Settings' });
});

await scenario('LAYOUT360', '360 dp width: home, form and result remain usable', async () => {
  const density = shell('wm density').trim();
  shell('wm density 480'); // 1080 px / 480 dpi × 160 = 360 dp
  try {
    await sleep(2500);
    launch();
    await waitFor({ id: 'tile-personal' }, 30_000);
    screenshot('w360-home');
    await tap({ id: 'tile-mortgage' });
    await waitFor({ id: 'input-homePrice' });
    screenshot('w360-mortgage-form');
    await setField('input-homePrice', '500000');
    screenshot('w360-keyboard');
    hideKeyboard();
    back();
    await tap({ id: 'tile-personal' });
    await fillLoan({ amount: '10000', rate: '6', term: '12', unit: 'months' });
    await calculate();
    await waitFor({ id: 'r-monthly' });
    screenshot('w360-result');
  } finally {
    shell('wm density reset');
    await sleep(2000);
    void density;
  }
});

await scenario('BACK01', 'Android Back on Home leaves the app (no exit ad in NoOp)', async () => {
  launch();
  await waitFor({ id: 'tile-personal' }, 30_000);
  back();
  await sleep(1500);
  const top = shell('dumpsys activity activities | grep -E "topResumedActivity|mResumedActivity"');
  expect(!top.includes(PKG), `app still resumed: ${top.trim()}`);
});

writeFileSync(join(out, 'summary.json'), JSON.stringify({ startedAt: new Date(t0).toISOString(), ms: Date.now() - t0, results: summary() }, null, 2));
const failed = summary().filter((r) => r.status === 'fail');
console.log(`\n${summary().length - failed.length}/${summary().length} passed`);
process.exit(failed.length ? 1 : 0);
