# Future integrations

Every external capability sits behind a typed interface. **Firebase (Analytics, Crashlytics, Remote Config, Cloud Messaging) is integrated** since 2026-11-10; see [FIREBASE.md](FIREBASE.md). Ads and attribution are still placeholders. This guide covers two things for each remaining integration: the **information** the owner must supply, and the **code** that still has to be written. Supplying IDs alone does not finish an integration.

## Where the seams are

| Capability | Interface (current file) | Current implementation | Real implementation later |
|---|---|---|---|
| Ads (all formats) | `AdAdapter` in `src/core/ads/adapters.ts` | `NoOpAdAdapter` (normal builds), `MockAdAdapter` (debug mock mode only) | One adapter per provider, or a mediation adapter, implementing `isInitialized / peek / load / present / destroy` |
| Ad policy | `AdGateway` in `src/core/ads/gateway.ts` | Complete: caps, intervals, risk mapping, candidate selection, exactly-once continuation | Unchanged; feed real cached ads and real paid values |
| Placement wiring | `src/core/ads/placements.ts` | All 25 IDs registered; 20 wired, 5 configuration-only | Native views for `NA_*` slots (see "Native ads") |
| Revenue | `RevenueLedger` in `src/core/ads/revenue.ts` | Local ledger, flushed to Firebase `ad_impression` (real SDK revenue only; test and AdMob revenue skipped) | Add Adjust as a second transport if wanted |
| Analytics | `AnalyticsSink` in `src/core/services/contracts.ts` | **Done:** local trace + `FirebaseAnalyticsSink` (`src/state/firebase.ts`) | Ad-policy events start flowing when `ADS_LIVE = true` |
| Remote config | `ConfigProvider` | **Done:** Firebase Remote Config `ad_config_natural` / `ad_config_paid` → `resolveAdConfig`, activated at app start | Publish the template in the Firebase console |
| Crash reporting | `CrashReporter` | **Done:** local list + Crashlytics | none |
| Push | `MessagingProvider` | **Done:** `FcmMessagingProvider` (FCM token through expo-notifications) | A server that sends to the tokens; data-message handling if needed |
| Attribution / cohort | `AttributionProvider` / `applyAttribution` in `src/core/cohort.ts` | Always `natural`; debug fixture can force `paid` (labelled fixture) | Adjust (or another MMP) callback → `applyAttribution` (sticky first value) |
| Risk signals | `RiskSignalProvider` in `src/core/ads/risk.ts` | `NoRiskSignals` (no device detection ships) | Optional; any real detector must be specified and reviewed separately |
| Store review | `recordRating` in `src/app/(tabs)/settings.tsx` | Saved locally plus an honest "not available in development" message | Google Play In-App Review, or the app's own listing URL (`EXPO_PUBLIC_STORE_REVIEW_URL`) |
| Legal pages | `src/app/legal/[doc].tsx` | Labelled development placeholder | `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_TERMS_URL` |

Owner configuration schema: `src/core/services/integrationConfig.ts` and `.env.example`. All values are empty now.

## Information the owner must supply

1. **Android identity**: application ID `com.tools.loadapp` (final), app name, and an upload/release keystore. The current APKs are signed with the Expo/React Native **debug** keystore and must not be published.
2. **Firebase**: done (project and `google-services.json` supplied). Still to do: add the SHA-1/SHA-256 of the release key to the Firebase Android app, and restrict the API key to the package.
3. **Ads**, for each provider you actually want (AdMob, Google Ad Manager, Pangle, TopOn, AppLovin MAX):
   - app / SDK keys (AdMob app ID, Pangle app ID, TopOn app ID + app key, AppLovin SDK key, GAM network code);
   - unit IDs per format: app_open, interstitial, native (and banner / rewarded only if you want those formats; no placement uses them today);
   - which placements may show which format (the default mapping is in `placements.ts`);
   - test device IDs.
4. **Consent**: whether a CMP is needed for your markets (for example Google UMP for the EEA/UK), and your privacy-policy URL.
5. **Attribution** (optional): MMP choice and app token. Decide whether cohort-specific ad frequency (the natural vs paid presets) should stay. It only affects caps, intervals and enabled providers.
6. **Legal / store**: privacy-policy URL, terms URL, Play listing URL.

## Code still needed after the information arrives

- Choose packages and check New Architecture compatibility, for example `react-native-google-mobile-ads` (AdMob / Ad Manager) and `react-native-applovin-max`. Pangle and TopOn need Kotlin bridges or a mediation adapter. Firebase is already in; see FIREBASE.md "Ads" for the AdMob / GAM steps.
- Add Expo config plugins: the AdMob application ID meta-data, and ProGuard rules for each SDK.
- Implement `AdAdapter` for each provider:
  - map SDK callbacks to `PresentListener`;
  - convert expected values for `selectCandidate`: AdMob micros ÷ 1,000,000, Pangle string → number, MAX `getRevenue()`;
  - deliver paid events in micros with currency and precision.
- **Native ads**: replace the mock card in `src/ui/ads.tsx` (`NativeAdSlot`) with the provider's registered native view. The RN mock is not a native-view integration.
- Revenue transport: already wired to Firebase (`adImpressionFor`). The adapter only has to deliver truthful `PaidRevenue` (provider, network, micros, currency) with `origin: 'provider_sdk'`.
- Set `ADS_LIVE = true` in `src/state/firebase.ts` once a real adapter replaces NoOp.
- Push: a recurring schedule needs WorkManager or a foreground service, not a JS timer.
- Tests with each provider's **test mode** on the emulator and a real device:
  - fill / no-fill;
  - paid callbacks;
  - caps and intervals across midnight;
  - app open on resume;
  - two concurrent triggers;
  - process death during an ad.

## Intentionally not built

- **Uninstall "retention" funnel and fake "Uninstall" launcher shortcut** (reference `IV_UNINSTALL_1`, `NA_UNINSTALL_1_BOTTOM`, `NA_UNINSTALL_2_BOTTOM`). These stay as unwired keys in the placement registry.
- **Paid-cohort-only lending marketing pages** ("Need money fast?", "Instant Cash Out"). The app has no lending service. A neutral three-page product intro is shown to every first launch instead.
- **Randomised revenue-source labels** (the reference's `rev_adj` / `rev_fir` weighted label draws). Revenue reports always carry the real provider and network.
- **Raw loan inputs in analytics.** Events carry the loan type and outcome only.
