# Loan Calc (load_app)

React Native (Expo SDK 58, RN 0.88, TypeScript) Android app.

- **Calculators**: Personal, Business and Auto loan (EMI), and Mortgage with annual ownership costs.
- **History**: saved in SQLite and survives restarts.
- **Six tools**: live exchange rate with offline cache, temperature, mass, speed, length, world clock.
- **Six currencies and six languages.**
- **Settings**: rating, privacy and terms pages, and a live-rate notification.
- **Intro**: three pages on first launch.
- **Ads**: a local advertising-policy engine. Normal builds use a NoOp adapter (no ads shown). A debug mock mode exercises the policy with clearly labelled local mock ads.

Firebase, ad SDKs and attribution are **deferred**. See [docs/FUTURE_INTEGRATIONS.md](docs/FUTURE_INTEGRATIONS.md).

## Layout

| Path | What |
|---|---|
| `src/core/` | Platform-free logic, unit-tested with Node: decimal loan and mortgage engines, validation, dates, converters, FX, world clock, cohort |
| `src/core/ads/` | Placement registry (25 IDs), config resolution and presets, frequency caps, risk mapping, candidate selection, gateway, NoOp/mock adapters, revenue ledger |
| `src/core/services/` | Analytics / config / crash / messaging / attribution contracts with local or NoOp implementations; owner config schema |
| `src/i18n/` | en, es, zh-Hans, ja, ko, pt-BR |
| `src/storage/` | SQLite history and key-value preferences |
| `src/state/` | App store, service wiring, notifications |
| `src/ui/` | Components, pickers (currency, term unit, date, rating), ad slots |
| `src/app/` | Expo Router screens |
| `test/` | Node unit tests (`npm test`) |
| `scripts/emu/` | adb-driven emulator scenario runners |
| `docs/` | Build matrix, emulator report, parity report, future integrations |

## Windows setup

Requirements: Node 22+ (tested on 24.22.2), JDK 17 (tested on Temurin 17.0.21 at `%USERPROFILE%\.jdks\jdk-17.0.21+9`), and the Android SDK at `%LOCALAPPDATA%\Android\Sdk` with platform 37, build-tools 36 and NDK 27.1.12297006.

```powershell
npm ci
npm test                # unit tests (Node test runner)
npm run typecheck
npx expo prebuild --platform android --clean   # generates android/ (git-ignored)
```

## Build

```powershell
# Standalone APK, JS bundle embedded, runs without Metro (release variant signed with the debug key)
.\scripts\android-build.ps1 -UseMirror
# Debug-only mock-ads APK (x86_64 for the emulator)
.\scripts\android-build.ps1 -Mode mock -UseMirror -Abis x86_64
# Development APK that loads JS from Metro
.\scripts\android-build.ps1 -Variant debug -UseMirror
```

`-UseMirror` routes Maven downloads through `scripts/maven-mirror.mjs`, a local curl-backed cache. It is needed on this machine because the local proxy drops Java TLS handshakes; drop the flag on a normal network. Output: `android\app\build\outputs\apk\<variant>\app-<variant>.apk`. Delivered copies are in `dist\`. See [docs/BUILD_MATRIX.md](docs/BUILD_MATRIX.md) for versions and the build issues that were fixed.

Mock-ads fixture scripts can also be driven by deep link, for example `adb shell am start -a android.intent.action.VIEW -d 'loadapp://debug?run=r1&adMode=mock&fill=no_fill&reset=1&preload=1&trigger=one' com.lrenz.loadapp`. The outcome appears on the `last:` line of the Developer screen.

## Run on the emulator

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb -s emulator-5554 install -r android\app\build\outputs\apk\release\app-release.apk
& $adb -s emulator-5554 shell monkey -p com.lrenz.loadapp -c android.intent.category.LAUNCHER 1
```

Development workflow with Metro: `npx expo start`, then install the debug APK (or run `npx expo run:android`).

## Emulator scenarios

```powershell
node scripts/emu/run-functional.mjs evidence/functional   # standalone APK installed
node scripts/emu/run-mock.mjs evidence/mock               # mock APK installed
```
