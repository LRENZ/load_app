# Build matrix

Verified on the owner's Windows machine, 2026-11-10; updated for **Repayly 1.1.0** on 2026-11-11.

## Toolchain

| Component | Version | Location / note |
|---|---|---|
| OS | Windows 11 Pro 10.0.26200 | 32 GB RAM |
| Node.js / npm | 24.22.2 / 11.19.1 | `npm test` uses Node's built-in test runner with TypeScript type stripping |
| JDK | Temurin 17.0.21+9 | `%USERPROFILE%\.jdks\jdk-17.0.21+9` (official Adoptium zip, no installer) |
| Gradle | 9.4.1 (wrapper) | SHA-256 verified `2ab2958f…7ec6cb`, pre-seeded in `~/.gradle/wrapper/dists` |
| Android Gradle Plugin / Kotlin | 9.2.1 / 2.2.10 | from RN 0.88 / Expo SDK 58 |
| Android SDK | platform android-37.0, build-tools 36.0.0 + 37.0.0, platform-tools 37.0.1, emulator 37.2.13 | `%LOCALAPPDATA%\Android\Sdk` |
| NDK | 27.1.12297006 (r27b) | SHA-1 `3bb7efc8…3703` verified against Google's repository2-3.xml |
| CMake | 3.22.1 | SHA-1 `292778f3…2c1b` verified |
| Expo SDK / React Native / React | 58.0.23 / 0.88.1 / 19.3.0 | New Architecture, Hermes |
| expo-router / expo-sqlite / expo-notifications | 58.0.30 / 58.0.15 / 58.1.8 | |
| decimal.js | 10.6.0 | 34-digit HALF_UP loan arithmetic |
| React Native Firebase (app, analytics, crashlytics, remote-config) | 27.1.0 (pinned; 27.1.1 was same-day) | Google services Gradle plugin 4.4.4, Crashlytics Gradle plugin 3.0.8, Crashlytics SDK 21.0.0 (from logcat); see FIREBASE.md |
| TypeScript | 6.0.3 | `npm run typecheck` |
| expo-application | 58.1.2 | Play install referrer → traffic cohort (1.1.0) |
| expo-localization | 58.0.5 | device language + Android 13+ per-app language (`supportedLocales`) |
| @resvg/resvg-js (dev) | 2.6.2 | renders the brand SVGs (`scripts/make-icons.mjs`) |
| Metro | Expo defaults + `inlineRequires: true` (`metro.config.js`) | lazy module evaluation |

compileSdk 37, targetSdk 36, minSdk 24. Application ID `com.tools.loadapp` (renamed from `com.lrenz.loadapp` on 2026-11-10 to match the Firebase app registration), versionName **1.1.0 (versionCode 2)**, app name **Repayly**. 1.0.0 was versionCode 1. Release builds run R8; the Crashlytics plugin uploads the mapping file during the build (`uploadCrashlyticsMappingFileRelease`), so release stack traces stay readable.

## Artifacts

| Artifact | Path | ABIs | Size | SHA-256 |
|---|---|---|---|---|
| Standalone APK 1.1.0 (functional, Firebase on, NoOp ads) | `dist/repayly-1.1.0.apk` (also attached to the GitHub release) | x86_64, arm64-v8a | 61.2 MB | `8d283db1acf4fe6f055a54173e978084f254fc6add0cec3dfdbc74e29caede2d` |
| Mock-ads test APK 1.1.0 (debug fixtures, Firebase collection off) | `dist/repayly-1.1.0-mock-x86_64.apk` | x86_64 | 36.2 MB | `4cef05b09059953354af6951095abaf533765b003a8bcf3d08be8f13dcb8ca6c` |
| Previous standalone 1.0.0 | `dist/loan-calc-1.0.0-standalone.apk` | x86_64, arm64-v8a | 61.3 MB | `d5894779ceae7f45d3d1f18494b1ece6a67e636c8e919a9e6bd4c18efdc9d30d` |

APKs are build outputs and are git-ignored. Rebuild them with the commands below.

## Variants

| Artifact | Command | JS bundle | Ads adapter | Signing | Use |
|---|---|---|---|---|---|
| Standalone (functional) | `.\scripts\android-build.ps1 -UseMirror` | embedded (`assets/index.android.bundle`, Hermes) | NoOp | debug keystore | Delivered test APK; runs with Metro stopped |
| Mock-ads test | `.\scripts\android-build.ps1 -Mode mock -UseMirror -Abis x86_64` | embedded | MockAdAdapter + Developer screen | debug keystore | Ad-policy testing only; never distribute |
| Development | `.\scripts\android-build.ps1 -Variant debug -UseMirror` + `npx expo start` | from Metro | NoOp (switchable in Developer screen) | debug keystore | Day-to-day development |

- **Why "standalone" uses Gradle's `release` build type:** React Native's `assembleDebug` loads JavaScript from Metro, so it can't be the Metro-free deliverable. The release build here is signed with the debug key. A production upload key is out of scope for this phase.
- **Re-bundling:** the build script always deletes the cached JS bundle. `EXPO_PUBLIC_APP_MODE` is inlined at bundle time but is not a Gradle input, so without this a "mock" build silently reused the functional bundle (seen once while testing).

## Build issues found and fixed

| Problem | Fix |
|---|---|
| No JDK on the machine; winget download stalled at 0 bytes behind the local proxy | Official Temurin 17 zip fetched with parallel ranged requests, unpacked to `%USERPROFILE%\.jdks` |
| Local proxy (`127.0.0.1:7897`) drops many Java TLS handshakes to Maven Central and the Plugin Portal; single-stream downloads ran at 50–200 KB/s | `scripts/maven-mirror.mjs`, a local caching mirror that fetches with curl (parallel ranges for large files, prefetch of siblings and declared dependencies), plus `scripts/mirror.init.gradle`. Enabled with `-UseMirror`. Cache: `~/.gradle/curl-mirror` (≈ 600 MB after the first build) |
| Gradle proxy settings in `GRADLE_OPTS` never reached the daemon | The build script passes them in `org.gradle.jvmargs`; TLS 1.2 forced; repository retries and a 15-minute read timeout |
| `ninja: mkdir … No such file or directory`: C++ codegen object paths over the Windows 260-character limit (`LongPathsEnabled=0`) | Expo config plugin `plugins/withShortCmakeObjectPaths.js` sets `CMAKE_OBJECT_PATH_MAX=259`, so CMake hashes long object paths. The default 250 was too low for the hashed path to fit, so CMake skipped hashing |
| `react-native-gesture-handler` (pulled in by expo-router's drawer) compiles sources from outside its android folder, giving the longest paths; the app doesn't use it | Android autolinking disabled in `react-native.config.js` |
| Template packages pulled in Jetpack Compose and other unused native modules (`@expo/ui`, `expo-image`, `expo-web-browser`, `expo-device`, `expo-symbols`, `expo-glass-effect`) | Removed; JS bundle 5 MB → 3.5 MB |
| `expo prebuild` failed with `EBUSY … rmdir android` | The Maven mirror had been started from inside `android` and held it as its working directory; the build script now starts it from the repo root |
| Template `web.output: "server"` made the Android bundle step also build a web server manifest | `web` block removed from `app.json` (Android-only app) |
| PowerShell 5.1 turned Gradle's stderr warnings into terminating errors | `$ErrorActionPreference = 'Continue'` around the Gradle call |

## Emulator

- AVD `Pixel_7_API_37` (existing; not wiped), Android 17 (API 37), `sdk_gphone64_x86_64`, 1080×2400 @ 420 dpi, serial `emulator-5554`.
- The windowed emulator crashed once (QEMU crash dump, 09:13) and later hung during startup when launched from the agent's shell. Tests then ran with a **headless** emulator started outside the tool's process tree:

  ```powershell
  emulator -avd Pixel_7_API_37 -port 5554 -no-snapshot-save -no-boot-anim -no-window -no-audio -gpu swiftshader_indirect
  ```

  It booted in 25 s and stayed stable through every later run. A normal windowed start (Android Studio Device Manager) is fine for manual use.
- **Start the emulator through Task Scheduler**, not WMI: started via `Win32_Process.Create` it exited three times with "received exit request from parent process" (2026-11-10/11). `schtasks /Create /TN RepaylyEmulator /TR "<sdk>\emulator\emulator.exe -avd Pixel_7_API_37 -port 5554 …" /SC ONCE /ST 23:59 /F`, `schtasks /Run /TN RepaylyEmulator`, then `schtasks /Delete /TN RepaylyEmulator /F` (the emulator keeps running). After a cold boot wait until `adb shell uptime` shows a load below ~8 before testing.
- 2026-11-10 ~20:34 the headless emulator process exited without a crash dump during a functional run (while a Gradle build was also running). It was restarted the same way and the whole suite re-run; see EMULATOR_TEST_REPORT.md.
