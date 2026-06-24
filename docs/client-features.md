# SlidePress — Product Features

**Turn a topic into post-ready carousel campaigns and AI-narrated video in minutes.**

SlidePress is a marketing automation app for creators and small teams who need social content fast: slide copy, AI-generated visuals, voiceover scripts, platform captions, and one-click export. No design tool juggling. No blank-page syndrome.

**Live at:** [slidepress.co](https://www.slidepress.co)

---

## Who it's for

- Solo founders and marketers shipping organic social content
- Agencies and brands running **TikTok, Instagram carousels, Reels, and YouTube Shorts** from the same campaign
- Teams managing **multiple brands or clients** with separate kits, products, and campaigns
- Anyone who wants **topic → slides → images → captions → publish** in one workflow — including **AI-narrated MP4 export** for Reels and Shorts

---

## What you can do today

### Create a campaign

- Enter a **topic or pain point** — or paste your **website URL** for AI topic suggestions (see below)
- Choose **aspect ratio**: 4:5 (feed/carousel) or 9:16 (Reels/Shorts/TikTok) — both support **video export**
- Choose **slide count**: 3, 5, or 7 slides
- Optionally upload **product, style, and logo** reference images to steer copy and visuals
- **Brand workspaces** — each brand has its own reference images, products, and campaigns; switch brands from the campaigns header when you manage more than one
- **Auto-generate images** — optional checkbox on create (remembered per device) starts image generation as soon as slide copy lands in the workspace
- **Instant redirect** to the campaign workspace — a waiting screen runs while Gemini writes slide scripts (usually 15–30 seconds)
- **Retry** if text generation fails, with a clear error message

### Website URL ingest (Phase A)

Paste a public business URL on the create form to skip the blank-page start:

- **Analyze site** — fetches homepage metadata and sends content to Gemini for structured suggestions
- **Rich topic cards** — 2–3 campaign ideas with angle labels (pain point, curiosity, contrarian), audience, and format hints
- **Use topic** — pre-fills topic and recommended aspect ratio on the create form
- **Use & generate** — creates the campaign and auto-starts images in one tap
- **Ingest cache** — revisiting the same hostname restores suggestions without re-fetching
- **Sparse-site fallback** — thin pages still get usable topics; amber error UI with **Try again** on AI/service failures
- **Optional brand kit** — save extracted hero/logo images to the active brand after ingest
- **No credits until Generate** — ingest is free; normal campaign limits apply when you run text/images

**API:** `POST /api/campaigns/ingest-url` · UI: `website-topic-suggester.tsx` on web `/new` and mobile create sheet

**Desktop:** full create form at **`/new`** (New campaign in nav) — redirects straight to workspace on submit.

**Mobile:** tap the **+** button to open a **bottom sheet** — swipe down on the handle to dismiss, backdrop tap, keyboard-aware layout, and redirect to workspace on success.

**Public site:** **`/`** is the marketing landing page (web only); **`/login`** for sign in and sign up (email, Google, or create account). The native app opens at **`/login`** — marketing is skipped. Login uses **Sign in** / **Create account** tabs with a single primary action per tab.

### Public site & SEO

- **Marketing landing** at **`/`** — hero, features, workflow; logged-in users redirect to campaigns
- **SEO** — sitemap, robots.txt, Open Graph / Twitter cards, JSON-LD, custom OG image
- App routes (`/login`, `/campaigns`, workspace, etc.) use **`noindex`** so search focuses on the landing page

### App navigation

- **Shared app shell** when signed in — one consistent way to move around
- **Desktop:** top bar with SlidePress **logo**, Campaigns, New campaign, **Settings**
- **Mobile (native app):** bottom tab bar with Campaigns, center **+** FAB, and **Settings**; **haptic feedback** on tab changes and key actions; **pull-to-refresh** on the campaigns list
- **Settings** (`/settings`) — account, brands, security, usage; sign out lives here
- **Campaigns list** is browse-only — tap a row to open; brand switcher on campaigns when you have multiple brands
- Logged-in mobile users land on **My campaigns**; create always via **+** or New campaign button (opens sheet)
- **Forgot password** on the sign-in screen sends a reset email

### Campaign workspace

- **Campaign journey strip** — guided flow: **Copy → Assets → Video → Publish**, with honest checkmarks, next-step CTA, and step navigation (hidden on Details tab). **Assets** covers slide images *and* platform captions. Publish turns green when posted to **YouTube, TikTok, or Instagram**
- **Auto-captions** — captions generate automatically when images finish (no modal); workspace switches to **Publish** when both images and captions are ready
- **First-time workspace tour** — three coach marks (journey strip, Publish tab, publish sections); dismiss once via localStorage
- **Inline campaign rename** — edit title from the workspace header
- **Tabbed workspace** — **Slides | Publish | Details** on web and mobile; auto-switch to Publish when **images and captions** are both ready
- **Scroll-to-top** button when deep in the page (above mobile tab bar)
- View all slides with **text overlay** and **voiceover script** (written for natural spoken delivery)
- **Edit headlines** inline (up to 12 words per slide)
- **Edit voiceover scripts** inline (up to 25 words per slide)
- **Rewrite voiceover with AI** — pick a tone (warmer, punchier, shorter, match headline, etc.) and choose from three options in a sheet
- **Copy voiceover** per slide to clipboard — ready for recording or AI narration
- **Download a single slide image** without exporting the full zip
- **Carousel preview** — swipe between ready slides; on mobile, **swipe down** to dismiss the viewer
- **Generate images** when ready — one click for the whole campaign
- Live **image progress** — “2 of 5 images ready” with realtime updates
- Metadata at a glance: **target audience**, **aspect ratio**, **slide count**, **brand**
- **Duplicate campaign** from the workspace header — reuse topic and references, fresh AI copy
- **Delete campaign** in a **Danger zone** at the bottom (confirm before permanent removal)

### Image generation

- Powered by **Fal Nano Banana 2** (Google Gemini Flash Image)
- Headline text is rendered **on the slide** as part of the creative
- Reference images (product/style/logo) are respected when uploaded
- **Production webhooks** on SlidePress.co — images queue and update live via Fal callbacks
- **Realtime + polling** — Supabase realtime on slides, slide images, campaigns, and platform captions; 5s polling fallback if realtime lags
- **Regenerate a single slide** without redoing the whole campaign
  - **Fix this slide** sheet — shared bottom sheet with swipe-to-dismiss; feedback chips, optional notes, optional snap-a-new product photo (native)
  - Quick feedback chips: **Fix headline text**, Brighter, Minimal, Bold colors, Product larger, Different layout, Try again
  - Edit the headline first when on-slide text should change; unsaved headline edits are saved when you regenerate
  - Optional free-text notes for what to change
  - Regeneration respects the **active format** when you have both 4:5 and 9:16
  - **Live regen UI** — spinner shows immediately; new image appears without refresh when Fal completes

### Dual format (4:5 + 9:16 from one campaign)

Create in one aspect ratio first. When primary images are ready, SlidePress offers to add the other format:

- **Confirm before generating** — upsell sheet explains what will happen; you opt in explicitly
- **Reuse copy** — headlines, voiceover scripts, and platform captions stay the same
- **Re-generate images only** — new aspect-sized visuals for the secondary format (no auto-crop)
- **Format toggle** — switch between 4:5 and 9:16 in the workspace to preview and fix slides per format
- **Zip export** — when both formats are complete, download includes `4x5/` and `9x16/` folders plus `captions.txt`
- **Video export** — export MP4 per format; **each video export counts as one video credit** (both formats = two exports)

Primary format is chosen at campaign creation; the secondary format is added later from the workspace.

### Voiceover scripts & AI narration

Every slide includes a **voiceover script** — a natural spoken line Gemini writes alongside the on-slide headline. You can:

- **Review** scripts in the workspace alongside each slide
- **Edit** scripts inline or **rewrite with AI** (tone chips → three options → save)
- **Copy** any script to clipboard for recording in CapCut, TikTok, or your DAW
- **Preview AI voice** per slide (warm, energetic, or professional personas)
- **Download narration** as a ZIP (per-slide MP3s + full read-through)
- **Export video** with AI narration stitched in (see Video export below)

Scripts are authored with **text-to-speech in mind** and synthesized via **ElevenLabs** when you preview or export.

### Video export

Available on **4:5 and 9:16** campaigns when all slide images and voiceover scripts are ready for the format you export.

- **Quick Reel** — AI narration, crossfade transitions between slides, merged into an MP4
- **Silent video** — no voiceover; slides timed to your scripts with crossfades (mute-friendly posts)
- **Standard or Studio** voice quality on Quick Reel (Studio uses a higher-quality ElevenLabs model)
- **Brand default voice** — preferred persona saved per brand
- **Dual-format campaigns** — when both 4:5 and 9:16 images exist, pick which format to render; each export uses one video credit
- **Web:** download MP4 directly
- **Native app:** share sheet saves a proper `.mp4` to Photos or Files

Processing runs on the server (TTS → slide compose → audio merge). Cached narration is reused when you re-export the same scripts — no second ElevenLabs charge for unchanged slides.

**Beta limit:** 3 video exports per month (configurable). Counts **one export per successful render request** — exporting both 4:5 and 9:16 from the same campaign uses two credits.

### Publish copy & direct posting

- **Platform captions** for TikTok, Instagram, and YouTube Shorts — **auto-generated** when slide images complete
- Publish section in the **Publish** tab — captions; **9:16 video export**; **Post to YouTube Shorts**, **TikTok**, and **Instagram** (Reels + carousel); file **downloads** (zip, narration) at the bottom
- **Writing post copy overlay** — appears while captions generate; amber error + **Try again** if generation fails; polling recovery if realtime misses the insert
- **Copy all** (via journey strip) or **copy per field** (title, caption, hashtags) to clipboard
- **Regenerate captions only** — updates publish copy without touching slide images

### Post to YouTube Shorts

- **Settings → Connected accounts** — connect your YouTube channel (OAuth)
- **Campaign → Publish** — **Post to YouTube Shorts** when you have YouTube captions and a completed **9:16** video export
- Upload uses your campaign title, description, and hashtags; videos publish as **unlisted** by default
- **Grant upload permission** on first publish (separate from connect)
- **View on YouTube** link after publish; same export cannot be posted twice (duplicate guard)
- Disconnect YouTube anytime in Settings; account deletion revokes tokens and removes publish history

*Google OAuth verification submitted (June 2026) — public users until approved must be added as OAuth **test users** in Google Cloud. See `docs/youtube-phase3-runbook.md`.*

### Post to TikTok

- **Settings → Connected accounts** — connect your TikTok account (Login Kit OAuth)
- **Campaign → Publish** — **Post to TikTok** when you have a TikTok caption and a completed **9:16** video export
- Upload uses your TikTok caption and hashtags from the campaign
- **Grant posting permission** on first publish (separate from connect)
- **View on TikTok** link after publish; same export cannot be posted twice (duplicate guard)
- Disconnect TikTok anytime in Settings; account deletion revokes tokens and removes publish history

*TikTok sandbox (June 2026) — app is unaudited; your TikTok account must be set to **Private** in the TikTok app before posting. Posts are `SELF_ONLY` until TikTok app review passes. See Epic [#27](https://github.com/reytek1201/SlidePress.co/issues/27).*

### Post to Instagram (Reels + Carousel)

- **Settings → Connected accounts** — connect Instagram Professional account via Facebook Login (linked Facebook Page required)
- **Campaign → Publish → Step 5** — **Post to Instagram Reels** when you have Instagram captions and a completed **9:16** video export
- **Campaign → Publish → Step 6** — **Post carousel to Instagram** when you have Instagram captions and **4:5** slide images
- **Grant publishing permission** on first publish (`instagram_content_publish` — separate from connect)
- Splash overlay during upload/processing; **View on Instagram** link after publish
- Reels: one publish per video export; Carousel: one publish per campaign
- Disconnect Instagram anytime in Settings; account deletion revokes tokens and removes publish history

*Meta App Review in progress (June 2026) — works for Meta app **testers/roles** until `instagram_content_publish` is approved. App owned by **KeyMacro LLC**. See [`docs/instagram-phase3-runbook.md`](instagram-phase3-runbook.md).*

### Export

- **Download zip** when all slide images are ready (via journey strip or Downloads section)
- **Dual-format zip** — `4x5/` and `9x16/` image folders when both formats are complete
- **Download individual slide images** from each slide card (web)
- **Download narration ZIP** from the Publish panel (per-slide MP3s + full narration)
- **Download video MP4** — Quick Reel or Silent video presets (4:5 or 9:16)
- **Native app:** **Save to Photos** and **Share** per slide; **Save all to Photos**; share narration zip or video via the system share sheet
- Campaign zip includes:
  - `slides/` — numbered slide images (single format), or `4x5/` + `9x16/` when both formats are ready
  - `captions.txt` — all platform copy in one file (if captions were generated)

### Brands & settings

- **Brands** — each workspace has a name, reference kit (product / style / logo), and optional **products** (name, photo, description) for campaign context
- **Settings → Brands** — manage all brands; edit kit and products per brand
- **Campaigns header** — switch active brand, edit kit, add a brand (returns to campaigns when done)
- **Usage** — campaigns, regenerations, voice previews, narration exports, and video exports this month with beta limits (resets monthly)
- **Connected accounts** — connect or disconnect **YouTube**, **TikTok**, and **Instagram** for direct posting
- **Security** (native) — optional Face ID / fingerprint app unlock
- **Account deletion** — danger card at the bottom of Settings (web and mobile); type `DELETE` to confirm; removes all campaigns, brands, usage data, platform connections, and auth access

### Campaign management

- **My campaigns** list with preview thumbnails, format, date, and **publish-status badges** (e.g. Needs captions, Ready to post, On YouTube, On TikTok, On Instagram, Published) — scoped to the active brand
- **Duplicate campaign** — from the workspace (not the list)
- **Delete campaign** — hidden in workspace Danger zone only

### Account & security

- Email sign-in via Supabase Auth
- **Sign in / Create account tabs** on `/login` — one primary CTA per tab; clear validation errors below the action button
- **Google sign-in** on **`/login`** — OAuth via Supabase; redirects through **`/auth/callback`**
- **Apple sign-in** (native iOS) — Sign in with Apple sheet
- **Native session** — email/password sign-in and sign-up persist the session in the Capacitor shell (Keychain) for reliable post-auth navigation
- **Strong passwords** on sign up — 8+ characters with uppercase, lowercase, and a number
- **Forgot password** on the sign-in screen (including deep links in the native app)
- Friendly error boundary on `/campaigns` if the server fails after signup
- Your campaigns are private to your account (row-level security)
- Production auth configured for SlidePress.co domain

### Native mobile feel (Capacitor)

Available in the **iOS and Android apps** (not mobile Safari):

| Feature | What it does |
|---------|----------------|
| **Haptics** | Light taps on sheets and tabs; selection feedback on slide/filmstrip changes; success/error on save and share |
| **Bottom sheets** | Swipe down on the handle to dismiss; backdrop fades with drag; velocity-based dismiss; keyboard lifts sheets with text fields |
| **Slide browsing** | Swipe the slide card horizontally to change slides; vertical scroll in editors won’t accidentally change slides |
| **Filmstrip** | Scroll-snap thumbnails; haptic when selecting a different slide |
| **Carousel preview** | Swipe between slides; swipe down to close on mobile |
| **Pull to refresh** | Campaigns list refreshes from the server on native |
| **Android back** | Hardware back closes the top sheet or modal before navigating away |

### Beta usage limits

| Limit | Default (beta) |
|-------|----------------|
| Campaigns per month | 10 |
| Slide regenerations per month | 30 |
| Voice previews per month | 30 |
| Narration ZIP exports per month | 5 |
| Video exports per month | 3 |

- Limits shown in **Settings → Usage**; create form blocks when campaign cap is reached
- Server returns a clear error if a limit is hit mid-flow
- Tune via env vars: `BETA_CAMPAIGNS_PER_MONTH`, `BETA_REGENERATIONS_PER_MONTH`, `BETA_TTS_PREVIEWS_PER_MONTH`, `BETA_AUDIO_EXPORTS_PER_MONTH`, `BETA_VIDEO_EXPORTS_PER_MONTH`

### Design & brand

- **SlidePress** dark UI — zinc background with orange primary actions
- **Brand logo** in nav, landing, login, and OG image (`public/brand/logo.png`); browser tab icon via `app/icon.png`
- Orange gradient CTAs for generate/create actions
- Semantic greens/ambers/reds for success, progress, and errors
- Unified **page layout** — shared shell widths for marketing and app pages

---

## Typical workflow

```
1. Visit slidepress.co → sign in → My campaigns
2. Pick a brand (or use your default) → New campaign
3. Enter topic OR paste website URL → pick a suggested idea (optional: Use & generate)
4. Choose format (4:5 or 9:16) + slide count (+ optional references) → Generate
5. Land on workspace → slide scripts + voiceover appear
6. Review copy → edit or rewrite voiceover → images auto-start (or tap Generate images)
7. Preview carousel → fix any slide (edit headline → **Fix this slide** regenerate)
8. Optional: add the other format (4:5 or 9:16) when primary images are ready
9. Captions generate automatically → workspace opens Publish when draft is ready
10. Export video, copy captions, download zip, or post to YouTube / TikTok / Instagram
```

**Goal:** Fewest steps between idea and publish-ready assets — carousel, narration, or video from one campaign.

---

## What's next

| Area | Status |
|------|--------|
| **Paid tiers & billing** | Stripe + RevenueCat shipped; launch QA in progress — [Epic #14](https://github.com/reytek1201/SlidePress.co/issues/14) · [#25](https://github.com/reytek1201/SlidePress.co/issues/25) |
| **Website URL ingest** | **Phase A shipped** — topic suggestions + pre-fill ([#45](https://github.com/reytek1201/SlidePress.co/issues/45)); Phase B one-click full draft planned |
| **On-screen video captions** | Deferred — export MP4 + platform captions; burned-in captions not in current build |
| **Direct platform posting** | **YouTube**, **TikTok**, **Instagram** (Reels + carousel) shipped in code; Google OAuth + TikTok audit + Meta App Review pending for public users — [Epic #27](https://github.com/reytek1201/SlidePress.co/issues/27) · runbooks in `docs/` |
| **Voice library browser** | Curated personas today (warm / energetic / professional) |

### Why video export matters (marketing angle)

- **Same campaign, more reach** — carousels for feed, video for algorithms that favor Reels and Shorts
- **Scripts already written** — voiceover is generated with your slides; video completes the loop
- **Sounds human** — ElevenLabs-class voices, not robotic platform TTS
- **9:16 by design** — campaigns created for vertical video export from day one
- **Agency-ready** — multiple brands, consistent voice and motion per client

### What we’re not promising until platform audits complete

- YouTube posting for users outside Google OAuth **test users** list until Google verification completes
- TikTok **public** posting until TikTok app audit passes (sandbox / private account today)
- Instagram posting for users outside Meta app **testers/roles** until Meta App Review approves `instagram_content_publish`

*Internal tracking: ElevenLabs narration & video export epic [#1](https://github.com/reytek1201/SlidePress.co/issues/1) ✅ closed.*

---

## Roadmap

Phased delivery for SlidePress. **Mobile today** = responsive web + **native iOS/Android** via Capacitor (same Next.js app on Vercel).

### Shipped ✅

| Phase | Focus |
|-------|--------|
| **1** | Workspace clarity — campaign journey strip, tabbed workspace, inline rename, async text generation, app nav |
| **2** | Publish handoff — carousel preview, copy voiceover, single-slide download |
| **3** | Brand library + **Settings** (account, brand assets, usage display) |
| **4** | Ship & protect — landing, SEO, usage limits, mobile polish, Google auth, account deletion, prod deploy |
| **5** | **Mobile app (Capacitor)** — native auth, share/save to Photos, push when images ready, biometric lock, settings hub |
| **5+** | **Brand workspaces** — multi-brand kits, products, campaigns switcher, unified settings UX |
| **6A** | **ElevenLabs narration & video** — voice preview, narration ZIP, MP4 export (4:5 + 9:16), presets, studio voice, narration cache |
| **6A+** | **Voiceover editing** — inline script edit, AI rewrite sheet, regenerate slide sheet |
| **6B** | **Dual format** — one campaign, optional second aspect (confirm upsell), per-format preview/export |
| **6C** | **YouTube Shorts posting** — connect, upload API, Publish UI ✅; Google OAuth verification 🚧 |
| **6D** | **TikTok posting** — connect, FILE_UPLOAD API, Publish UI ✅; app audit 🚧 |
| **6E** | **Instagram posting** — OAuth, Reels + carousel API, Publish UI ✅; Meta App Review 🚧 |
| **6F** | **Website URL ingest (Phase A)** — paste URL, topic cards, Use & generate, ingest cache ✅ |
| **6F+** | **Streamlined assets flow** — auto-captions, Assets journey step, draft-ready push, regen/polling hardening ✅ |

### Phase 5 — Mobile app (Capacitor) ✅ (largely complete)

| Step | Deliverable |
|------|-------------|
| **5.1 Scaffold** ✅ | Capacitor iOS + Android loading production — see `docs/capacitor.md` |
| **5.2 Auth** ✅ | Google + Apple OAuth (deep link), password reset deep links |
| **5.3 App shell** ✅ | Icons + splash, status bar (SlidePress dark + orange) |
| **5.4 Native affordances** ✅ | Share sheet + Save to Photos (per slide, carousel, save all) |
| **5.5 Beta distribution** 🚧 | TestFlight external beta approved (build 2+); Play internal testing — see `docs/beta-release.md` |
| **5.6 Push notifications** ✅ | Opt-in alerts when all campaign images finish |

**Mobile UX:**

| Deliverable | Status |
|-------------|--------|
| Tabbed campaign workspace (Slides / Publish / Details) | ✅ |
| Campaign journey strip (progress + next step unified) | ✅ |
| Campaign list publish-status badges | ✅ |
| First-time workspace tour | ✅ |
| Filmstrip + inline generation feedback | ✅ |
| Mobile settings hub + sub-pages | ✅ |
| Face ID / biometric app unlock + Keychain session | ✅ |
| Offline connectivity screen (native) | ✅ |
| Privacy + Terms + Settings → About | ✅ |
| Brand switcher + per-brand campaigns | ✅ |
| Haptics (`@capacitor/haptics`) | ✅ |
| Shared bottom sheets (swipe-to-dismiss, keyboard avoidance) | ✅ |
| Thumb-first slide swipe + filmstrip snap | ✅ |
| Carousel swipe-down dismiss (mobile) | ✅ |
| Pull-to-refresh on campaigns (native) | ✅ |
| Android back closes overlays | ✅ |

### Phase 5.7 — Notifications & widgets ✅ *shipped*

Mobile engagement: push alerts when async work finishes, and home-screen widgets for ambient campaign status. Full plan: [`docs/notifications-widgets-roadmap.md`](notifications-widgets-roadmap.md).

| Track | Epic | Status |
|-------|------|--------|
| **Push notifications** | [Epic #35](https://github.com/reytek1201/SlidePress.co/issues/35) | ✅ Phases 0–3 shipped |
| **Home screen widgets** | [Epic #36](https://github.com/reytek1201/SlidePress.co/issues/36) | ✅ Phases 0–3 shipped — [#39](https://github.com/reytek1201/SlidePress.co/issues/39) snapshot · [#40](https://github.com/reytek1201/SlidePress.co/issues/40) iOS · [#42](https://github.com/reytek1201/SlidePress.co/issues/42) Android · [#43](https://github.com/reytek1201/SlidePress.co/issues/43) Quick Create |

**Widgets:** Continue Campaign (small/medium) + New Campaign shortcut on **iOS and Android**. Settings → Widgets for setup instructions. Sync on campaign workspace, resume, pull-to-refresh, and push delivery.

### Phase 6 — Scale *(in progress)*

**6A — ElevenLabs narration & video** ✅ *shipped*

1. Foundation — server-side TTS, voice catalog, usage metering  
2. Voice preview in workspace  
3. Audio export (narration ZIP)  
4. Video export — slides → MP4 (4:5 + 9:16, AI voice, crossfades)  
5. Polish — Quick Reel / Silent video presets, brand voice, studio quality  

**6A+ — Voiceover editing & slide fixes** ✅ *shipped*

- Inline voiceover script edit (PATCH per slide)
- AI rewrite sheet with tone chips and three options
- Regenerate slide via **Fix this slide** sheet — includes **Fix headline text** chip, scene-reset prompts for layout changes, auto-save headline before regen

**6B — Dual format (4:5 + 9:16)** ✅ *shipped*

- Confirm upsell after primary images complete
- Per-aspect image storage and workspace format toggle
- Zip folders per format; video export per format (one credit each)

**6C — Business scale** *(in progress)*

- **Usage tiers & billing** — paid plans with higher caps (Stripe) — [Epic #14](https://github.com/reytek1201/SlidePress.co/issues/14)
- **Direct platform posting** — **YouTube Shorts** ✅ Phases 0–2 shipped; Phase 3 🚧 OAuth under review · **TikTok** ✅ shipped; app audit 🚧 · **Instagram** Reels + Carousel ✅ shipped; Meta app review 🚧 — [Epic #27](https://github.com/reytek1201/SlidePress.co/issues/27) · [`docs/platform-posting.md`](platform-posting.md) · [`docs/youtube-phase3-runbook.md`](youtube-phase3-runbook.md) · [`docs/instagram-phase3-runbook.md`](instagram-phase3-runbook.md)
- **On-screen video captions** — burned-in captions (deferred from beta)

### Not planned for v1

- Full design editor (Canva-style)
- Unlimited free regenerations without metering
- Programmatic pixel-perfect logo placement (logo is AI-guided today)
- Delete from the campaigns list (destructive actions stay in workspace only)
- Separate React Native / Expo app (Capacitor is the mobile app strategy)

---

## Under the hood (for trust, not sales fluff)

| Layer | Technology |
|-------|------------|
| App | Next.js 16, React 19, Tailwind |
| Mobile | Capacitor — iOS + Android WebView shell; Haptics + Keyboard plugins |
| Hosting | Vercel (SlidePress.co) |
| Database & auth | Supabase (PostgreSQL + RLS) |
| Slide copy & voiceover | Google Gemini 2.5 Flash |
| Slide images | Fal.ai Nano Banana 2 |
| Platform captions | Google Gemini |
| Narration & video | ElevenLabs TTS + FFmpeg compose + Fal merge pipeline |
| YouTube posting | YouTube Data API v3 (OAuth + resumable upload) |
| TikTok posting | TikTok Content Posting API (Login Kit OAuth + FILE_UPLOAD) |
| Instagram posting | Meta Graph API (Facebook Login + Reels + Carousel containers) |
| Realtime | Supabase Realtime on slides, slide images, campaigns & platform captions |

Approximate **variable cost per 5-slide campaign** today (images + AI text): **~$0.45–0.65** depending on regenerations. **Video export** adds roughly **~$0.10–0.30** per Reel (TTS + render) at beta scale. End-user pricing will include tier limits above these costs.

---

## One-line pitch

**Today:** Describe your offer once — get carousel slides, AI images with headlines, editable voiceover scripts, platform captions, AI narration, and Reel-ready MP4 export — optionally in both 4:5 and 9:16 from one campaign. Post directly to **YouTube Shorts**, **TikTok**, and **Instagram** (Reels + carousel) from the same workspace.

**Same workflow:** One campaign → carousel zip, narration ZIP, or video — no second production pass.

---

## Elevator pitch (for sales / landing copy)

SlidePress turns a topic into a full social campaign: headlines on every slide, AI-generated visuals, spoken scripts you can edit or rewrite with AI, and captions for TikTok, Instagram, and YouTube. Export **carousel zips** (one or both formats), **AI narration**, or **Reel-ready MP4** per format — then **post to YouTube Shorts, TikTok, and Instagram** without leaving the app.

---

*Last updated: June 24, 2026*
