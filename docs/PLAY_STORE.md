# Publishing Repayly on Google Play

Everything the Play Console asks for, prepared from what the app actually does (v1.2.0, `com.tools.loadapp`).

## 1. Files to upload

| What | File |
|---|---|
| App Bundle (required for new apps) | `dist/repayly-1.2.0.aab`, signed with your **upload key** |
| App icon 512 × 512 | `assets/brand/play-store-icon-512.png` |
| Feature graphic 1024 × 500 | `assets/brand/feature-graphic-1024x500.png` |
| Phone screenshots (1080 × 2160, 2:1, within Play's limit) | `assets/store/screenshots/*.png` |

## 2. Your upload key (keep it safe)

- `credentials/repayly-upload.p12` plus `credentials/keystore.properties` (holds the password). Both are **git-ignored**; they exist only on this PC.
- **Back them up now** to two offline places, for example a password manager and an encrypted USB drive. If you lose the upload key, Google can reset it once you enrol in Play App Signing (step 3), but that takes support time.
- Upload key fingerprints (not secret):
  - SHA-1 `A4:8E:BE:7A:07:43:2C:F3:AC:EF:10:BA:20:EF:9B:23:D7:7F:F1:F9`
  - SHA-256 `50:51:A9:03:2A:EC:37:EE:21:FF:24:75:4A:C6:C6:8E:3D:5C:27:C3:C0:26:25:E2:91:F7:42:9E:D6:8B:FA:70`
- Build again any time: `.\scripts\android-build.ps1 -Bundle -UseMirror -Abis "armeabi-v7a,arm64-v8a,x86_64"`. Without `credentials/`, the build falls back to the debug key and Gradle prints a warning. Never upload such a build.

## 3. Play Console steps

1. **Create app**: name `Repayly: EMI & Loan Calculator`, default language English (US), App, Free.
2. **Play App Signing**: accept (recommended). Google keeps the app signing key; you upload with the upload key above.
3. **Testing → Internal testing**: create a release and upload `repayly-1.2.0.aab`. Add yourself as a tester and install from the opt-in link on a real phone.
4. **After the first upload**, open **Setup → App signing** and copy the **App signing key SHA-1**. Then:
   - Firebase console → Project settings → your Android app → **Add fingerprint**: add both the app-signing SHA-1 and the upload SHA-1.
   - Google Cloud console → APIs & Services → Credentials → the Android API key: **restrict** it to Android apps, package `com.tools.loadapp`, with both SHA-1s.
5. Fill in **App content** (section 5), **Store listing** (section 4) and pricing.
6. Promote internal → closed or open testing → production. New personal developer accounts must first run a closed test with at least 12 testers for 14 days before production access.

## 4. Store listing

**App name** (30/30): `Repayly: EMI & Loan Calculator`

**Short description** (74/80): `Calculate EMI, mortgage payments and total interest. Plan every repayment.`

**Full description:**

```
Repayly makes loan maths simple. Enter the amount, interest rate and term and see your monthly payment (EMI), total repayment, total interest and payoff date in seconds.

CALCULATORS
• Personal loan, business loan and auto loan EMI
• Mortgage with down payment (amount or %), property tax, PMI, HOA and home insurance
• Principal vs interest breakdown for every result
• Share a result with one tap
• History of your calculations, saved on your device

MONEY TOOLS
• Live exchange rates with offline cache
• Temperature, mass, speed and length converters
• World clock

MADE FOR YOU
• Six languages: English, Español, 简体中文, 日本語, 한국어, Português (Brasil)
• Follows your phone's language automatically, or pick one in the app
• Six currencies: GBP, USD, EUR, AUD, CNY, INR
• Clear errors that tell you exactly what to fix

PRIVATE BY DESIGN
Your loan amounts, rates and history never leave your phone.

Repayly is a calculator only. It does not lend money or arrange loans, and its results are estimates, not financial advice. Check final figures with your lender.
```

**Category:** Finance. **Tags:** Calculator, Finance tools, Personal finance.
**Contact email:** your developer email (it appears publicly on the listing; the in-app policy points people there).
**Privacy policy URL:** `https://github.com/LRENZ/load_app/blob/main/docs/legal/privacy-policy.md`

## 5. App content declarations

| Section | Answer |
|---|---|
| Privacy policy | URL above (same text as in the app) |
| **Ads** | **No, the app does not contain ads** (v1.2.0 shows none; change this when you add an ad SDK) |
| App access | All functionality is available without special access (no login) |
| Content rating | Utility / calculator: no violence, sexual content, gambling or user interaction; expect *Everyone* / PEGI 3 |
| Target audience | 18 and over (financial planning); not designed for children |
| News app | No |
| Government app | No |
| **Financial features** | The app calculates loan payments only. It does **not** provide, facilitate or advertise loans, and has no banking, payments, trading or crypto. Choose the option that matches this, for example "none of these" if offered |
| Health | None |
| Advertising ID | **No, the app does not use the advertising ID.** Collection is off in `firebase.json`, and since 1.2.0 the `AD_ID` and AdServices permissions that the Firebase SDK would add are **removed** from the manifest (`android.blockedPermissions`), so this answer matches the bundle. Play blocks a release that declares "No" while the manifest still has `AD_ID`. When you add AdMob, remove that block and answer Yes |

### Data safety (matches `docs/legal/privacy-policy.md`)

- Does the app collect or share required user data? **Yes, collected; not shared.** Firebase acts as a service provider, which Play does not count as sharing.
- Is all collected data encrypted in transit? **Yes** (HTTPS).
- Can users request deletion? **Yes**, by emailing the developer address.

| Data type | Collected | Purpose | Required / optional |
|---|---|---|---|
| App activity → App interactions | Yes (Firebase Analytics: screens, calculation success / failure, loan type, currency) | Analytics | Required |
| App info and performance → Crash logs | Yes (Crashlytics) | App functionality, Analytics | Required |
| App info and performance → Diagnostics | Yes (Crashlytics / Analytics device and app state) | App functionality, Analytics | Required |
| Device or other IDs | Yes (Firebase app-instance / installation ID, FCM token) | Analytics, App functionality | Required |
| Location → Approximate location | Declare **Yes** (conservative: Google derives country / region from the IP address) | Analytics | Required |
| Financial info, Personal info, Messages, Photos, Contacts, Precise location | **No.** Loan inputs stay on the device and are not "collected" under Play's definition | none | none |

## 6. Pre-launch checklist (done in this repo)

- [x] Signed with an upload key (not the debug key); versionCode 3, versionName 1.2.0
- [x] App Bundle for armeabi-v7a, arm64-v8a, x86_64; targetSdk 36; minSdk 24
- [x] No ads, no ad placeholders, no mock or debug UI in the release build (the developer screen exists only in the mock test build)
- [x] Real Privacy Policy and Terms in the app (6 languages) and online; no development placeholders
- [x] Rate Us opens the Play listing (4–5 stars); 1–3 stars stay as private feedback
- [x] Crashlytics mapping upload in the release build for readable crash reports
- [ ] Back up `credentials/` (you)
- [ ] Trademark check for "Repayly" (you; see BRANDING.md)
- [ ] Add the SHA-1s to Firebase and restrict the API key (you, after the first upload)
- [ ] Have fluent speakers review the 5 translated legal texts (`src/legal/texts.ts`)
