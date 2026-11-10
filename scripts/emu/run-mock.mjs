// Emulator scenarios for the debug mock-ads APK (EXPO_PUBLIC_APP_MODE=mock).
// All ads here are LOCAL MOCK fixtures; revenue is synthetic (isTest=true).
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { back, expect, find, hideKeyboard, launch, scenario, screenshot, scrollUntil, setField, setOutDir, sleep, summary, tap, texts, waitFor } from './driver.mjs';

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
  await scrollUntil({ id: `dbg-${label}` }, 12);
  await tap({ id: `dbg-${label}` });
}
async function top() {
  for (let i = 0; i < 3; i++) {
    // scroll up
    const { shell } = await import('./driver.mjs');
    shell('input swipe 540 600 540 2000 200');
    await sleep(300);
  }
}

await scenario('MOCK00', 'fresh mock build: intro Skip saves completion; onboarding opportunity continues', async () => {
  launch({ clear: true });
  await waitFor({ id: 'intro-skip' }, 30_000);
  await tap({ id: 'intro-skip' });
  // first opportunity has no cache yet → skipped, navigation continues
  await waitFor({ id: 'tile-personal' }, 15_000);
  const p = find({ id: 'notif-prompt-later' });
  if (p) await tap({ id: 'notif-prompt-later' });
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
  expect(texts().some((x) => x.includes('totals(real)={}')), 'synthetic revenue leaked into real totals');
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

await scenario('MOCK05', 'no fill / show failure / duplicate callbacks continue exactly once', async () => {
  await openDebug();
  await dbg('Reset frequency counters');
  await dbg('Fill-no_fill');
  await dbg('Preload interstitial + native');
  await sleep(1200);
  await dbg('Trigger IV_CALCULATION_COMPLETE');
  await waitFor({ contains: 'outcome: skipped' }, 5000);
  screenshot('mock-nofill');
  await dbg('Reset scenario');
  await dbg('Show fails');
  await dbg('Duplicate callbacks');
  await dbg('Preload interstitial + native');
  await sleep(1500);
  await dbg('Trigger IV_CALCULATION_COMPLETE');
  await waitFor({ contains: 'outcome: failed sdk_error' }, 5000);
  await dbg('Reset scenario');
});

await scenario('MOCK06', 'two triggers at once: second reports presentation_busy', async () => {
  await dbg('Reset frequency counters');
  await dbg('Cohort fixture-paid');
  await dbg('Preload interstitial + native');
  await sleep(1500);
  await dbg('Two triggers at once');
  await waitFor({ id: 'mock-interstitial' }, 5000);
  screenshot('mock-two-triggers');
  await tap({ id: 'mock-interstitial-close' });
  await waitFor({ contains: 'presentation_busy' }, 5000);
});

await scenario('MOCK07', 'risk fixture (simulator) excludes AdMob → no platform for natural', async () => {
  await dbg('Cohort fixture-natural');
  await scrollUntil({ id: 'dbg-toggle-simulator' }, 12);
  await tap({ id: 'dbg-toggle-simulator' });
  await dbg('Reset frequency counters');
  await dbg('Trigger IV_CALCULATION_COMPLETE');
  await waitFor({ contains: 'no_platform_available_after_exclusion' }, 5000);
  screenshot('mock-risk');
  await scrollUntil({ id: 'dbg-toggle-simulator' }, 12);
  await tap({ id: 'dbg-toggle-simulator' });
});

await scenario('MOCK08', 'offline: opportunity skipped with reason offline', async () => {
  await scrollUntil({ id: 'dbg-toggle-Simulate offline (ads)' }, 12).catch(() => undefined);
  await top();
  await tap({ id: 'dbg-toggle-Simulate offline (ads)' });
  await dbg('Trigger IV_CALCULATION_COMPLETE');
  await waitFor({ contains: 'offline' }, 5000);
  await top();
  await tap({ id: 'dbg-toggle-Simulate offline (ads)' });
});

await scenario('MOCK09', 'NoOp adapter: nothing rendered, flows continue', async () => {
  await top();
  await tap({ id: 'dbg-Ad adapter-noop' });
  await dbg('Trigger IV_CALCULATION_COMPLETE');
  await waitFor({ contains: 'outcome: deferred' }, 5000);
  back();
  await tap({ id: 'tab-index' });
  await sleep(1500);
  expect(!find({ id: 'mock-native-NA_HOME' }), 'native shown in NoOp');
  screenshot('noop-home');
  await openDebug();
  await tap({ id: 'dbg-Ad adapter-mock' });
});

writeFileSync(join(out, 'summary.json'), JSON.stringify({ startedAt: new Date(t0).toISOString(), ms: Date.now() - t0, results: summary() }, null, 2));
const failed = summary().filter((r) => r.status === 'fail');
console.log(`\n${summary().length - failed.length}/${summary().length} passed`);
process.exit(failed.length ? 1 : 0);
