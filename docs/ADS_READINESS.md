# Advertising readiness (v1.1.0)

**Bottom line:** the ad *policy* layer is complete and tested. That covers every planned ad format and placement, the natural vs paid traffic rules, caps, intervals, provider selection and revenue reporting. What is still missing is only the parts that need your accounts: a real ad SDK adapter (AdMob / Ad Manager …) with your unit IDs. Since 1.1.0 real installs are also classified as natural or paid traffic (from the Google Play install referrer). Before that, every real user was treated as natural.

## 1. Planned ad variants: all present

| Format | Placements (trigger) | Status |
|---|---|---|
| App open | `SP_APP_OPEN` (app start) | wired |
| Interstitial | `IV_ONBOARDING_COMPLETE` (intro Start/Skip), `IV_CALCULATION_COMPLETE` (valid calculation, after the record is saved), `IV_RETURN_TO_HOME` (leaving a secondary page for Home), `IV_HOME_TAB` (Home tab re-selected), `IV_LANGUAGE_CONFIRM`, `IV_CURRENCY_CONFIRM`, `IV_ENTER_SECONDARY` (gated, off), `IV_EXIT_APP` (gated, off) | wired |
| Native | `NA_HOME`, `NA_CALCULATOR_ACTIONS`, `NA_RESULT_DISCLAIMER`, `NA_LANGUAGE`, `NA_CURRENCY`, six tool pages (`NA_EXCHANGE_RATE` … `NA_WORLD_CLOCK`) | wired (RN container; a real SDK needs its native view, see FUTURE_INTEGRATIONS.md) |
| Full-screen native | uses the native config with its own tracker | supported by the gateway |
| Banner / rewarded | config keys only (`BA_HOME`); no placement uses them | configuration only, by design |
| Not built | `NA_ONBOARDING` (no container in the intro), uninstall-retention funnel (`IV_UNINSTALL_1`, `NA_UNINSTALL_*`) | intentionally unwired |

25 placement IDs in `src/core/ads/placements.ts`: 20 wired, 5 configuration-only. Unit test `ad readiness` (test/v110.test.ts) checks that every wired placement has a format config for **both** cohorts.

## 2. Traffic-based triggering: natural vs paid

**How it works:**
1. **Classification (new in 1.1.0).** About 1.5 s after the first screen, the app reads the Google Play install referrer once (`expo-application`), then:
   - **paid**: a Google Ads click id (`gclid` / `gbraid` / `wbraid`), a paid `utm_medium` (cpc, display, paid_social …), or an ad network's own referrer source (`apps.facebook.com`, TikTok, AppLovin, Unity, ironSource, Mintegral, Moloco …);
   - **natural**: Play's organic value, an empty referrer (sideload), and non-paid media (referral, email, social).
   - The **first** classification sticks (`applyAttribution`). A failed read is retried on the next 2 launches.
   - Code: `attributionFromReferrer` in `src/core/cohort.ts`, `ensureAttribution` in `src/state/services.ts`. 14 referrer shapes are covered by unit tests.
2. **Reporting.** The cohort is sent to Firebase as the user property `traffic_cohort`, plus one `install_attribution` event. Analytics reports and Remote Config conditions can split by it.
3. **Policy.** Every ad opportunity asks the gateway with the current cohort. The cohort picks the policy (`ad_config_natural` / `ad_config_paid`), which sets the enabled providers, daily show / click caps, minimum intervals per provider and in total, and the strategies.

**The two shipped policies differ** (as built into the app, used until Remote Config overrides them):

| | Natural (organic) | Paid |
|---|---|---|
| App open | AdMob, TopOn, GAM, MAX · 10/day · 3 clicks · 60 s apart | same providers · 20/day · 10 clicks · no interval |
| Interstitial / native | + Pangle · 10/day · 3 clicks · 30 s apart | 20/day · 10 clicks · no interval |

The reference app's stored remote values are stricter for organic users and looser for paid ones:
- natural: AdMob only, 2/day per format, 5/day in total, 120 s apart;
- paid: AdMob, Pangle, TopOn, MAX, up to 50/day.

They are exported **ready to paste** into Firebase Remote Config as [`docs/remote-config/ad_config_natural.json`](remote-config/ad_config_natural.json) and [`ad_config_paid.json`](remote-config/ad_config_paid.json). The export script checks that the app accepts both (`stored`, not `fallback`). Publish them, or your own values, when ads go live.

**Already verified:**
- Unit tests: 44 + 13 cover:
  - caps, intervals and midnight reset;
  - highest value wins, with ties in provider order AdMob > GAM > Pangle > TopOn > MAX;
  - exactly-once continuation, `presentation_busy`;
  - offline, no fill, show failure, duplicate callbacks;
  - risk mapping;
  - sticky cohort; referrer parsing;
  - revenue micros and dedupe; Remote Config fallback.
- Emulator (mock-ads build): MOCK00–MOCK10, including the paid cohort with several providers and the 120 s natural interval (`shown` then `skipped interval`).
- Emulator (real build): ATTR01, the referrer is read and stored after start-up; a sideloaded install is natural.

## 3. What still needs you (no code is blocked on it)

| Item | Why | Where it plugs in |
|---|---|---|
| AdMob / Ad Manager app ID and unit IDs | Nothing can be requested without them; units are empty placeholders | `IntegrationConfig.ads`, `app.json` plugin for `react-native-google-mobile-ads` |
| An `AdAdapter` for the SDK | Maps SDK load / show / paid callbacks onto the gateway | `src/core/ads/adapters.ts` (FIREBASE.md "Ads" lists the 5 steps) |
| `ADS_LIVE = true` | Ad-policy events start flowing to Analytics | `src/state/firebase.ts` |
| Remote Config values | Choose the natural / paid policies you want live | Firebase console → Remote Config → `ad_config_natural`, `ad_config_paid` |
| Optional MMP (Adjust / AppsFlyer) | More precise paid attribution than the Play referrer, for example view-through installs and networks that do not pass a referrer | `applyAttribution` already accepts any source; the first value still sticks |
| Consent (UMP) for EEA / UK | Required before personalised ads there | Before the first ad request |

## 4. Known limits

- The Play install referrer covers Google Ads app campaigns (click ids) and networks that tag their Play links. View-through installs and networks that send nothing are counted as natural. An MMP fixes that if paid volume matters.
- Native placements render a React Native mock card in the debug build. Production needs the SDK's own native view, by SDK policy.
