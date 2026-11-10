# Emulator test report

All results below come from scripted runs on the local Android Studio emulator (`scripts/emu/*.mjs`, adb + uiautomator). Screenshots: `evidence/functional/screens/` and `evidence/mock/screens/`. Raw results: `evidence/*/results.jsonl` and `summary.json`.

## Environment

| Item | Value |
|---|---|
| Date | 2026-11-10 |
| Host | Windows 11 Pro 10.0.26200, Node 24.22.2, JDK Temurin 17.0.21, Android emulator 37.2.13, platform-tools 37.0.1 |
| AVD / serial | Pixel_7_API_37 / emulator-5554 (headless, `-gpu swiftshader_indirect`; see BUILD_MATRIX.md) |
| Device | sdk_gphone64_x86_64, Android 17 (API 37), build `CE2A.260420.051.A2`, ABIs x86_64 + arm64-v8a |
| Display | 1080×2400 @ 420 dpi (411 dp wide); 360 dp scenario via `wm density 480`, restored afterwards |
| Replica | `com.lrenz.loadapp` 1.0.0 (1), `dist/loan-calc-1.0.0-standalone.apk`, SHA-256 `4389978daafe28b61e7a9dadefbba657c722d4ef2e49a350d369f339e1310ec5` |
| Reference app | `com.easyloan.calculator.payment`, still installed and untouched (`pm path` checked before and after the run) |

## Commands actually run

```powershell
.\scripts\android-build.ps1 -Variant release -Mode functional -UseMirror -Abis 'x86_64,arm64-v8a'
adb -s emulator-5554 uninstall com.lrenz.loadapp
adb -s emulator-5554 install dist\loan-calc-1.0.0-standalone.apk
node scripts/emu/run-functional.mjs evidence/functional

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

`npm test`: **44/44 pass**.
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

### evidence/functional — 37/37 passed (started 2026-11-10T19:43:43.356Z, 1541 s)

| ID | Scenario | Result | Time | Notes |
|---|---|---|---|---|
| INST01 | fresh install: intro pages, Next/Start, persistent completion | pass | 24.5 s |  |
| NOT01 | first-run notification prompt → Not now | pass | 8.7 s |  |
| ONB02 | intro does not return after restart | pass | 10.7 s |  |
| UI03 | home with sample history | pass | 5.5 s |  |
| C01 | personal 10000 @ 6% 12 months → 860.66 / 10327.92 / 327.92 | pass | 53.5 s |  |
| NAV01 | Back from result keeps form input; Back again → home with saved entry | pass | 13.7 s |  |
| VAL01 | validation messages (empty, zero, term range) | pass | 119.4 s |  |
| C02 | zero rate + month-end via text date 01/31/2026 | pass | 63.4 s |  |
| C05 | 1000 @ 12% 1 month from 2026-01-31 → 1010.00, 2026-02-28 | pass | 57.8 s |  |
| C03 | monthly payment too small (1 @ 0% 360 months) | pass | 35.6 s |  |
| C04 | rounded total below principal (0.17 @ 0.0001% 12 months) | pass | 32.6 s |  |
| DATE01 | date picker: calendar, month arrows, year list, invalid text, Cancel keeps date | pass | 61.7 s |  |
| CUR01 | currency picker: Cancel does not commit, Confirm commits | pass | 76.3 s |  |
| C07 | business 12347.89 @ 7.125% 17 months → 765.77 | pass | 57.8 s |  |
| EDIT01 | Start new calculation clears the form | pass | 10.3 s |  |
| C06 | auto 25000 @ 5% 5 years → 471.78 | pass | 65.1 s |  |
| C08 | mortgage 500000 / 100000 (20%) 6% 30y + costs → 3298.20 | pass | 154.1 s |  |
| HIST01 | history after process restart: all records, newest first, opening a record | pass | 28.5 s |  |
| TOOL-temperature | temperature: 25 → 77.00, swap, invalid input | pass | 56.4 s |  |
| TOOL-mass | mass: 10 → 22.0462, swap, invalid input | pass | 56.6 s |  |
| TOOL-speed | speed: 100 → 62.1371, swap, invalid input | pass | 56.4 s |  |
| TOOL-length | length: 1 → 3.2808, swap, invalid input | pass | 55.0 s |  |
| FX01 | exchange rate: live USD→EUR, amount, swap, cache | pass | 28.6 s |  |
| CLOCK01 | world clock shows four zones | pass | 16.0 s |  |
| RATE01 | rating dialog: star selection, Submit, Close | pass | 27.5 s |  |
| LEGAL01 | privacy and terms: placeholder content, scroll, Back | pass | 15.3 s |  |
| NOT02 | notification permission: deny keeps switch off | pass | 23.0 s |  |
| NOT03 | notification permission: grant shows a local preview | pass | 34.0 s |  |
| LANG00 | language: Back without Confirm does not change language | pass | 14.8 s |  |
| LANG-es | language es applies app-wide and survives restart | pass | 35.9 s |  |
| LANG-zh-Hans | language zh-Hans applies app-wide and survives restart | pass | 36.7 s |  |
| LANG-ja | language ja applies app-wide and survives restart | pass | 36.5 s |  |
| LANG-ko | language ko applies app-wide and survives restart | pass | 36.1 s |  |
| LANG-pt-BR | language pt-BR applies app-wide and survives restart | pass | 37.3 s |  |
| LANG-en | back to English | pass | 15.5 s |  |
| LAYOUT360 | 360 dp width: home, form and result remain usable | pass | 71.8 s |  |
| BACK01 | Android Back on Home leaves the app (no exit ad in NoOp) | pass | 8.5 s |  |

### evidence/mock — 10/10 passed (started 2026-11-10T19:35:21.280Z, 283 s)

| ID | Scenario | Result | Time | Notes |
|---|---|---|---|---|
| MOCK00 | fresh mock build: intro Skip saves completion; onboarding opportunity continues | pass | 17.0 s |  |
| MOCK01 | native slot fills with a labelled Local mock ad after preload | pass | 11.4 s |  |
| MOCK02 | calculation interstitial: shown after valid calculate, result after close, synthetic revenue | pass | 129.2 s |  |
| MOCK03 | invalid calculate never triggers an ad | pass | 13.2 s |  |
| MOCK04 | natural cap: 120 s AdMob interval → second calculation shows result without ad | pass | 35.1 s |  |
| MOCK05 | no fill, show failure and duplicate callbacks continue exactly once | pass | 24.2 s |  |
| MOCK06 | two triggers at once: second reports presentation_busy, first still completes | pass | 9.3 s |  |
| MOCK07 | risk fixture (simulator) excludes AdMob → no platform for natural | pass | 12.3 s |  |
| MOCK08 | offline: opportunity skipped with reason offline | pass | 11.8 s |  |
| MOCK09 | NoOp adapter: deferred / not_configured, no native slot rendered | pass | 19.9 s |  |

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

## Problems found during testing and fixed

| Problem | Where | Fix |
|---|---|---|
| Tapping the Tools or Settings tab crashed the app (`TypeError: Cannot read property 'navigate' of undefined`) | custom tab bar: expo-router 58 passes `navigateToTab`, not `navigation` | `src/app/(tabs)/_layout.tsx` uses `navigateToTab(route.key)` |
| First-run notification prompt never appeared on Android 13+ (a never-asked permission reports "denied, can ask again") | `src/app/_layout.tsx` | Prompt shown for `undetermined` or askable `denied` |
| Mock APK silently contained the functional JS bundle | build cache | Build script always re-bundles |
| Several harness issues (keyboard detection on API 37, taps through the keyboard or during a fling, stale uiautomator sessions, quotes in dumped text) | `scripts/emu/driver.mjs` | Fixed in the driver; the mock fixtures are driven by a deep link instead of scrolling taps |

## Not verified / limits

- arm64-v8a: built and packaged, but not run (no ARM device or emulator available).
- Windowed emulator mode crashed once (host QEMU crash dump), so final runs were headless. App rendering was checked through screenshots.
- Remote push, real ad SDKs, Firebase and attribution are deferred by design (see FUTURE_INTEGRATIONS.md). The notification test proves permission handling and a local preview, not remote delivery.
- No pixel comparison against the reference app: the replica uses an original design on purpose (see PARITY_REPORT.md).
