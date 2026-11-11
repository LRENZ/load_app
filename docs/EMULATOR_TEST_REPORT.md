# Emulator test report: Repayly 1.2.0 (production)

All results come from scripted runs on the local Android Studio emulator (`scripts/emu/*.mjs`, adb + uiautomator). Screenshots are in `evidence/*/screens/`; raw results in `evidence/*/results.jsonl` and `summary.json`.

## Summary (2026-11-11)

| Suite | Result |
|---|---|
| Unit tests (`npm test`) | **57/57** |
| Functional, full run on the production APK `dist/repayly-1.2.0.apk` (upload-key signed) | **46/48** |
| The 2 that failed, re-run on the same APK (`evidence/functional-rerun`) | **2/2**, so **all 48 scenarios passed on 1.2.0** |
| Mock ads + Firebase-off check (debug-only test build, run on 1.1.0; the ad code is unchanged in 1.2.0) | 9/11 + 3/3 re-run, **all 11 passed** |
| App crashes in the 1.2.0 run (device log) | **0** app `FATAL EXCEPTION`, **0** JS errors, **0** ANRs (the one fatal in the log is the uiautomator test tool) |

The two 1.2.0 re-runs:
- **NOT02:** Android's permission dialog appeared late on the loaded emulator. It passed on re-run, and NOT03, which uses the same switch, passed in the full run.
- **LEGAL01:** a bug in the test tool. The new privacy policy contains double quotes, so uiautomator writes that text with single quotes, which the driver didn't parse. The screen itself showed the real policy (`FAIL-LEGAL01` screenshot). Driver fixed; passed on re-run.

**Production checks done on the 1.2.0 files:**
- APK and AAB are signed by `CN=Repayly Upload Key` (SHA-1 `A4:8E:…:F1:F9`). `apksigner`: v2 verified, 1 signer. `jarsigner`: verified.
- `aapt2`: package `com.tools.loadapp`, versionCode 3, versionName 1.2.0, label Repayly, targetSdk 36, native code arm64-v8a + armeabi-v7a + x86_64, **no AD_ID / AdServices permission**.
- No ad UI and no placeholder text in the production build:
  - LEGAL01 checks the real policy and terms with no development banner;
  - RATE01 checks the store flow instead of the old "development build" message;
  - the home screen has no ad slot.

**1.2.0-specific scenarios:**

| ID | Checks |
|---|---|
| RATE01 | 2 stars → in-app thank-you (no store); 5 stars → Google Play opens on the Repayly listing; Close |
| LEGAL01 | Privacy Policy starts "Repayly Privacy Policy" and describes Firebase and the install referrer; no "placeholder" text, no development banner; Terms start "Repayly Terms of Use" |

## Environment

| Item | Value |
|---|---|
| Host | Windows 11 Pro 10.0.26200, 20 logical CPUs, 32 GB, shared with other workloads |
| Tools | Node 24.22.2, JDK Temurin 17.0.21, Android emulator 37.2.13, platform-tools 37.0.1, build-tools 37.0.0 |
| AVD | Pixel_7_API_37, Android 17 (API 37), x86_64, headless for automated runs. Started via Task Scheduler; see BUILD_MATRIX.md |
| App | `dist/repayly-1.2.0.apk`, SHA-256 `3558da44b8edc54f1a5fd8e17520955f3158d61f3a03db6b00d1d308ff99f492` |
| Bundle | `dist/repayly-1.2.0.aab`, SHA-256 `26b37bffb336daee72609d159bd6169146fa95b32d8751d81a87007b1f6e85c1` |

The emulator exited between runs several times (11-10/11):
- three times "received exit request from parent process", when it was started through WMI;
- once a graceful shutdown right after its shared network-simulator connection (`netsim`) was cancelled from outside.

Neither is an app crash. Each time it was restarted and the affected scenarios re-run.

## Results (1.2.0 functional; mock suite from 1.1.0)

### evidence/functional — 46/48 passed (started 2026-11-11T14:23:41.124Z, 2543 s)

| ID | Scenario | Result | Time | Notes |
|---|---|---|---|---|
| INST01 | fresh install: intro pages, Next/Start, persistent completion | pass | 25.8 s |  |
| NOT01 | first-run notification prompt → Not now | pass | 8.4 s |  |
| ONB02 | intro does not return after restart | pass | 9.8 s |  |
| UI03 | home with sample history | pass | 4.9 s |  |
| C01 | personal 10000 @ 6% 12 months → 860.66 / 10327.92 / 327.92 | pass | 49.7 s |  |
| NAV01 | Back from result keeps form input; Back again → home with saved entry | pass | 11.8 s |  |
| VAL01 | validation messages (empty, zero, term range) | pass | 108.4 s |  |
| C02 | zero rate + month-end via text date 01/31/2026 | pass | 57.9 s |  |
| C05 | 1000 @ 12% 1 month from 2026-01-31 → 1010.00, 2026-02-28 | pass | 53.6 s |  |
| C03 | monthly payment too small (1 @ 0% 360 months) | pass | 31.1 s |  |
| C04 | rounded total below principal (0.17 @ 0.0001% 12 months) | pass | 28.7 s |  |
| DATE01 | date picker: calendar, month arrows, year list, invalid text, Cancel keeps date | pass | 54.5 s |  |
| CUR01 | currency picker: Cancel does not commit, Confirm commits | pass | 65.9 s |  |
| C07 | business 12347.89 @ 7.125% 17 months → 765.77 | pass | 50.2 s |  |
| EDIT01 | Start new calculation clears the form | pass | 9.4 s |  |
| C06 | auto 25000 @ 5% 5 years → 471.78 | pass | 57.2 s |  |
| C08 | mortgage 500000 / 100000 (20%) 6% 30y + costs → 3298.20 | pass | 125.0 s |  |
| HIST01 | history after process restart: all records, newest first, opening a record | pass | 24.2 s |  |
| TOOL-temperature | temperature: 25 → 77.00, swap, invalid input | pass | 54.5 s |  |
| TOOL-mass | mass: 10 → 22.0462, swap, invalid input | pass | 48.1 s |  |
| TOOL-speed | speed: 100 → 62.1371, swap, invalid input | pass | 73.5 s |  |
| TOOL-length | length: 1 → 3.2808, swap, invalid input | pass | 87.3 s |  |
| FX01 | exchange rate: live USD→EUR, amount, swap, cache | pass | 85.7 s |  |
| CLOCK01 | world clock shows four zones | pass | 32.3 s |  |
| RATE01 | rating: 1–3 stars = local thanks; 4–5 stars open the Google Play listing; Close | pass | 99.4 s |  |
| LEGAL01 | privacy policy and terms: real documents (no development placeholder), Back | **FAIL** | 13.7 s | Cannot read properties of undefined (reading 'startsWith') |
| NOT02 | notification permission: deny keeps switch off | **FAIL** | 35.0 s | timeout waiting for {"contains":"t allow"} |
| NOT03 | notification permission: grant shows a local preview | pass | 65.7 s |  |
| LANG00 | language: Back without Confirm does not change language | pass | 20.5 s |  |
| LANG-es | language es applies app-wide and survives restart | pass | 70.3 s |  |
| LANG-zh-Hans | language zh-Hans applies app-wide and survives restart | pass | 107.3 s |  |
| LANG-ja | language ja applies app-wide and survives restart | pass | 57.9 s |  |
| LANG-ko | language ko applies app-wide and survives restart | pass | 67.9 s |  |
| LANG-pt-BR | language pt-BR applies app-wide and survives restart | pass | 65.9 s |  |
| LANG-en | back to English | pass | 19.8 s |  |
| LANG-SYS | Use device language: follows a live device-language change, a restart, and the Android per-app language | pass | 76.1 s |  |
| KEY01 | keyboard Next moves amount → rate → term, Done calculates | pass | 55.9 s |  |
| RES01 | result summary: monthly, principal / interest split, Share opens the Android share sheet | pass | 40.1 s |  |
| VAL02 | validation message stays under the field and clears when the field is edited | pass | 70.6 s |  |
| ATTR01 | traffic source read from the Play install referrer after start-up and stored (sideload = natural) | pass | 50.9 s |  |
| LAYOUT360 | 360 dp width: home, form and result remain usable | pass | 134.4 s |  |
| CFG01 | display size and font size changed while open: no restart, navigation still works | pass | 64.7 s |  |
| FB01 | Firebase initialised from google-services.json: app id, project, collection on, instance id | pass | 59.3 s |  |
| FB02 | Remote Config fetch succeeds; ad policy stays on the NoOp placeholder | pass | 20.3 s |  |
| FB03 | FCM registration token obtained | pass | 23.3 s |  |
| FB04 | Analytics: product events and screen views reach the Firebase SDK; NoOp ad events do not | pass | 79.8 s |  |
| FB05 | Crashlytics: labelled test non-fatal recorded, sent on next start, HTTP 200 from crashlyticsreports | pass | 70.2 s |  |
| BACK01 | Android Back on Home leaves the app (no exit ad in NoOp) | pass | 15.7 s |  |

### evidence/functional-rerun — 2/2 passed (started 2026-11-11T15:24:48.742Z, 108 s)

| ID | Scenario | Result | Time | Notes |
|---|---|---|---|---|
| NOT02 | notification permission: deny keeps switch off | pass | 51.2 s |  |
| LEGAL01 | privacy policy and terms: real documents (no development placeholder), Back | pass | 38.1 s |  |

### evidence/mock — 9/11 passed (started 2026-11-11T12:47:22.381Z, 448 s)

| ID | Scenario | Result | Time | Notes |
|---|---|---|---|---|
| MOCK00 | fresh mock build: intro Skip saves completion; onboarding opportunity continues | pass | 41.7 s |  |
| MOCK01 | native slot fills with a labelled Local mock ad after preload | pass | 13.9 s |  |
| MOCK02 | calculation interstitial: shown after valid calculate, result after close, synthetic revenue | pass | 185.5 s |  |
| MOCK03 | invalid calculate never triggers an ad | pass | 17.8 s |  |
| MOCK04 | natural cap: right after a shown interstitial, the next opportunity and a real Calculate show no ad (120 s AdMob interval) | **FAIL** | 44.8 s | timeout waiting for {"id":"tab-index"} |
| MOCK05 | no fill, show failure and duplicate callbacks continue exactly once | pass | 29.5 s |  |
| MOCK06 | two triggers at once: second reports presentation_busy, first still completes | pass | 12.7 s |  |
| MOCK07 | risk fixture (simulator) excludes AdMob → no platform for natural | pass | 14.8 s |  |
| MOCK08 | offline: opportunity skipped with reason offline | pass | 13.5 s |  |
| MOCK09 | NoOp adapter: deferred / not_configured, no native slot rendered | **FAIL** | 24.7 s | timeout waiting for {"id":"tab-index"} |
| MOCK10 | mock build: Firebase initialised but collection off (no test analytics, crashes or synthetic revenue sent) | pass | 49.4 s |  |

### evidence/mock-rerun — 3/3 passed (started 2026-11-11T13:00:21.628Z, 144 s)

| ID | Scenario | Result | Time | Notes |
|---|---|---|---|---|
| MOCK03 | invalid calculate never triggers an ad | pass | 29.9 s |  |
| MOCK04 | natural cap: right after a shown interstitial, the next opportunity and a real Calculate show no ad (120 s AdMob interval) | pass | 82.8 s |  |
| MOCK09 | NoOp adapter: deferred / not_configured, no native slot rendered | pass | 31.6 s |  |

## Start-up time

`am start -W` TotalTime (process start → first app frame; the splash stays until the first screen is ready):

| Measurement | 1.0.0 | 1.1.0 |
|---|---|---|
| Quiet emulator, after install + idle | 4.9–5.8 s, median 5.4 s (6 runs, morning) | 5.2–7.9 s, median 6.1 s (5 runs, afternoon) |
| Interleaved A/B, same AOT compile state (`cmd package compile -m speed-profile -f`), busy host | median 10.5 s (7 valid runs) | median 11.1 s (9 valid runs) |

**No measurable start-up gain on this emulator.** Native start-up dominates there: one cold start took ~0.9 s to Firebase init, 0.6 s Firebase, 0.6 s RN libraries, 1.0 s JS engine, 0.8 s bundle, 0.6 s first render. The two 1.1.0 changes (lazy module loading; Remote Config fetch, push token and install referrer deferred until after the first screen) move JS and network work off the start-up path, but on a software-rendered emulator the difference is inside the noise. A real phone is needed to measure it.

## Scenarios added in 1.1.0

| ID | Checks |
|---|---|
| LANG-SYS | "Use device language": device switched to es-ES **while the app is open** → app turns Spanish without restarting (same PID); still Spanish after a cold start; Android per-app language set to ja → Japanese; cleared → back to the device language; device restored to en-US → English |
| KEY01 | Keyboard **Next** moves amount → rate → term, **Done** calculates (no taps), result £860.66 |
| RES01 | Result summary: £860.66, principal 96.8 % / interest 3.2 %; **Share** opens the Android share sheet with the result text |
| VAL02 | Validation message stays under the field (still there after 4.5 s) and clears when the field is edited |
| ATTR01 | After start-up the Play install referrer is read and stored; this sideloaded install: cohort `natural`, network `organic`, source `install_referrer` |
| CFG01 | Display size + font size changed while open: no restart, navigation still works |
| FB01–FB05, MOCK10 | Firebase (from 1.0.x), re-run on 1.1.0: all pass |

## 1.1.0 history (same day)

1.1.0 (debug-signed) passed all 48 functional scenarios (38 in a full run + 10 targeted re-runs after test-script fixes) and all 11 mock scenarios; 1 ANR was seen under heavy emulator overload (load average ~18; the reference app also hit an ANR then). Its evidence is in git history at commit 91f54dc.

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

- **1.1.0 additions:** device-language following (LANG-SYS), keyboard flow (KEY01), result summary and share (RES01), persistent inline validation (VAL02), traffic cohort from the install referrer (ATTR01).

## Firebase verification (functional build, real project)

| Check | Evidence | Result |
|---|---|---|
| Initialised from google-services.json | FB01: diagnostics screen app ID `1:436470368042:android:f265c3a01c22892b824053`, project `natural-potion-332914`, collection on, 32-hex app instance ID; logcat `FirebaseInitProvider: FirebaseApp initialization successful` | pass |
| Analytics delivery | FB04 (`evidence/functional/firebase-analytics-logcat.txt`): `Logging event: origin=app,name=calc_success`, `screen_view` events, 4 × `Successful upload … code 204`. No `ad_opportunity` / `ad_skip` events (NoOp ads held back), no loan amount in any parameter | pass |
| Remote Config | FB02: fetch status `success`; the project template has no `ad_config_*` keys yet, so the ad policy in use is `embedded-natural (embedded)` with the NoOp adapter | pass |
| Cloud Messaging | FB03: FCM registration token obtained (142 chars) through expo-notifications | pass (token only; no push was sent from the console) |
| Crashlytics | FB05 (`evidence/functional/firebase-crashlytics-logcat.txt`, 1.1.0 full run): test non-fatal recorded; on next start `Crashlytics report successfully enqueued to DataTransport`, then `crashlyticsreports-pa.googleapis.com … Status Code: 200`. In 1.0.x testing a real fatal JS crash (the router bug below) was also captured and uploaded on the next start | pass |
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
| Calculation failures ("monthly payment too small", "total below principal") were shown only in a 3.5 s snackbar and were easy to miss | 1.1.0 review (C03 kept missing it on the loaded emulator) | Shown above Calculate until the next edit (`FormMessage`); field errors stay under the field |
| Emulator process exited 3 times ("received exit request from parent process") | Host: emulator started via WMI `Win32_Process.Create` | Started via Task Scheduler (`schtasks /Create … /Run`, task deleted right after) |
| Privacy Policy and Terms were development placeholders, and the privacy text wrongly said no analytics leaves the device; Rate Us said "not available in this development build" | Production review (1.2.0) | Real documents in 6 languages (`src/legal/texts.ts`, public copy `docs/legal/`); Rate Us opens the Play listing for 4–5 stars |
| Play would block a release declaring "no advertising ID" while the manifest still had `AD_ID` (added by the Analytics SDK) | Production review (1.2.0) | `AD_ID` and AdServices permissions removed via `android.blockedPermissions` (verified with aapt2) |
| LEGAL01 read no text from the policy | Test driver: uiautomator writes an attribute with single quotes when the value contains double quotes | `parseNodes` accepts both quote styles and `&apos;` |
| LANG-*, MOCK03 left the test on the form | Test scripts: 1.1.0 focuses the errored field, so Back first closes the keyboard; LANG checks used the pre-rename title | `hideKeyboard()` / `toTabs()` before Back; localized tagline instead of title |

## Not verified / limits

- **Start-up speed:** no measurable gain on this emulator (see "Start-up time"). Needs a real-phone measurement.
- **One ANR** in the 1.1.0 run under heavy emulator load; none in the 1.2.0 run. Not investigated further.
- **arm64-v8a** is built and packaged but not run (no ARM device or emulator).
- **Real install referrer:** only a sideloaded install was tested (→ organic). Paid classification is covered by unit tests with 14 referrer shapes, not by a real Play install from an ad.
- **Remote push** was not sent (token only). No real ad SDK or attribution SDK is present yet, by design.
- No pixel comparison against the reference app (original design on purpose; see PARITY_REPORT.md).
