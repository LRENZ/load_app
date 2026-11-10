# Build matrix

Verified on the owner's Windows machine, 2026-11-10.

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
| TypeScript | 6.0.3 | `npm run typecheck` |

compileSdk 37, targetSdk 36, minSdk 24. Application ID `com.lrenz.loadapp`, versionName 1.0.0 (versionCode 1).

## Artifacts

| Artifact | Path | ABIs | Size | SHA-256 |
|---|---|---|---|---|
| Standalone APK (functional, NoOp ads) | `dist/loan-calc-1.0.0-standalone.apk` | x86_64, arm64-v8a | 57.7 MB | `4389978daafe28b61e7a9dadefbba657c722d4ef2e49a350d369f339e1310ec5` |
| Mock-ads test APK (debug fixtures) | `dist/loan-calc-mock-x86_64.apk` | x86_64 | ≈34 MB | `f8356bc53bea00936c1d0238ad393b493848582473f3a37ad5123683f93431fb` |

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
| Template `web.output: "server"` made the Android bundle step also build a web server manifest | `web` block removed from `app.json` (Android-only app) |
| PowerShell 5.1 turned Gradle's stderr warnings into terminating errors | `$ErrorActionPreference = 'Continue'` around the Gradle call |

## Emulator

- AVD `Pixel_7_API_37` (existing; not wiped), Android 17 (API 37), `sdk_gphone64_x86_64`, 1080×2400 @ 420 dpi, serial `emulator-5554`.
- The windowed emulator crashed once (QEMU crash dump, 09:13) and later hung during startup when launched from the agent's shell. Tests then ran with a **headless** emulator started outside the tool's process tree:

  ```powershell
  emulator -avd Pixel_7_API_37 -port 5554 -no-snapshot-save -no-boot-anim -no-window -no-audio -gpu swiftshader_indirect
  ```

  It booted in 25 s and stayed stable through every later run. A normal windowed start (Android Studio Device Manager) is fine for manual use.
