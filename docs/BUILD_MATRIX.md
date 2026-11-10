# Build matrix

Verified on the owner's Windows machine, 2026-11-10.

## Toolchain

| Component | Version | Location / note |
|---|---|---|
| OS | Windows 11 Pro 10.0.26200 | |
| Node.js / npm | 24.22.2 / 11.19.1 | `npm test` uses Node's built-in test runner with TypeScript type stripping |
| JDK | Temurin 17.0.21+9 | `%USERPROFILE%\.jdks\jdk-17.0.21+9` (official Adoptium zip, no installer) |
| Gradle | 9.4.1 (wrapper) | SHA-256 verified `2ab2958f…7ec6cb`, pre-seeded in `~/.gradle/wrapper/dists` |
| Android Gradle Plugin / Kotlin | 9.2.1 / 2.2.10 | from RN 0.88 / Expo SDK 58 |
| Android SDK | platform android-37.0, build-tools 36.0.0 + 37.0.0, platform-tools 37.0.1 | `%LOCALAPPDATA%\Android\Sdk` |
| NDK | 27.1.12297006 (r27b) | SHA-1 verified against Google's repository2-3.xml |
| CMake | 3.22.1 | SHA-1 verified against Google's repository2-3.xml |
| Expo SDK / React Native / React | 58.0.23 / 0.88.1 / 19.3.0 | New Architecture, Hermes |
| expo-router / expo-sqlite / expo-notifications | 58.0.30 / 58.0.15 / 58.1.8 | |
| decimal.js | 10.6.0 | 34-digit HALF_UP loan arithmetic |
| TypeScript | 6.0.3 | `npm run typecheck` |

compileSdk 37, targetSdk 36, minSdk 24. ABIs built: `x86_64` (emulator) and `arm64-v8a` (devices).

## Variants

| Artifact | Command | JS bundle | Ads adapter | Signing | Use |
|---|---|---|---|---|---|
| Standalone APK (functional) | `.\scripts\android-build.ps1` | embedded (Hermes bytecode) | NoOp | debug keystore | Delivered test APK; runs with Metro stopped |
| Standalone APK (mock) | `.\scripts\android-build.ps1 -Mode mock` | embedded | MockAdAdapter + developer screen | debug keystore | Ad-policy testing only; never distribute |
| Development APK | `.\scripts\android-build.ps1 -Variant debug` + `npx expo start` | from Metro | NoOp (switchable in Developer screen) | debug keystore | Day-to-day development |

The "standalone" artifact is Gradle's `release` build type signed with the debug key. React Native's `assembleDebug` loads JavaScript from Metro, so it cannot be the Metro-free deliverable. A production upload key is out of scope for this phase.

## Network notes for this machine

The local proxy (`127.0.0.1:7897`) drops some Java TLS handshakes to Maven Central and the Gradle Plugin Portal. `android-build.ps1` handles this:

- passes the proxy and `https.protocols=TLSv1.2` to the Gradle **daemon** (`org.gradle.jvmargs`), not only to the launcher;
- turns on Gradle's repository retries.

The first build may still need a few attempts; later builds use the cache. Large SDK pieces (JDK, Gradle, NDK, CMake, build-tools 37) were fetched with parallel ranged downloads and checksum-verified before install.
