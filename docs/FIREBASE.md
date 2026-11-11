# Firebase

Integrated 2026-11-10 (v1.0.0, application ID `com.tools.loadapp`), using the Firebase project from your `google-services.json`. Ads are **not** integrated. The ad layer stays a NoOp placeholder with empty unit IDs (see "Ads" below).

| Product | Package | What the app does |
|---|---|---|
| Core | `@react-native-firebase/app` 27.1.0 | Reads `google-services.json` at build time (Google services Gradle plugin 4.4.4) |
| Analytics | `@react-native-firebase/analytics` 27.1.0 | Product events and screen views |
| Crashlytics | `@react-native-firebase/crashlytics` 27.1.0 | Fatal JS / native crashes and non-fatal errors (Crashlytics Gradle plugin 3.0.8) |
| Remote Config | `@react-native-firebase/remote-config` 27.1.0 | Ad-*policy* JSON per cohort (caps, intervals); applied at the next app start |
| Cloud Messaging | `expo-notifications` (declares firebase-messaging 25.0.1; the Firebase BoM may resolve a newer version) | FCM registration token; the system shows notification messages |

React Native Firebase is pinned to 27.1.0, not 27.1.1: 27.1.1 was published the same day (2026-11-10) and is too new to trust.

FCM goes through `expo-notifications` rather than `@react-native-firebase/messaging`. The app already uses expo-notifications for local notifications, and installing both registers two competing FCM services, of which only one receives messages.

## Setup

1. Put your `google-services.json` at the repo root. It is git-ignored; the build copies it into `android/app`. Its client entry must be for `com.tools.loadapp`.
2. Run `npx expo prebuild --platform android`, then build as usual (`.\scripts\android-build.ps1 -UseMirror`).
3. Settings in [`firebase.json`](../firebase.json):
   - Analytics and Crashlytics auto-collection are on;
   - the advertising ID and SSAID are **not** collected (`google_analytics_adid_collection_enabled` / `google_analytics_ssaid_collection_enabled` are false);
   - Crashlytics chains to the app's JS error handler.

**Mock / debug builds** (`EXPO_PUBLIC_APP_MODE=mock` or `__DEV__`) initialise Firebase but switch Analytics and Crashlytics collection **off**. Test traffic, fixture crashes and synthetic mock-ad revenue therefore never reach your project.

## What is sent

**Analytics events**: `app_start`, `intro_complete`, `calc_success`, `calc_invalid`, `calc_failure`, `fx_load`, `rating_submit`, plus `screen_view`.
- The `/result/42` route is reported as `result/[id]`.
- Params carry the loan type, outcome, currency or error code only. Amounts, rates and terms are never sent (FB04 checks this on the emulator).
- Ad-policy events (`ad_opportunity`, `ad_skip`, `ad_show_*` …) are **held back** while ads are a NoOp placeholder (`ADS_LIVE = false` in `src/state/firebase.ts`), because every one of them would say `not_configured`.
- Names that Firebase reserves (for example `ad_click`) are renamed with an `app_` prefix.
- These rules live in `src/core/services/firebaseMapping.ts` and are unit-tested in `test/firebase.test.ts`.

**Crashlytics**:
- Fatal crashes go through React Native Firebase's own handler.
- Non-fatal reports come from `crash.record(...)`, for example when saving history fails.

**Ad revenue** (later): `RevenueLedger.flush` sends `ad_impression` (`ad_platform`, `ad_source`, `value`, `currency`) every 60 s and when the app goes to the background. Two kinds of revenue are never sent:
- test / mock revenue;
- AdMob revenue, because AdMob reports `ad_impression` to a linked Firebase project itself and sending it again would double-count.

## Remote Config

| Key | Value | Default |
|---|---|---|
| `ad_config_natural` | JSON with the same shape as `EMBEDDED_NATURAL` in `src/core/ads/presets.ts` (`app_open` / `interstitial` / `native` → `bidding_platforms`, `total_frequency_limits`, `bidding_frequency_limits`; `ad_strategies`) | empty = use the embedded preset |
| `ad_config_paid` | same, for the paid cohort | empty = use the embedded preset |

- **Timing.** At start-up the app activates what the previous launch fetched, then fetches again for the *next* launch. A config therefore never changes in the middle of an ad opportunity. The minimum fetch interval is 12 h in normal builds and 0 in debug / mock builds.
- **Validation.** Invalid JSON, or JSON without an `interstitial` block, falls back to the embedded preset (`provenance: fallback_default`).
- **No ad unit IDs.** Remote Config cannot supply unit IDs; they stay empty placeholders, so even a valid remote policy shows no ads until an ad SDK adapter ships.

The template in the project was empty at test time, so the app reported `embedded-natural (embedded)`.

## How to verify yourself

Open the hidden **Firebase status** screen: in Settings, **long-press the "Loan Calc 1.0.0" line at the bottom**, or open `loadapp://diagnostics`. Mock builds also have a "Developer: Firebase status" row. The screen shows:
- the Firebase app ID and project;
- whether collection is on;
- the Analytics app instance ID;
- Remote Config activation and fetch status;
- the ad policy in use;
- the FCM token (long-press to copy);
- a **Send test non-fatal** button.

Things to check:

- **Analytics, live:** run the command below, then open Firebase console → Analytics → **DebugView** and use the app. Events appear within seconds. `adb shell setprop debug.firebase.analytics.app .none.` turns it off. Without DebugView, events reach the normal reports in up to 24 h.

  ```bash
  adb shell setprop debug.firebase.analytics.app com.tools.loadapp
  ```

- **Crashlytics:** tap **Send test non-fatal**, then close and reopen the app. Within a few minutes it appears under Crashlytics → **Non-fatals** as "Loan Calc Crashlytics test (non-fatal, safe to ignore)". The first report also completes the "Add Crashlytics to your app" onboarding in the console.
- **Push (FCM):** copy the token from the diagnostics screen. In Firebase console → **Messaging** → New campaign → Notifications → **Send test message**, paste the token. With the app in the background, the notification appears in the shade.

## Ads (placeholder, for later AdMob / Google Ad Manager)

Nothing ad-related talks to Firebase or any ad network yet:
- `NoOpAdAdapter` answers every opportunity with `deferred not_configured`;
- unit IDs are empty (`emptyUnits()`);
- `ADS_LIVE = false`.

To add AdMob or GAM later:

1. Add `react-native-google-mobile-ads` with its Expo plugin and your AdMob **app ID** in `app.json`. Without the app ID meta-data the SDK crashes at start-up.
2. Implement `AdAdapter` for it (see FUTURE_INTEGRATIONS.md). Put unit IDs in `IntegrationConfig.ads.units`, using Google's test unit IDs until the account is approved.
3. Link AdMob to this Firebase project (AdMob → Settings → Linked services). AdMob then reports `ad_impression` revenue itself; `adImpressionFor` already skips AdMob, so it isn't counted twice.
4. Set `ADS_LIVE = true` so the ad-policy funnel events go to Analytics.
5. Remote Config `ad_config_*` keys then control caps and intervals without an app update.

## Privacy / Play Console notes

- Collected:
  - app interactions (Analytics events and screen views);
  - crash logs and diagnostics (Crashlytics);
  - the Firebase installation / app instance ID;
  - the FCM token.
- Not collected: the advertising ID or SSAID (both disabled in `firebase.json`). Loan inputs are never sent.
- Since 1.2.0 the `AD_ID` and AdServices permissions that the Analytics SDK adds are **removed** from the manifest (`android.blockedPermissions` in app.json), so the Play Console answer "does not use advertising ID" matches the bundle. AdMob will need `AD_ID` again: remove it from `blockedPermissions` when ads ship.
- Declare these in the Play **Data safety** form. If you serve users in the EEA / UK, add a consent step (for example Google UMP) before turning on ads and analytics consent mode. `setConsent` is available in the Analytics API.
- `google-services.json` isn't a secret in the strict sense, but it identifies your project. It is git-ignored here; restrict the API key in Google Cloud console to the Android app (package + SHA-1).
