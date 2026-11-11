// Emulator scenarios for the standalone (functional, NoOp ads) APK.
// Usage: node scripts/emu/run-functional.mjs [outDir]   (app must be installed)
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  back, dump, expect, find, forceStop, hideKeyboard, launch, longPress, PKG, scenario, screenshot, typeText,
  scrollUntil, setBeforeEach, setField, setOutDir, shell, sleep, summary, tap, texts, waitFor,
} from './driver.mjs';

const out = process.argv[2] || 'evidence/functional';
setOutDir(out);
// Firebase: Analytics DebugView for this package + verbose SDK logs (read by FB04 / FB05; set before the app starts).
for (const c of [`setprop debug.firebase.analytics.app ${PKG}`, 'setprop log.tag.FA VERBOSE', 'setprop log.tag.FA-SVC VERBOSE', 'setprop log.tag.FirebaseCrashlytics DEBUG']) shell(c);
// Keep one failure from cascading: every scenario starts with the app in the foreground.
setBeforeEach(async (id) => {
  if (id === 'INST01') return;
  hideKeyboard();
  if (!shell('dumpsys activity activities | grep topResumedActivity').includes(PKG)) {
    launch();
    await waitFor({ id: 'tab-index' }, 60_000);
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
    await waitFor({ id: 'tab-index' }, 60_000);
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
// Validation messages live in a 3.5 s snackbar while a uiautomator dump waits for an idle screen, so a single
// check can miss it. Each Calculate on invalid input shows the same message again: retry the tap up to 3 times.
async function calculateExpectSnack(text) {
  for (let i = 0; i < 3; i++) {
    await calculate();
    const t = Date.now();
    while (Date.now() - t < 3000) {
      if (has(text)) return;
      await sleep(150);
    }
  }
  throw new Error('validation message not seen after 3 taps: ' + text);
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
  await calculateExpectSnack('Enter a loan amount.');
  screenshot('VAL-empty-amount');
  await setField('input-amount', '0');
  hideKeyboard();
  await calculateExpectSnack('Enter an amount from 0.01');
  await setField('input-amount', '500');
  hideKeyboard();
  await calculateExpectSnack('Enter an annual interest rate.');
  await setField('input-rate', '101');
  hideKeyboard();
  await calculateExpectSnack('Enter a rate from 0% to 100%');
  await setField('input-rate', '5');
  await setField('input-term', '361');
  hideKeyboard();
  await calculateExpectSnack('1 to 360 months');
  await tap({ id: 'term-unit' });
  screenshot('term-menu');
  await tap({ id: 'term-unit-years' });
  await setField('input-term', '31');
  hideKeyboard();
  await calculateExpectSnack('1 to 30 years');
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
  if (!find({ id: 'input-amount' })) await openTile('personal');
  await fillLoan({ amount: '1', rate: '0', term: '360' });
  await calculateExpectSnack('Monthly payment is too small');
});

await scenario('C04', 'rounded total below principal (0.17 @ 0.0001% 12 months)', async () => {
  await fillLoan({ amount: '0.17', rate: '0.0001', term: '12' });
  await calculateExpectSnack('Total repayment cannot be below');
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
  await goHome();
  await tap({ id: 'tab-tools' });
  await tap({ id: 'tool-fx' });
  // live network call: one Retry if the rate service is slow (the app shows its own Retry)
  try {
    await waitFor({ id: 'fx-rate-line' }, 25_000);
  } catch {
    await tap({ text: 'Retry' });
  }
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
  await goHome();
  await tap({ id: 'tab-tools' });
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

await scenario('RATE01', 'rating: 1–3 stars = local thanks; 4–5 stars open the Google Play listing; Close', async () => {
  await goHome();
  await tap({ id: 'tab-settings' });
  screenshot('settings');
  // low rating: stays in the app with a thank-you (3.5 s snackbar → repeat until caught)
  let seen = false;
  for (let i = 0; i < 3 && !seen; i++) {
    await tap({ id: 'settings-rate' });
    await waitFor({ id: 'rating-dialog' });
    if (i === 0) screenshot('rating-empty');
    await tap({ id: 'rating-star-2' });
    await tap({ id: 'rating-submit' });
    const t = Date.now();
    while (!seen && Date.now() - t < 3000) {
      seen = has('Thanks for your feedback! We will use it to make Repayly better.');
      if (!seen) await sleep(150);
    }
  }
  expect(seen, 'local thank-you not seen');
  // high rating: Google Play opens on this app's listing
  await tap({ id: 'settings-rate' });
  await tap({ id: 'rating-star-5' });
  screenshot('rating-5');
  await tap({ id: 'rating-submit' });
  let top = '';
  const t0 = Date.now();
  while (Date.now() - t0 < 20_000) {
    try {
      top = shell('dumpsys window | grep mCurrentFocus');
    } catch {
      top = '';
    }
    if (/com\.android\.vending|chrome|browser/i.test(top)) break;
    await sleep(800);
  }
  expect(/com\.android\.vending|chrome|browser/i.test(top), 'Play listing not opened: ' + top.trim());
  screenshot('rating-play-listing');
  launch(); // back to the app
  await waitFor({ id: 'tab-index' }, 60_000);
  await tap({ id: 'tab-settings' });
  await tap({ id: 'settings-rate' });
  await tap({ id: 'rating-close' });
  expect(!find({ id: 'rating-dialog' }), 'close failed');
});

await scenario('LEGAL01', 'privacy policy and terms: real documents (no development placeholder), Back', async () => {
  await goHome();
  await tap({ id: 'tab-settings' });
  await tap({ id: 'settings-privacy' });
  await waitFor({ id: 'legal-body' });
  const privacy = find({ id: 'legal-body' }).text;
  expect(privacy.startsWith('Repayly Privacy Policy'), 'privacy heading');
  expect(/Firebase/.test(privacy) && /install referrer/.test(privacy), 'privacy must describe Firebase and the install referrer');
  expect(!/placeholder/i.test(privacy) && !find({ id: 'legal-placeholder' }), 'development placeholder still shown');
  screenshot('privacy');
  back();
  await tap({ id: 'settings-terms' });
  await waitFor({ id: 'legal-body' });
  expect(find({ id: 'legal-body' }).text.startsWith('Repayly Terms of Use'), 'terms heading');
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
  ['es', 'Calcula. Planifica. Paga.', 'Ajustes'],
  ['zh-Hans', '计算 · 规划 · 还款', '设置'],
  ['ja', '計算・計画・返済', '設定'],
  ['ko', '계산하고, 계획하고, 상환하세요.', '설정'],
  ['pt-BR', 'Calcule. Planeje. Pague.', 'Configurações'],
];
await scenario('LANG00', 'language: Back without Confirm does not change language', async () => {
  await tap({ id: 'tab-settings' });
  await tap({ id: 'settings-language' });
  await tap({ id: 'lang-ja' });
  back();
  await waitFor({ id: 'settings-language' });
  expect(has('Settings'), 'language changed without confirm');
});
// Home check uses the localized tagline (the title is the brand "Repayly" in every language).
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
    await waitFor({ text: homeTitle }, 60_000);
    screenshot(`lang-${code}-home`);
    await tap({ id: 'tile-personal' });
    await calculate();
    await sleep(600);
    screenshot(`lang-${code}-validation`);
    hideKeyboard(); // the errored field is focused (1.1.0), so the keyboard is open
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

await scenario('LANG-SYS', 'Use device language: follows a live device-language change, a restart, and the Android per-app language', async () => {
  const pidOf = () => shell(`pidof ${PKG}`).trim();
  try {
    await goHome();
    await tap({ id: 'tab-settings' });
    await tap({ id: 'settings-language' });
    await tap({ id: 'lang-system' });
    screenshot('lang-system-option');
    await tap({ id: 'lang-confirm' });
    await waitFor({ contains: 'English · Auto' }, 10_000);
    // 1) device language changes while the app is open → app follows without a restart
    const pid = pidOf();
    shell('cmd locale set-device-locale es-ES');
    await waitFor({ text: 'Ajustes' }, 20_000);
    expect(pidOf() === pid, 'app restarted on device-language change');
    screenshot('lang-device-es-live');
    // 2) still Spanish after a cold start
    launch();
    await waitFor({ text: 'Inicio' }, 30_000);
    // 3) Android 13+ per-app language (Settings → Apps → Repayly → Language) wins over the device
    shell(`cmd locale set-app-locales ${PKG} --locales ja`);
    await waitFor({ text: 'ホーム' }, 20_000);
    screenshot('lang-per-app-ja');
    shell(`cmd locale set-app-locales ${PKG} --locales ""`);
    await waitFor({ text: 'Inicio' }, 20_000);
  } finally {
    shell(`cmd locale set-app-locales ${PKG} --locales ""`);
    shell('cmd locale set-device-locale en-US');
  }
  await waitFor({ text: 'Home' }, 20_000);
});

await scenario('KEY01', 'keyboard Next moves amount → rate → term, Done calculates', async () => {
  await openTile('personal');
  await tap({ id: 'reset-fields' });
  await setField('input-amount', '10000');
  shell('input keyevent KEYCODE_ENTER'); // Next → rate (no tap)
  await sleep(600);
  typeText('6');
  shell('input keyevent KEYCODE_ENTER'); // Next → term
  await sleep(600);
  typeText('12');
  shell('input keyevent KEYCODE_ENTER'); // Done → calculate
  await waitFor({ id: 'r-monthly' }, 15_000);
  expect(find({ id: 'r-monthly' }).text === '£860.66', 'monthly ' + find({ id: 'r-monthly' }).text);
});

await scenario('RES01', 'result summary: monthly, principal / interest split, Share opens the Android share sheet', async () => {
  await waitFor({ id: 'r-hero' });
  expect(find({ id: 'r-hero-monthly' }).text === '£860.66', 'hero monthly');
  expect(has('96.8%') && has('3.2%'), 'split percentages missing');
  screenshot('result-summary');
  await tap({ id: 'r-share' });
  const t0 = Date.now();
  let top = '';
  while (Date.now() - t0 < 15_000) {
    try {
      top = shell('dumpsys activity activities | grep -E "topResumedActivity|mCurrentFocus"; dumpsys window | grep mCurrentFocus');
    } catch {
      top = ''; // grep finds nothing while the chooser is starting
    }
    if (/intentresolver|ChooserActivity|ResolverActivity/i.test(top)) break;
    await sleep(800);
  }
  expect(/intentresolver|ChooserActivity|ResolverActivity/i.test(top), 'share sheet not shown: ' + top.trim());
  screenshot('result-share-sheet');
  // the chooser can take a while to close on a busy device: Back until the result screen is back
  for (let i = 0; i < 4 && !find({ id: 'r-hero' }); i++) {
    back();
    await sleep(3000);
  }
  await waitFor({ id: 'r-hero' }, 20_000);
  back();
});

await scenario('VAL02', 'validation message stays under the field and clears when the field is edited', async () => {
  await openTile('personal');
  await tap({ id: 'reset-fields' });
  hideKeyboard();
  await tap({ id: 'calculate' });
  await waitFor({ id: 'input-amount-error' }, 8000);
  expect(find({ id: 'input-amount-error' }).text === 'Enter a loan amount.', 'inline text');
  await sleep(4500); // longer than the old 3.5 s snackbar
  expect(!!find({ id: 'input-amount-error' }), 'inline error disappeared on its own');
  screenshot('validation-inline');
  await setField('input-amount', '5');
  expect(!find({ id: 'input-amount-error' }), 'error not cleared after editing');
  hideKeyboard();
  back();
});

await scenario('ATTR01', 'traffic source read from the Play install referrer after start-up and stored (sideload = natural)', async () => {
  launch();
  await waitFor({ id: 'tab-index' }, 60_000);
  await sleep(6000); // read runs ~1.5 s after the first screen
  await tap({ id: 'tab-settings' });
  await scrollUntil({ id: 'settings-version' }, 8);
  await longPress({ id: 'settings-version' });
  await scrollUntil({ id: 'diag-attr-source' }, 6);
  const src = find({ id: 'diag-attr-source' }).text;
  writeFileSync(join(out, 'ATTR01.txt'), `cohort: ${find({ id: 'diag-cohort' }).text}\nnetwork: ${find({ id: 'diag-network' }).text}\nsource: ${src}\n`);
  expect(find({ id: 'diag-cohort' }).text === 'natural', 'cohort');
  expect(/^install_referrer/.test(src) || /^not read yet/.test(src), 'source ' + src);
  screenshot('attribution');
  back();
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

await scenario('CFG01', 'display size and font size changed while open: no restart, navigation still works', async () => {
  await goHome();
  const pid = shell(`pidof ${PKG}`).trim();
  shell('wm density 480');
  shell('settings put system font_scale 1.3');
  await sleep(3000);
  shell('wm density reset');
  shell('settings put system font_scale 1.0');
  await sleep(3000);
  await tap({ id: 'tab-settings' }, 20_000);
  await tap({ id: 'settings-language' });
  await waitFor({ contains: 'English' }, 10_000);
  back();
  await tap({ id: 'tab-index' });
  await tap({ id: 'tile-personal' });
  await waitFor({ id: 'input-amount' }, 10_000);
  back();
  expect(shell(`pidof ${PKG}`).trim() === pid, 'app process restarted (crash after configuration change)');
});

// ---- Firebase (functional build: real project from google-services.json) ----
const gs = JSON.parse(readFileSync(new URL('../../google-services.json', import.meta.url), 'utf8'));
const gsClient = gs.client.find((c) => c.client_info.android_client_info.package_name === PKG);
const logcat = (filter) => shell(`logcat -d -v brief ${filter}`, { timeout: 60_000 });
async function openDiagnostics() {
  await goHome();
  await tap({ id: 'tab-settings' });
  await scrollUntil({ id: 'settings-version' }, 8);
  await longPress({ id: 'settings-version' });
  await waitFor({ id: 'diag-app' }, 10_000);
}
async function waitText(id, pred, timeout = 45_000) {
  const t0 = Date.now();
  let last;
  while (Date.now() - t0 < timeout) {
    last = find({ id })?.text;
    if (last !== undefined && pred(last)) return last;
    await sleep(1500);
  }
  throw new Error(`${id}: ${last}`);
}

await scenario('FB01', 'Firebase initialised from google-services.json: app id, project, collection on, instance id', async () => {
  expect(gsClient, 'google-services.json has no client for ' + PKG);
  await openDiagnostics();
  expect(find({ id: 'diag-app' }).text === gsClient.client_info.mobilesdk_app_id, 'app id ' + find({ id: 'diag-app' }).text);
  expect(find({ id: 'diag-project' }).text === gs.project_info.project_id, 'project');
  expect(find({ id: 'diag-mode' }).text === 'functional', 'mode');
  expect(find({ id: 'diag-collection' }).text === 'on', 'collection ' + find({ id: 'diag-collection' }).text);
  await waitText('diag-instance', (v) => /^[0-9a-f]{32}$/.test(v));
  screenshot('firebase-diagnostics');
});

await scenario('FB02', 'Remote Config fetch succeeds; ad policy stays on the NoOp placeholder', async () => {
  await scrollUntil({ id: 'diag-rc-fetch' });
  const st = await waitText('diag-rc-fetch', (v) => v !== 'not_started' && v !== 'no_fetch_yet');
  expect(st === 'success', 'fetch status ' + st + ' ' + (find({ id: 'diag-rc-error' })?.text ?? ''));
  expect(/^(embedded|remote-config)-natural \((embedded|stored)\)$/.test(find({ id: 'diag-ad-config' }).text), 'ad config ' + find({ id: 'diag-ad-config' }).text);
  expect(find({ id: 'diag-ad-mode' }).text.startsWith('NoOp placeholder'), 'ad adapter');
  screenshot('firebase-remote-config');
});

await scenario('FB03', 'FCM registration token obtained', async () => {
  await scrollUntil({ id: 'diag-fcm-status' });
  const st = await waitText('diag-fcm-status', (v) => v !== 'pending');
  expect(st === 'ok', 'fcm ' + st + ' ' + (find({ id: 'diag-fcm-error' })?.text ?? ''));
  await scrollUntil({ id: 'diag-fcm-token' });
  const tok = find({ id: 'diag-fcm-token' }).text;
  expect(/^[\w:-]{100,}$/.test(tok), 'token shape (len ' + tok.length + ')');
  screenshot('firebase-fcm');
});

await scenario('FB04', 'Analytics: product events and screen views reach the Firebase SDK; NoOp ad events do not', async () => {
  shell('logcat -c');
  await goHome();
  await openTile('personal');
  await fillLoan({ amount: '2500', rate: '4', term: '6' });
  await calculate();
  await waitFor({ id: 'r-monthly' });
  await sleep(4000);
  const fa = logcat('FA:V FA-SVC:V *:S');
  const logged = fa.split('\n').filter((l) => /Logging event/.test(l));
  writeFileSync(join(out, 'firebase-analytics-logcat.txt'), fa);
  expect(logged.some((l) => /calc_success/.test(l)), 'calc_success not logged (' + logged.length + ' events)');
  expect(logged.some((l) => /screen_view|_vs/.test(l)), 'no screen_view');
  expect(!logged.some((l) => /ad_opportunity|ad_skip|ad_show/.test(l)), 'NoOp ad-policy event was sent');
  expect(!logged.some((l) => /2500/.test(l)), 'loan input leaked into analytics');
  expect(/Successful upload. Got network response. code, size: 2\d\d/.test(fa), 'no successful Analytics upload (HTTP 2xx) in logcat');
});

await scenario('FB05', 'Crashlytics: labelled test non-fatal recorded, sent on next start, HTTP 200 from crashlyticsreports', async () => {
  await openDiagnostics();
  await scrollUntil({ id: 'diag-crash-test' });
  await tap({ id: 'diag-crash-test' });
  await waitFor({ text: 'Test report recorded' });
  shell('logcat -c');
  launch(); // force-stop + start: Crashlytics sends stored reports on the next start
  await waitFor({ id: 'tab-index' }, 60_000);
  const sent = (l) => /Crashlytics report successfully enqueued to DataTransport/.test(l);
  const uploaded = (l) => /crashlyticsreports-pa\.googleapis\.com[\s\S]*Status Code: 200/.test(l);
  let cl = '';
  const t0 = Date.now();
  while (Date.now() - t0 < 120_000) {
    await sleep(4000);
    cl = logcat('FirebaseCrashlytics:V TRuntime.CctTransportBackend:V *:S');
    if (sent(cl) && uploaded(cl)) break;
  }
  writeFileSync(join(out, 'firebase-crashlytics-logcat.txt'), cl);
  expect(sent(cl), 'report not handed to DataTransport');
  expect(uploaded(cl), 'no HTTP 200 from crashlyticsreports-pa.googleapis.com');
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
