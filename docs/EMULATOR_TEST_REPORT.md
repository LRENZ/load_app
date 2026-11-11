# Emulator test report

All results below come from scripted runs on the local Android Studio emulator (`scripts/emu/*.mjs`, adb + uiautomator). Screenshots: `evidence/*/screens/`. Raw results: `evidence/*/results.jsonl` and `summary.json`.

**Latest round (2026-11-10, evening):** package renamed to `com.tools.loadapp`, Firebase added (see [FIREBASE.md](FIREBASE.md)), one crash bug found and fixed (configuration change → router crash).

| Suite | Result |
|---|---|
| Unit tests (`npm test`) | **51/51** |
| Functional, full run on the final APK | **40/43**. The 3 failures were test-harness problems (a 3.5 s snackbar missed by a slow UI dump; a Crashlytics log line worded differently from what the test expected). The app behaved correctly; see below |
| Functional, the 4 affected scenarios re-run after the harness fixes, same APK | **4/4** |
| Mock ads + Firebase-off check | **11/11** |
| Crashes in the final full run (logcat) | **0** `FATAL EXCEPTION`, 0 router errors, 0 ReactNativeJS errors |

## Environment

| Item | Value |
|---|---|
| Date | 2026-11-10 |
| Host | Windows 11 Pro 10.0.26200, Node 24.22.2, JDK Temurin 17.0.21, Android emulator 37.2.13, platform-tools 37.0.1 |
| AVD / serial | Pixel_7_API_37 / emulator-5554 (headless, `-gpu swiftshader_indirect`; see BUILD_MATRIX.md) |
| Device | sdk_gphone64_x86_64, Android 17 (API 37), build `CE2A.260420.051.A2`, ABIs x86_64 + arm64-v8a |
| Display | 1080×2400 @ 420 dpi (411 dp wide); 360 dp scenario via `wm density 480`, restored afterwards |
| App | `com.tools.loadapp` 1.0.0 (1), `dist/loan-calc-1.0.0-standalone.apk`, SHA-256 `d5894779ceae7f45d3d1f18494b1ece6a67e636c8e919a9e6bd4c18efdc9d30d`; mock: `dist/loan-calc-mock-x86_64.apk`, SHA-256 `a017c4f52972c3518f6e51be323bc85baa408246eec2505de3c45aba524cd1aa` |
| Firebase project | `natural-potion-332914`, Android app `1:436470368042:android:f265c3a01c22892b824053` (from the supplied google-services.json) |
| Reference app | `com.easyloan.calculator.payment`, still installed and untouched (`pm path` checked before and after the run) |

## Commands actually run

```powershell
.\scripts\android-build.ps1 -Variant release -Mode functional -UseMirror -Abis 'x86_64,arm64-v8a'
adb -s emulator-5554 uninstall com.tools.loadapp
adb -s emulator-5554 install dist\loan-calc-1.0.0-standalone.apk
node scripts/emu/run-functional.mjs evidence/functional
$env:ONLY='C03,C04,RATE01,FB05'; node scripts/emu/run-functional.mjs evidence/functional-rerun   # after the harness fixes

.\scripts\android-build.ps1 -Variant release -Mode mock -UseMirror -Abis x86_64
adb -s emulator-5554 install -r dist\loan-calc-mock-x86_64.apk
node scripts/emu/run-mock.mjs evidence/mock
```

## Metro-off (standalone) verification

- Metro never ran during these runs. Nothing was listening on port 8081 (`netstat`), and `adb reverse --list` was empty.
- The APK contains `assets/index.android.bundle` (2.9 MB Hermes bytecode) plus `lib/x86_64` and `lib/arm64-v8a`.
- The app was clean-installed, launched, force-stopped and relaunched several times (INST01, ONB02, HIST01, the LANG-* restarts, BACK01). Calculations ran each time, for example C01 → £860.66 / £10,327.92 / £327.92.
- App logcat for the whole functional run (`evidence/functional/logcat-app.txt`) has no `FATAL EXCEPTION` and no ReactNativeJS errors.

## Unit tests

`npm test`: **51/51 pass** (44 earlier + 7 in `test/firebase.test.ts`: event-name / param rules, forwarding rules, ad_impression mapping, Remote Config fallback, token masking).
- C01–C08.
- 392 loan inputs checked against an exact BigInt rational reference.
- Validation order, date arithmetic and converters.
- FX: fixture 123.45 USD → 110.57 EUR; offline, timeout, stale, invalid payload and future-dated cache.
- World-clock DST.
- The 25-placement registry and NoOp / mock lifecycles.
- Caps, intervals and midnight; risk mapping; candidate ties.
- Config fallback; revenue micros and dedupe.
- Sticky cohort.
- i18n key and placeholder parity across 6 locales.

## Emulator scenarios

### evidence/functional — 40/43 passed (started 2026-11-11T05:32:31.029Z, 3065 s)

| ID | Scenario | Result | Time | Notes |
|---|---|---|---|---|
| INST01 | fresh install: intro pages, Next/Start, persistent completion | pass | 43.3 s |  |
| NOT01 | first-run notification prompt → Not now | pass | 11.5 s |  |
| ONB02 | intro does not return after restart | pass | 19.8 s |  |
| UI03 | home with sample history | pass | 7.0 s |  |
| C01 | personal 10000 @ 6% 12 months → 860.66 / 10327.92 / 327.92 | pass | 76.8 s |  |
| NAV01 | Back from result keeps form input; Back again → home with saved entry | pass | 16.8 s |  |
| VAL01 | validation messages (empty, zero, term range) | pass | 213.0 s |  |
| C02 | zero rate + month-end via text date 01/31/2026 | pass | 105.9 s |  |
| C05 | 1000 @ 12% 1 month from 2026-01-31 → 1010.00, 2026-02-28 | pass | 97.9 s |  |
| C03 | monthly payment too small (1 @ 0% 360 months) | pass | 57.9 s |  |
| C04 | rounded total below principal (0.17 @ 0.0001% 12 months) | **FAIL** | 67.6 s | timeout waiting for {"contains":"Total repayment cannot be below"} |
| DATE01 | date picker: calendar, month arrows, year list, invalid text, Cancel keeps date | pass | 101.6 s |  |
| CUR01 | currency picker: Cancel does not commit, Confirm commits | pass | 115.7 s |  |
| C07 | business 12347.89 @ 7.125% 17 months → 765.77 | pass | 93.6 s |  |
| EDIT01 | Start new calculation clears the form | pass | 14.5 s |  |
| C06 | auto 25000 @ 5% 5 years → 471.78 | pass | 100.0 s |  |
| C08 | mortgage 500000 / 100000 (20%) 6% 30y + costs → 3298.20 | pass | 277.2 s |  |
| HIST01 | history after process restart: all records, newest first, opening a record | pass | 50.9 s |  |
| TOOL-temperature | temperature: 25 → 77.00, swap, invalid input | pass | 108.3 s |  |
| TOOL-mass | mass: 10 → 22.0462, swap, invalid input | pass | 115.6 s |  |
| TOOL-speed | speed: 100 → 62.1371, swap, invalid input | pass | 111.5 s |  |
| TOOL-length | length: 1 → 3.2808, swap, invalid input | pass | 91.9 s |  |
| FX01 | exchange rate: live USD→EUR, amount, swap, cache | pass | 51.6 s |  |
| CLOCK01 | world clock shows four zones | pass | 25.2 s |  |
| RATE01 | rating dialog: star selection, Submit, Close | **FAIL** | 35.0 s | timeout waiting for {"contains":"Thanks for your 4-star rating!"} |
| LEGAL01 | privacy and terms: placeholder content, scroll, Back | pass | 27.1 s |  |
| NOT02 | notification permission: deny keeps switch off | pass | 51.7 s |  |
| NOT03 | notification permission: grant shows a local preview | pass | 63.6 s |  |
| LANG00 | language: Back without Confirm does not change language | pass | 20.5 s |  |
| LANG-es | language es applies app-wide and survives restart | pass | 59.4 s |  |
| LANG-zh-Hans | language zh-Hans applies app-wide and survives restart | pass | 80.3 s |  |
| LANG-ja | language ja applies app-wide and survives restart | pass | 57.8 s |  |
| LANG-ko | language ko applies app-wide and survives restart | pass | 66.1 s |  |
| LANG-pt-BR | language pt-BR applies app-wide and survives restart | pass | 71.7 s |  |
| LANG-en | back to English | pass | 24.1 s |  |
| LAYOUT360 | 360 dp width: home, form and result remain usable | pass | 141.6 s |  |
| CFG01 | display size and font size changed while open: no restart, navigation still works | pass | 63.6 s |  |
| FB01 | Firebase initialised from google-services.json: app id, project, collection on, instance id | pass | 56.7 s |  |
| FB02 | Remote Config fetch succeeds; ad policy stays on the NoOp placeholder | pass | 24.0 s |  |
| FB03 | FCM registration token obtained | pass | 17.0 s |  |
| FB04 | Analytics: product events and screen views reach the Firebase SDK; NoOp ad events do not | pass | 83.0 s |  |
| FB05 | Crashlytics: labelled test non-fatal recorded and uploaded on next start | **FAIL** | 130.5 s | no Crashlytics upload confirmation in logcat |
| BACK01 | Android Back on Home leaves the app (no exit ad in NoOp) | pass | 15.5 s |  |

### evidence/functional-rerun — 4/4 passed (started 2026-11-11T06:27:26.210Z, 299 s)

| ID | Scenario | Result | Time | Notes |
|---|---|---|---|---|
| C03 | monthly payment too small (1 @ 0% 360 months) | pass | 87.2 s |  |
| C04 | rounded total below principal (0.17 @ 0.0001% 12 months) | pass | 62.9 s |  |
| RATE01 | rating dialog: star selection, Submit, Close | pass | 46.4 s |  |
| FB05 | Crashlytics: labelled test non-fatal recorded, sent on next start, HTTP 200 from crashlyticsreports | pass | 85.9 s |  |

### evidence/mock — 11/11 passed (started 2026-11-11T06:54:07.425Z, 454 s)

| ID | Scenario | Result | Time | Notes |
|---|---|---|---|---|
| MOCK00 | fresh mock build: intro Skip saves completion; onboarding opportunity continues | pass | 26.6 s |  |
| MOCK01 | native slot fills with a labelled Local mock ad after preload | pass | 14.3 s |  |
| MOCK02 | calculation interstitial: shown after valid calculate, result after close, synthetic revenue | pass | 174.2 s |  |
| MOCK03 | invalid calculate never triggers an ad | pass | 17.0 s |  |
| MOCK04 | natural cap: right after a shown interstitial, the next opportunity and a real Calculate show no ad (120 s AdMob interval) | pass | 72.7 s |  |
| MOCK05 | no fill, show failure and duplicate callbacks continue exactly once | pass | 30.4 s |  |
| MOCK06 | two triggers at once: second reports presentation_busy, first still completes | pass | 12.6 s |  |
| MOCK07 | risk fixture (simulator) excludes AdMob → no platform for natural | pass | 15.2 s |  |
| MOCK08 | offline: opportunity skipped with reason offline | pass | 14.1 s |  |
| MOCK09 | NoOp adapter: deferred / not_configured, no native slot rendered | pass | 24.6 s |  |
| MOCK10 | mock build: Firebase initialised but collection off (no test analytics, crashes or synthetic revenue sent) | pass | 51.8 s |  |

## What the scenarios check

- **Calculators:** C01–C08 exact values; zero rate; month-end and Feb clamp; payment-too-small and below-principal failures; mortgage amount ⇄ percent coupling in both directions; currency switch (GBP → AUD) flowing into results.
- **Validation:** empty, zero and out-of-range amount; rate > 100; term 361 months and 31 years; snackbar copy; Reset.
- **Date dialog:** calendar, month arrows, year list, text mode with invalid 02/30/2026, Cancel and Android Back without committing.
- **Pickers:** currency Cancel vs Confirm; term-unit popup.
- **Navigation:** Result → Back keeps input → Home shows the record; Edit; Start new; Back on Home leaves the app.
- **History:** survives force-stop, newest first, reopens a record, long-press delete confirm.
- **Tools:**
  - all four converters in both directions, negative temperature, scientific and negative rejection;
  - live Frankfurter FX with a computed amount and swap;
  - world clock against host Intl time.
- **Settings:**
  - rating 4★ → Submit → honest local-only message, then Close;
  - privacy and terms placeholder screens;
  - first-run notification prompt;
  - system permission **denied** → switch stays off;
  - **granted** → a real local notification found in `dumpsys notification`, shade screenshot taken, preference survives restart.
- **Languages:** es, zh-Hans, ja, ko, pt-BR applied app-wide (home, settings, tools, validation copy) and kept across restart; Back without Confirm leaves the language unchanged.
- **Layout:** 360 dp home, mortgage form with keyboard, and result.
- **Mock ads (debug build only, labelled "Local mock ad"):**
  - native fill;
  - calculation interstitial before the result; synthetic revenue only in the test totals, real totals `none`;
  - invalid input → no ad;
  - 120 s natural AdMob interval;
  - no fill, show failure and duplicate callbacks → one continuation;
  - two simultaneous triggers → `presentation_busy`;
  - simulator risk fixture → `no_platform_available_after_exclusion`;
  - offline → skipped;
  - NoOp → `deferred not_configured` with no ad UI.
- **Configuration change (CFG01):** display size (`wm density 480`) and font size (`font_scale 1.3`) changed while the app is open, then reset. The app process survives and navigation still works.

## Firebase verification (functional build, real project)

| Check | Evidence | Result |
|---|---|---|
| Initialised from google-services.json | FB01: diagnostics screen app ID `1:436470368042:android:f265c3a01c22892b824053`, project `natural-potion-332914`, collection on, 32-hex app instance ID; logcat `FirebaseInitProvider: FirebaseApp initialization successful` | pass |
| Analytics delivery | FB04 (`evidence/functional/firebase-analytics-logcat.txt`): `Logging event: origin=app,name=calc_success`, `screen_view` events, 4 × `Successful upload … code 204`. No `ad_opportunity` / `ad_skip` events (NoOp ads held back), no loan amount in any parameter | pass |
| Remote Config | FB02: fetch status `success`; the project template has no `ad_config_*` keys yet, so the ad policy in use is `embedded-natural (embedded)` with the NoOp adapter | pass |
| Cloud Messaging | FB03: FCM registration token obtained (142 chars) through expo-notifications | pass (token only; no push was sent from the console) |
| Crashlytics | FB05 re-run (`evidence/functional-rerun/firebase-crashlytics-logcat.txt`): test non-fatal recorded; on next start `Crashlytics report successfully enqueued to DataTransport`, then `crashlyticsreports-pa.googleapis.com … Status Code: 200`. A real fatal JS crash during run 2 (the router bug below) was also captured and uploaded on the next start | pass |
| Mock build sends nothing | MOCK10: Firebase initialised, collection `off (mock / test build)`, test-crash button disabled | pass |
| Mapping file for readable traces | Gradle `uploadCrashlyticsMappingFileRelease` ran in the release build | done |

The Firebase **console** itself was not opened from here: dashboards, DebugView and the Crashlytics issue list are yours to look at (see FIREBASE.md "How to verify yourself").

## Problems found during testing and fixed

| Problem | Where | Fix |
|---|---|---|
| Tapping the Tools or Settings tab crashed the app (`TypeError: Cannot read property 'navigate' of undefined`) | custom tab bar: expo-router 58 passes `navigateToTab`, not `navigation` | `src/app/(tabs)/_layout.tsx` uses `navigateToTab(route.key)` |
| First-run notification prompt never appeared on Android 13+ (a never-asked permission reports "denied, can ask again") | `src/app/_layout.tsx` | Prompt shown for `undetermined` or askable `denied` |
| Mock APK silently contained the functional JS bundle | build cache | Build script always re-bundles |
| Several harness issues (keyboard detection on API 37, taps through the keyboard or during a fling, stale uiautomator sessions, quotes in dumped text) | `scripts/emu/driver.mjs` | Fixed in the driver; the mock fixtures are driven by a deep link instead of scrolling taps |
| ★ **App crash after a configuration change.** Changing display size or font size while the app was open recreated the activity; the next navigation of any kind then threw `The imperative router is unavailable before the first render has finished` (expo-router 58) → `FATAL EXCEPTION`. Found when the new diagnostics long-press ran right after LAYOUT360's density change; reproduced with `router.push('/language')` | `MainActivity` `configChanges` lacked `density`, `fontScale`, `fontWeightAdjustment` … | Config plugin `plugins/withConfigChanges.js` adds them, so the activity is not recreated (React Native updates metrics in place). Regression scenario CFG01 |
| Validation / failure / rating messages occasionally missed (VAL01, C03, C04, RATE01) | Test harness: the message is a 3.5 s snackbar, and a uiautomator dump waits for an idle screen, so one check can land after it is gone. Screenshots show the app reacting correctly (field in error state) | Repeat the triggering tap up to 3 times and poll every 150 ms (`calculateExpectSnack`) |
| FB05 reported "no upload confirmation" although the report was uploaded | Test looked for wording this Crashlytics SDK (21.0.0) does not log | Now requires `successfully enqueued to DataTransport` and HTTP 200 from `crashlyticsreports-pa.googleapis.com` |
| MOCK04 failed when MOCK02 ran slowly (184 s): more than 120 s had passed, so the ad was correctly allowed again | Timing assumption in the test | MOCK04 now resets counters, shows one interstitial and immediately tries again: `shown`, then `skipped interval` |
| `expo prebuild` → `EBUSY … rmdir android` | The Maven mirror was started from inside `android\` | Build script starts it from the repo root |
| Headless emulator process exited without a crash dump during functional run 1 (while a Gradle build ran in parallel) | Host / emulator | Restarted and the whole suite re-run; later runs were sequential |

## Not verified / limits

- arm64-v8a: built and packaged, but not run (no ARM device or emulator available).
- Automated runs used the headless emulator. The final APK was afterwards installed on a **windowed** emulator for manual testing; it opened on the intro screen. The Android System UI showed one "not responding" dialog right after that cold boot, which is the emulator's own software-rendering lag, not the app.
- Real ad SDKs and attribution are still placeholders by design (see FUTURE_INTEGRATIONS.md / FIREBASE.md).
- A remote push was not sent: FCM token retrieval is verified, delivery is for you to test from the Firebase console with the token on the diagnostics screen.
- No pixel comparison against the reference app: the replica uses an original design on purpose (see PARITY_REPORT.md).
