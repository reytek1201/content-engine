# App Store & Play review notes (draft)

**Claude upload:** Skip this file if sharing the Project — contains reviewer demo credentials. For public AI context use [`claude-project.md`](claude-project.md) Tier 3 note.

Copy-paste sections into **App Store Connect** or **Google Play Console** when you submit TestFlight external beta or a public release.

**Bundle ID (iOS):** `co.slidepress.app`  
**Package (Android):** `co.slidepress.app`  
**Production URL:** `https://www.slidepress.co`  
**Privacy policy:** `https://www.slidepress.co/privacy`  
**Terms:** `https://www.slidepress.co/terms`  
**Support:** hello@slidepress.co

**Launch status:** [`docs/launch-status.md`](launch-status.md) — iOS **1.0** draft has build 4 + both subscriptions attached; **not yet submitted** for App Store review (manual release when ready).

---

## When to use what

| Milestone | Apple | Google Play |
|-----------|-------|-------------|
| **Now — closed beta** | Upload build → **TestFlight internal** (no review) | **Internal testing** track |
| **Wider beta** | TestFlight **external** group → Beta App Review | **Closed testing** → optional review |
| **Public launch** | App Store → **Submit for Review** | **Production** release |

You do **not** need App Store review to start **internal** TestFlight. Save full review notes for external TestFlight or public submission.

---

## Demo account (ready for submit)

Dedicated reviewer account with a stable campaign (images + captions complete). **Do not** use your personal account in App Store Connect.

| Field | Value |
|-------|--------|
| Email | `reviewer@slidepress.co` |
| Password | Team vault (paste into App Store Connect / Play Console only — do not commit) |

**Optional — platform posting (may fail for reviewers):**

- **YouTube:** Google OAuth is in verification. Reviewer Google accounts must be on your OAuth **test users** list until Google approves production access.
- **TikTok:** App audit pending. Sandbox may require a **private** TikTok account. Treat direct TikTok post as optional for review; core app works without it.

---

## App Store Connect — Notes for Reviewer

Paste into **App Review Information → Notes** (and TestFlight **Beta App Review Information** if using external testers).

```
SlidePress is a social content creation app. Users describe a topic; the app generates carousel slide copy, AI images, platform captions, AI narration, and Reel-ready MP4 video. Users can export assets or post to connected social accounts.

ARCHITECTURE
The iOS app is a native Capacitor shell that loads our production web app from https://www.slidepress.co in a WKWebView. Account logic, campaign workspace, and exports run on our servers (Vercel + Supabase). Native iOS is used for Sign in with Apple, optional Face ID app lock, Save to Photos, and share sheet.

SIGN IN
1. Launch the app → Login screen (marketing landing is skipped in the native app).
2. Sign in with the demo credentials below, OR use Sign in with Apple / Google.

Demo account:
Email: reviewer@slidepress.co
Password: [paste from team vault]

CORE FLOW (no social connection required)
1. After login, open an existing campaign OR tap Create to start a new one.
2. Slides tab: review generated slide copy and images.
3. Publish tab: generate captions if needed, export video or download zip.
4. Native: Publish tab → Downloads → Save all to Photos (requires Photos permission).

OPTIONAL — BIOMETRICS
Settings → Security → enable Face ID / Touch ID to lock the app. Not required for review.

OPTIONAL — CONNECTED ACCOUNTS
Settings → Connected accounts → Connect YouTube or TikTok.
YouTube upload may only work for Google accounts on our OAuth test user list until Google verification completes.
TikTok posting may be limited to sandbox/private accounts until TikTok app audit completes.
Review is not blocked if these flows fail; please verify core campaign creation and export.

AI / THIRD-PARTY SERVICES
Slide copy and captions: Google Gemini. Images: Fal.ai. Narration/video: ElevenLabs TTS + server-side video pipeline. Auth: Supabase. See privacy policy for full list.

CONTACT
hello@slidepress.co — we respond within 24 hours during review.
```

---

## TestFlight — What to test (external beta)

Short description for testers (TestFlight **What to Test**):

```
Thanks for testing SlidePress!

Please try:
1. Sign in (email, Apple, or Google) — use Sign in / Create account tabs
2. Create a campaign or open an existing one
3. Slides tab — swipe between slides; tap filmstrip thumbnails; open **Fix this slide** and swipe the sheet down to close
4. Pull down on **Campaigns** to refresh the list
5. Publish tab → generate captions → export a Quick Reel or save slides to Photos
6. Optional: Settings → Security → Face ID lock; Settings → delete account (danger card at bottom)

Native feel (physical device):
- Haptics on tab changes, sheet open/close, and slide selection (enable System Haptics in iOS Settings)
- Bottom sheets dismiss with a swipe down on the handle

Known limits:
- YouTube/TikTok direct posting may be restricted while platform audits are pending
- Haptics do not work in mobile Safari — only in the TestFlight app
- Report issues to hello@slidepress.co with version from Settings → About
```

---

## App Store listing copy (draft)

### Name
SlidePress

### Subtitle (30 chars max)
Carousel slides & AI video

### Promotional text (optional, 170 chars)
Turn one topic into carousel slides, captions, narration, and Reel-ready video — then export or post without a second production pass.

### Description

```
SlidePress turns a topic into a complete social campaign in minutes.

WHAT YOU GET
• Carousel slides with headlines and AI-generated visuals
• Editable voiceover scripts on every slide
• Platform captions for TikTok, Instagram, and YouTube Shorts
• AI narration and Reel-ready MP4 video export
• Optional dual format: 4:5 feed and 9:16 vertical from one campaign

WORKFLOW
1. Describe your offer or topic
2. Review and edit slide copy
3. Generate images and captions
4. Export zip, narration, or video — or post to connected platforms

NATIVE iOS FEATURES
• Sign in with Apple
• Save all slide images to Photos
• Optional Face ID / Touch ID app lock
• Share sheet for exports

SlidePress is built for creators and small businesses who want professional carousel and video content without design skills or a separate editing tool.

Privacy: https://www.slidepress.co/privacy
Support: hello@slidepress.co
```

### Keywords (100 chars, comma-separated, no spaces after commas)
```
carousel,reels,video,social,marketing,AI,TikTok,Instagram,YouTube,captions
```

### Category
**Primary:** Productivity  
**Secondary:** Photo & Video (optional)

### Age rating
Complete the questionnaire honestly. No unrestricted web browsing; user-generated content is private to the account. AI-generated images from user prompts.

### App Privacy (nutrition labels) — summary

Align answers with `https://www.slidepress.co/privacy`:

| Data type | Linked to user | Used for |
|-----------|--------------|----------|
| Email, user ID | Yes | Account, auth |
| Photos / user content | Yes | Campaigns, exports |
| Usage data | Yes | Plan limits |
| Purchase history | Yes | Subscriptions (if IAP enabled) |
| Diagnostics | If collected | Crash/performance (only if you enable analytics) |

**Connected accounts (YouTube/TikTok):** OAuth tokens stored server-side; used only when user taps Post.

---

## Google Play — Release notes & testing instructions

Paste into **Release notes** (internal/closed) or **App access** instructions.

### App access (if login required)

```
All features require sign-in.

Demo credentials:
Email: reviewer@slidepress.co
Password: [paste from team vault]

The app loads https://www.slidepress.co in a WebView. Core flow: login → campaign → generate images → Publish tab → export or Save to Photos.

YouTube/TikTok posting is optional and may be limited during platform API review. Core creation and export work without connecting social accounts.
```

### Short description (80 chars)
```
AI carousel slides, captions, narration & Reel video — export in minutes.
```

### Full description
Use the App Store description above (Play allows longer text; same content is fine).

---

## Reviewer checklist (you — before submit)

- [x] `reviewer@slidepress.co` account exists with at least one campaign (images + captions)
- [ ] Latest `main` deployed to Vercel
- [ ] `/api/health` returns `{ "ok": true }`
- [ ] Smoke test on physical device: login → campaign → Save to Photos
- [ ] `CURRENT_PROJECT_VERSION` / `versionCode` incremented
- [ ] Privacy policy URL live in store listing
- [ ] Sign in with Apple works on TestFlight build
- [ ] Screenshots uploaded (iPhone 6.7" required; use real app UI)
- [ ] If claiming YouTube/TikTok in description, note platform limits in review notes

---

## Screenshot shot list

Capture on iPhone (6.7" display) from TestFlight or simulator:

1. **Campaign list** — shows active campaigns
2. **Slides tab** — carousel with generated images
3. **Publish tab** — captions + video export
4. **Settings** — connected accounts or security (Face ID)
5. **Optional** — video export success or Photos save confirmation

---

## After approval

- Promote TestFlight external → public App Store when beta feedback is clean
- Add Google OAuth test reviewers only as needed; remove “test users only” messaging from listing after YouTube verification
- Update marketing once TikTok audit passes

See also: [`docs/beta-release.md`](beta-release.md) · [`docs/capacitor.md`](capacitor.md) · [`docs/youtube-phase3-runbook.md`](youtube-phase3-runbook.md)

*Last updated: June 25, 2026*
