// Emulator scenarios for the debug mock-ads APK (EXPO_PUBLIC_APP_MODE=mock).
// All ads here are LOCAL MOCK fixtures; revenue is synthetic (isTest=true).
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { back, expect, find, hideKeyboard, launch, scenario, screenshot, scrollUntil, setField, setOutDir, shell, sleep, summary, tap, texts, waitFor } from './driver.mjs';

const out = process.argv[2] || 'evidence/mock';
setOutDir(out);
const t0 = Date.now();

async function openDebug() {
  await tap({ id: 'tab-settings' });
  await scrollUntil({ id: 'settings-debug' });
  await tap({ id: 'settings-debug' });
  await waitFor({ contains: 'APP_MODE=mock' });
}
async function dbg(label) {
  if (!find({ id: `dbg-${label}` })) await top();
  await scrollUntil({ id: `dbg-${label}` }, 12);
  await tap({ id: `dbg-${label}` });
}
async function top() {
  for (let i = 0; i < 6; i++) {
    // scroll up
    const { shell } = await import('./driver.mjs');
    shell('input swipe 540 600 540 2000 300');
    await sleep(700);
  }
}

await scenario('MOCK00', 'fresh mock build: intro Skip saves completion; onboarding opportunity continues', async () => {
  launch({ clear: true });
  await waitFor({ id: 'intro-skip' }, 30_000);
  await tap({ id: 'intro-skip' });
  // first opportunity has no cache yet → skipped, navigation continues to Home (prompt on top)
  await tap({ id: 'notif-prompt-later' }, 15_000);
  await waitFor({ id: 'tile-personal' }, 15_000);
});

await scenario('MOCK01', 'native slot fills with a labelled Local mock ad after preload', async () => {
  await tap({ id: 'tab-tools' });
  await tap({ id: 'tab-index' });
  await waitFor({ id: 'mock-native-NA_HOME' }, 10_000);
  expect(texts().includes('Local mock ad'), 'label missing');
  screenshot('mock-native-home');
});

await scenario('MOCK02', 'calculation interstitial: shown after valid calculate, result after close, synthetic revenue', async () => {
  await openDebug();
  await dbg('Reset frequency counters');
  await dbg('Preload interstitial + native');
  await sleep(1500);
  back();
  await tap({ id: 'tab-index' });
  await tap({ id: 'tile-personal' });
  await setField('input-amount', '10000');
  await setField('input-rate', '6');
  await setField('input-term', '12');
  hideKeyboard();
  await tap({ id: 'calculate' });
  await waitFor({ id: 'mock-interstitial' }, 8000);
  screenshot('mock-interstitial');
  expect(texts().includes('Local mock ad'), 'interstitial label missing');
  await tap({ id: 'mock-interstitial-close' });
  await waitFor({ id: 'r-monthly' });
  expect(find({ id: 'r-monthly' }).text === '£860.66', 'result after ad');
  back();
  back();
  await openDebug();
  await scrollUntil({ contains: 'entries=' });
  expect(texts().some((x) => /entries=[1-9]/.test(x)), 'no synthetic ledger entry');
  await scrollUntil({ id: 'dbg-totals' });
  const tot = find({ id: 'dbg-totals' }).text;
  expect(/totals\(test\): USD 0\.\d+/.test(tot) && tot.endsWith('totals(real): none'), 'totals: ' + tot);
  screenshot('mock-ledger');
});

await scenario('MOCK03', 'invalid calculate never triggers an ad', async () => {
  back();
  await tap({ id: 'tab-index' });
  await tap({ id: 'tile-personal' });
  await tap({ id: 'calculate' });
  await sleep(1200);
  expect(!find({ id: 'mock-interstitial' }), 'ad shown on invalid input');
  back();
});

await scenario('MOCK04', 'natural cap: 120 s AdMob interval → second calculation shows result without ad', async () => {
  await tap({ id: 'tile-business' });
  await setField('input-amount', '5000');
  await setField('input-rate', '5');
  await setField('input-term', '10');
  hideKeyboard();
  await tap({ id: 'calculate' });
  await sleep(1500);
  expect(!find({ id: 'mock-interstitial' }), 'interval not enforced');
  await waitFor({ id: 'r-monthly' });
  back();
  back();
});

// ---- deterministic fixture scripts via deep link (see runScript in src/app/debug.tsx) ----
let runSeq = 0;
async function script(params, timeout = 15_000) {
  const run = 'r' + ++runSeq;
  const q = Object.entries({ run, ...params }).map(([k, v]) => k + '=' + v).join('&');
  shell(`am start -a android.intent.action.VIEW -d 'loadapp://debug?${q}' com.lrenz.loadapp`);
  const done = new RegExp('^last: ' + run + ' (?!running)');
  const t = Date.now();
  while (Date.now() - t < timeout) {
    await sleep(500);
    if (find({ id: 'mock-interstitial' })) await tap({ id: 'mock-interstitial-close' });
    const n = find({ id: 'dbg-last' });
    if (n && done.test(n.text)) return n.text.slice(('last: ' + run + ' ').length);
  }
  throw new Error('script ' + run + ' did not finish: ' + (find({ id: 'dbg-last' })?.text ?? 'no debug screen'));
}

await scenario('MOCK05', 'no fill, show failure and duplicate callbacks continue exactly once', async () => {
  const noFill = await script({ adMode: 'mock', cohort: 'natural', fill: 'no_fill', reset: 1, preload: 1, trigger: 'one' });
  expect(noFill.startsWith('outcome: skipped'), 'no fill: ' + noFill);
  const fail = await script({ adMode: 'mock', cohort: 'natural', fill: 'success', showFails: 1, dup: 1, reset: 1, preload: 1, trigger: 'one' });
  expect(fail === 'outcome: failed sdk_error', 'show failure: ' + fail);
  const dup = await script({ adMode: 'mock', cohort: 'natural', fill: 'success', dup: 1, reset: 1, preload: 1, trigger: 'one' });
  expect(dup === 'outcome: shown', 'duplicate callbacks: ' + dup);
  screenshot('mock-script-dup');
});

await scenario('MOCK06', 'two triggers at once: second reports presentation_busy, first still completes', async () => {
  const r = await script({ adMode: 'mock', cohort: 'paid', reset: 1, preload: 1, trigger: 'two' });
  expect(/^second: skipped presentation_busy; first: shown/.test(r), r);
});

await scenario('MOCK07', 'risk fixture (simulator) excludes AdMob → no platform for natural', async () => {
  const r = await script({ adMode: 'mock', cohort: 'natural', risk: 'simulator', reset: 1, preload: 1, trigger: 'one' });
  expect(r.includes('no_platform_available_after_exclusion'), r);
  screenshot('mock-risk');
  await script({ risk: '' });
});

await scenario('MOCK08', 'offline: opportunity skipped with reason offline', async () => {
  const r = await script({ adMode: 'mock', cohort: 'natural', offline: 1, reset: 1, trigger: 'one' });
  expect(r.includes('offline'), r);
  await script({ offline: 0 });
});

await scenario('MOCK09', 'NoOp adapter: deferred / not_configured, no native slot rendered', async () => {
  const r = await script({ adMode: 'noop', trigger: 'one' });
  expect(r === 'outcome: deferred not_configured', r);
  back();
  await tap({ id: 'tab-index' });
  await sleep(1500);
  expect(!find({ id: 'mock-native-NA_HOME' }), 'native shown in NoOp');
  screenshot('noop-home');
  await script({ adMode: 'mock', cohort: 'none' });
});

writeFileSync(join(out, 'summary.json'), JSON.stringify({ startedAt: new Date(t0).toISOString(), ms: Date.now() - t0, results: summary() }, null, 2));
const failed = summary().filter((r) => r.status === 'fail');
console.log(`\n${summary().length - failed.length}/${summary().length} passed`);
process.exit(failed.length ? 1 : 0);
