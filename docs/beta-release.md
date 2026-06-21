# Beta release checklist (Phase 5.5)

Use this before **TestFlight** (iOS) and **Play internal testing** (Android).

---

## Pre-flight (web)

- [x] Latest `main` deployed to Vercel (`https://www.slidepress.co`) — includes native mobile UX (June 2026)
- [x] Supabase migrations applied on production (`platform_connections`, `platform_posts`, Instagram + carousel constraints)
- [x] `/privacy` and `/terms` live (includes YouTube, TikTok, Instagram sections)
- [x] `/api/health` returns `{ "ok": true }` (native connectivity checks)
- [x] Smoke test: sign in, create campaign, generate images, save to Photos (native)
- [ ] YouTube (optional): connect channel, publish 9:16 Short — see `docs/youtube-phase3-runbook.md`
- [ ] TikTok (optional): connect, publish 9:16 video — sandbox / private account until audit
- [ ] Instagram (optional): connect, post Reel + carousel — Meta app testers until App Review — see `docs/instagram-phase3-runbook.md`

---

## Platform posting (direct publish)

All four integrations shipped in code (June 2026). Public users blocked by platform audits only.

| Platform | Code | Blocker | Runbook |
|----------|------|---------|---------|
| YouTube Shorts | ✅ | Google OAuth verification submitted | `docs/youtube-phase3-runbook.md` |
| TikTok | ✅ | App audit (`SELF_ONLY` today) | `docs/platform-posting.md` |
| Instagram Reels | ✅ | Meta App Review in progress | `docs/instagram-phase3-runbook.md` |
| Instagram Carousel | ✅ | Same Meta review | `docs/instagram-phase3-runbook.md` |

**Epic:** [#27](https://github.com/reytek1201/SlidePress.co/issues/27)

---

## YouTube Shorts (direct publish)

Before marketing direct posting:

- [x] Apply `20260619000003_platform_posts_export_unique.sql` (dedupes + unique index)
- [x] Submit Google OAuth verification for `youtube.upload` — submitted June 2026; awaiting approval
- [ ] Request YouTube Data API quota increase if needed (~6 uploads/day on default quota)

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

**Plugins requiring native rebuild after `cap:sync`:** Haptics, Keyboard, Camera, Media, Push, Biometric Auth, and others listed in `ios/App/App/capacitor.config.json` → `packageClassList`.

---

## iOS — TestFlight

**Status (June 2026):** External TestFlight **Beta App Review passed** for build 2+. Continue incrementing build numbers for each upload.

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

### App Store review notes

Full copy-paste drafts (reviewer notes, listing description, Play Console, demo account template): **[`docs/app-store-review-notes.md`](app-store-review-notes.md)**

Quick reminders:

- Create a **demo account** before external TestFlight or App Store submit
- Explain: native shell loads `https://www.slidepress.co`; Sign in with Apple; optional Face ID in Settings → Security
- YouTube/TikTok posting is optional for review while platform audits are pending

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

## Marketing site — store download links

When TestFlight or store listings are ready, set these in **Vercel → Environment Variables** (and `.env.local` for local dev):

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_APP_STORE_URL` | `https://testflight.apple.com/join/XXXXXXXX` (beta) or `https://apps.apple.com/app/idXXXXXXXX` (public) |
| `NEXT_PUBLIC_PLAY_STORE_URL` | `https://play.google.com/store/apps/details?id=co.slidepress.app` |

The landing page (`/`) reads these via `utils/app-store-links.ts`. Store badges switch from “Coming soon” to live links automatically. Until set, users can still **Start free** on the web.

Hero marketing assets live in `public/marketing/` (video, poster, feature screenshots). Optional overrides: `NEXT_PUBLIC_MARKETING_HERO_VIDEO_URL`, `NEXT_PUBLIC_MARKETING_HERO_POSTER_URL`.

Compress the hero MP4 after re-exporting: `node scripts/compress-marketing-hero-video.mjs`

---

## Optional: push notifications in beta

Users opt in under **Settings → Notifications**. Configure **APNs** (iOS) and/or **FCM** (Android) on Vercel — see `docs/capacitor.md` → Push notifications. For TestFlight, set `APNS_USE_SANDBOX=false` and use production `aps-environment` in entitlements.

---

## Tester instructions (share with beta group)

1. Install from TestFlight / Play internal link
2. Sign in with Google, Apple, or email (Sign in / Create account tabs)
3. Optional: Settings → Security → enable Face ID unlock
4. Create a campaign, wait for images, try **Save all to Photos**
5. **Native feel:** swipe slides in the workspace; swipe down to close bottom sheets; pull down on Campaigns to refresh; feel haptics on tab changes (physical device — not simulator)
6. **Fix this slide:** edit headline if needed → open sheet → try **Fix headline text** or **Different layout** chips
7. Report bugs to hello@slidepress.co with app version from Settings → About

**Note:** Haptics require a **physical iPhone** with System Haptics enabled (Settings → Sounds & Haptics). The app loads UI from `www.slidepress.co` — force-quit and reopen after a new deploy if behavior looks stale.

---

## After beta feedback

- Fix critical bugs → increment build numbers → new upload
- When stable, promote to **public** App Store / Play release (separate review)

See `docs/client-features.md` for Phase 6 (billing, video export).
