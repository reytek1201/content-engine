# Beta release checklist (Phase 5.5)

Use this before **TestFlight** (iOS) and **Play internal testing** (Android).

---

## Pre-flight (web)

- [ ] Latest `main` deployed to Vercel (`https://www.slidepress.co`)
- [ ] Supabase migrations applied on production
- [ ] `/privacy` and `/terms` live (required for App Store / Play listing)
- [ ] `/api/health` returns `{ "ok": true }` (native connectivity checks)
- [ ] Smoke test: sign in, create campaign, generate images, save to Photos (native)

---

## Version numbers

Keep these in sync for each beta build:

| Location | Field | Example |
|----------|--------|---------|
| `ios/App/App.xcodeproj` | `MARKETING_VERSION` | `1.0` |
| `ios/App/App.xcodeproj` | `CURRENT_PROJECT_VERSION` | `1`, `2`, `3`… (increment every upload) |
| `android/app/build.gradle` | `versionName` | `"1.0"` |
| `android/app/build.gradle` | `versionCode` | `1`, `2`, `3`… (integer, must increase) |
| Vercel (optional) | `NEXT_PUBLIC_APP_VERSION` | `1.0.0` (web fallback in Settings → About) |

**Rule:** Every TestFlight / Play upload needs a **higher build number** (`CURRENT_PROJECT_VERSION` / `versionCode`), even if `MARKETING_VERSION` stays the same.

---

## Native assets & plugins

```bash
npm run cap:assets      # icons + splash (before first store build)
npm run cap:sync        # register Capacitor plugins in native projects
```

Then **rebuild** in Xcode / Android Studio (web deploy alone is not enough for native plugin or UA changes).

---

## iOS — TestFlight

### Prerequisites

- Apple Developer Program membership
- Xcode installed

### Steps

1. Open project: `npm run cap:ios`
2. Select **App** target → **Signing & Capabilities**
   - Team: your Apple Developer team
   - Bundle ID: `co.slidepress.app`
   - Enable **Sign in with Apple** (if not already)
   - Enable **Push Notifications** (optional; skip if not using FCM yet)
3. Increment **Build** (`CURRENT_PROJECT_VERSION`) in target **General**
4. **Product → Archive** (Any iOS Device destination)
5. **Distribute App → App Store Connect → Upload**
6. In [App Store Connect](https://appstoreconnect.apple.com/):
   - Create app record (if first time): name **SlidePress**, bundle ID `co.slidepress.app`
   - **Privacy Policy URL:** `https://www.slidepress.co/privacy`
   - **TestFlight** → add internal testers (up to 100) or external group
7. Wait for processing (~5–30 min), then invite testers

### App Store review notes (when you add external testers)

- Demo account credentials if login required
- Explain: app loads web content from slidepress.co; biometrics optional in Settings → Security

---

## Android — Internal testing

### Prerequisites

- Google Play Console account ($25 one-time)
- Android Studio

### Steps

1. Open project: `npm run cap:android`
2. **Build → Generate Signed Bundle / APK** → **Android App Bundle (.aab)**
   - Create or use existing upload keystore (store passwords safely)
3. Increment `versionCode` in `android/app/build.gradle`
4. In [Play Console](https://play.google.com/console/):
   - Create app **SlidePress**, package `co.slidepress.app`
   - **Policy → App content** — complete questionnaire (privacy, ads, etc.)
   - **Privacy policy URL:** `https://www.slidepress.co/privacy`
   - **Testing → Internal testing** → Create release → upload `.aab`
5. Add testers by email under **Internal testing → Testers**

---

## Store listing copy (draft)

**Subtitle (iOS):** Carousel slides & AI video in minutes

**Short description (Play):** Turn a topic into carousel slides, AI narration, and Reel-ready video — no design skills needed.

**Keywords:** carousel, reels, video, Instagram, TikTok, marketing, AI, social media

---

## Optional: push notifications in beta

Users opt in under **Settings → Notifications**. Configure **APNs** (iOS) and/or **FCM** (Android) on Vercel — see `docs/capacitor.md` → Push notifications. For TestFlight, set `APNS_USE_SANDBOX=false` and use production `aps-environment` in entitlements.

---

## Tester instructions (share with beta group)

1. Install from TestFlight / Play internal link
2. Sign in with Google, Apple, or email
3. Optional: Settings → Security → enable Face ID unlock
4. Create a campaign, wait for images, try **Save all to Photos**
5. Report bugs to hello@slidepress.co with app version from Settings → About

---

## After beta feedback

- Fix critical bugs → increment build numbers → new upload
- When stable, promote to **public** App Store / Play release (separate review)

See `docs/client-features.md` for Phase 6 (billing, video export).
