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

- Enter a **topic or pain point**
- Choose **aspect ratio**: 4:5 (feed/carousel) or 9:16 (Reels/Shorts/TikTok) — both support **video export**
- Choose **slide count**: 3, 5, or 7 slides
- Optionally upload **product, style, and logo** reference images to steer copy and visuals
- **Brand workspaces** — each brand has its own reference images, products, and campaigns; switch brands from the campaigns header when you manage more than one
- **Instant redirect** to the campaign workspace — a waiting screen runs while Gemini writes slide scripts (usually 15–30 seconds)
- **Retry** if text generation fails, with a clear error message

**Desktop:** full create form at **`/new`** (New campaign in nav) — redirects straight to workspace on submit.

**Mobile:** tap the **+** button to open a native-style **bottom sheet** — slide-up form with scroll, backdrop dismiss, and redirect to workspace on success.

**Public site:** **`/`** is the marketing landing page (web only); **`/login`** for sign in and sign up (email, Google, or create account). The native app opens at **`/login`** — marketing is skipped.

### Public site & SEO

- **Marketing landing** at **`/`** — hero, features, workflow; logged-in users redirect to campaigns
- **SEO** — sitemap, robots.txt, Open Graph / Twitter cards, JSON-LD, custom OG image
- App routes (`/login`, `/campaigns`, workspace, etc.) use **`noindex`** so search focuses on the landing page

### App navigation

- **Shared app shell** when signed in — one consistent way to move around
- **Desktop:** top bar with SlidePress **logo**, Campaigns, New campaign, **Settings**
- **Mobile:** top bar (logo) + **bottom tab bar** with Campaigns, center **+** FAB, and **Settings**
- **Settings** (`/settings`) — account, brands, security, usage; sign out lives here
- **Campaigns list** is browse-only — tap a row to open; brand switcher on campaigns when you have multiple brands
- Logged-in mobile users land on **My campaigns**; create always via **+** or New campaign button (opens sheet)
- **Forgot password** on the sign-in screen sends a reset email

### Campaign workspace

- **Campaign progress strip** — Copy → Images → Captions → Export with checkmarks and live image count
- **Sticky Next step bar** — one primary action that adapts (generate images → captions → download zip + copy all)
- **Inline campaign rename** — edit title from the workspace header
- **Slides before Publish** — review copy and images first, then captions
- **Mobile workspace** — tabbed layout (Slides / Publish / Details), filmstrip, compact progress strip
- **Scroll-to-top** button when deep in the page (above mobile tab bar)
- View all slides with **text overlay** and **voiceover script** (written for natural spoken delivery)
- **Edit headlines** inline (up to 12 words per slide)
- **Copy voiceover** per slide to clipboard — ready for recording or future AI narration
- **Download a single slide image** without exporting the full zip
- **Carousel preview** — full-screen swipe through ready slides (tap image or “Preview carousel”)
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
- **Regenerate a single slide** without redoing the whole campaign
  - Quick feedback chips: Brighter, Minimal, Bold colors, Product larger, Different layout, Try again
  - Optional free-text notes for what to change
  - Updated headlines apply on the next regeneration

### Voiceover scripts & AI narration

Every slide includes a **voiceover script** — a natural spoken line Gemini writes alongside the on-slide headline. You can:

- **Review** scripts in the workspace alongside each slide
- **Copy** any script to clipboard for recording in CapCut, TikTok, or your DAW
- **Preview AI voice** per slide (warm, energetic, or professional personas)
- **Download narration** as a ZIP (per-slide MP3s + full read-through)
- **Export video** with AI narration stitched in (see Video export below)

Scripts are authored with **text-to-speech in mind** and synthesized via **ElevenLabs** when you preview or export.

### Video export

Available on **4:5 and 9:16** campaigns when all slide images and voiceover scripts are ready.

- **Quick Reel** — AI narration, crossfade transitions between slides, merged into an MP4
- **Silent video** — no voiceover; slides timed to your scripts with crossfades (mute-friendly posts)
- **Standard or Studio** voice quality on Quick Reel (Studio uses a higher-quality ElevenLabs model)
- **Brand default voice** — preferred persona saved per brand
- **Web:** download MP4 directly
- **Native app:** share sheet saves a proper `.mp4` to Photos or Files

Processing runs on the server (TTS → slide compose → audio merge). Cached narration is reused when you re-export the same scripts — no second ElevenLabs charge for unchanged slides.

**Beta limit:** 3 video exports per month (configurable). Counts one export per successful render request.

### Publish copy

- **Platform captions** for TikTok, Instagram, and YouTube Shorts
- Publish section **after slides** in the workspace
- One scrollable page with hooks, captions, hashtags (# formatted), and YouTube title
- **Copy all** (via Next step bar) or **copy one platform** to clipboard
- **Regenerate captions only** — updates publish copy without touching slide images

### Export

- **Download zip** when all slide images are ready (via Next step bar)
- **Download individual slide images** from each slide card (web)
- **Download narration ZIP** from the Publish panel (per-slide MP3s + full narration)
- **Download video MP4** — Quick Reel or Silent video presets (4:5 or 9:16)
- **Native app:** **Save to Photos** and **Share** per slide; **Save all to Photos**; share narration zip or video via the system share sheet
- Campaign zip includes:
  - `slides/` — numbered slide images
  - `captions.txt` — all platform copy in one file (if captions were generated)

### Brands & settings

- **Brands** — each workspace has a name, reference kit (product / style / logo), and optional **products** (name, photo, description) for campaign context
- **Settings → Brands** — manage all brands; edit kit and products per brand
- **Campaigns header** — switch active brand, edit kit, add a brand (returns to campaigns when done)
- **Usage** — campaigns, regenerations, voice previews, narration exports, and video exports this month with beta limits (resets monthly)
- **Security** (native) — optional Face ID / fingerprint app unlock
- **Account deletion** — type `DELETE` to confirm; removes all campaigns, brands, usage data, and auth access

### Campaign management

- **My campaigns** list with preview thumbnails, format, and date — scoped to the active brand
- **Duplicate campaign** — from the workspace (not the list)
- **Delete campaign** — hidden in workspace Danger zone only

### Account & security

- Email sign-in via Supabase Auth
- **Google sign-in** on **`/login`** — OAuth via Supabase; redirects through **`/auth/callback`**
- **Apple sign-in** (native iOS) — Sign in with Apple sheet
- **Strong passwords** on sign up — 8+ characters with uppercase, lowercase, and a number
- **Forgot password** on the sign-in screen (including deep links in the native app)
- Your campaigns are private to your account (row-level security)
- Production auth configured for SlidePress.co domain

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
- **Brand logo** in nav, landing, login, favicon, and OG image (`public/brand/logo.png`)
- Orange gradient CTAs for generate/create actions
- Semantic greens/ambers/reds for success, progress, and errors
- Unified **page layout** — shared shell widths for marketing and app pages

---

## Typical workflow

```
1. Visit slidepress.co → sign in → My campaigns
2. Pick a brand (or use your default) → New campaign
3. Enter topic + pick format (4:5 or 9:16) + slide count (+ optional references)
4. Land on workspace → slide scripts + voiceover appear
5. Review copy → Generate images
6. Preview carousel → fix any slide (edit headline → regenerate)
7. Generate captions
8. Publish: copy captions, download zip, export narration ZIP, or export video MP4
9. Post to TikTok, Instagram, YouTube
```

**Goal:** Fewest steps between idea and publish-ready assets — carousel, narration, or video from one campaign.

---

## What's next

| Area | Status |
|------|--------|
| **Paid tiers & billing** | Stripe subscriptions, higher video/narration limits — [Epic #14](https://github.com/reytek1201/SlidePress.co/issues/14) |
| **On-screen video captions** | Deferred — export MP4 + platform captions; burned-in captions not in current build |
| **Direct platform posting** | Export MP4 + copy caption; you post manually |
| **Voice library browser** | Curated personas today (warm / energetic / professional) |

### Why video export matters (marketing angle)

- **Same campaign, more reach** — carousels for feed, video for algorithms that favor Reels and Shorts
- **Scripts already written** — voiceover is generated with your slides; video completes the loop
- **Sounds human** — ElevenLabs-class voices, not robotic platform TTS
- **9:16 by design** — campaigns created for vertical video export from day one
- **Agency-ready** — multiple brands, consistent voice and motion per client

### What we’re not promising in v1 of video

- Full voice library browser (we’ll curate a small set of great voices)
- Direct upload to TikTok / Instagram / YouTube (export MP4 + captions; you post)
- 4:5 video before 9:16 Reels quality is solid

*Internal tracking: GitHub epic [#1](https://github.com/reytek1201/SlidePress.co/issues/1) (ElevenLabs: Narration & Video Export).*

---

## Roadmap

Phased delivery for SlidePress. **Mobile today** = responsive web + **native iOS/Android** via Capacitor (same Next.js app on Vercel).

### Shipped ✅

| Phase | Focus |
|-------|--------|
| **1** | Workspace clarity — progress strip, next-step bar, inline rename, async text generation, app nav |
| **2** | Publish handoff — carousel preview, copy voiceover, single-slide download |
| **3** | Brand library + **Settings** (account, brand assets, usage display) |
| **4** | Ship & protect — landing, SEO, usage limits, mobile polish, Google auth, account deletion, prod deploy |
| **5** | **Mobile app (Capacitor)** — native auth, share/save to Photos, push when images ready, biometric lock, settings hub |
| **5+** | **Brand workspaces** — multi-brand kits, products, campaigns switcher, unified settings UX |
| **6A** | **ElevenLabs narration & video** — voice preview, narration ZIP, MP4 export (4:5 + 9:16), presets, studio voice, narration cache |

### Phase 5 — Mobile app (Capacitor) ✅ (largely complete)

| Step | Deliverable |
|------|-------------|
| **5.1 Scaffold** ✅ | Capacitor iOS + Android loading production — see `docs/capacitor.md` |
| **5.2 Auth** ✅ | Google + Apple OAuth (deep link), password reset deep links |
| **5.3 App shell** ✅ | Icons + splash, status bar (SlidePress dark + orange) |
| **5.4 Native affordances** ✅ | Share sheet + Save to Photos (per slide, carousel, save all) |
| **5.5 Beta distribution** 🚧 | TestFlight + Play internal testing — see `docs/beta-release.md` |
| **5.6 Push notifications** ✅ | Opt-in alerts when all campaign images finish |

**Mobile UX:**

| Deliverable | Status |
|-------------|--------|
| Tabbed campaign workspace (Slides / Publish / Details) | ✅ |
| Filmstrip + inline generation feedback | ✅ |
| Mobile settings hub + sub-pages | ✅ |
| Face ID / biometric app unlock + Keychain session | ✅ |
| Offline connectivity screen (native) | ✅ |
| Privacy + Terms + Settings → About | ✅ |
| Brand switcher + per-brand campaigns | ✅ |

### Phase 6 — Scale *(in progress)*

**6A — ElevenLabs narration & video** ✅ *shipped*

1. Foundation — server-side TTS, voice catalog, usage metering  
2. Voice preview in workspace  
3. Audio export (narration ZIP)  
4. Video export — slides → MP4 (4:5 + 9:16, AI voice, crossfades)  
5. Polish — Quick Reel / Silent video presets, brand voice, studio quality  

**6B — Business scale** *(next)*

- **Usage tiers & billing** — paid plans with higher caps (Stripe) — [Epic #14](https://github.com/reytek1201/SlidePress.co/issues/14)
- **Direct platform posting** — optional upload to TikTok / Instagram / YouTube (later)
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
| Mobile | Capacitor — iOS + Android WebView shell |
| Hosting | Vercel (SlidePress.co) |
| Database & auth | Supabase (PostgreSQL + RLS) |
| Slide copy & voiceover | Google Gemini 2.5 Flash |
| Slide images | Fal.ai Nano Banana 2 |
| Platform captions | Google Gemini |
| Narration & video | ElevenLabs TTS + FFmpeg compose + Fal merge pipeline |
| Realtime | Supabase Realtime on slides & campaigns |

Approximate **variable cost per 5-slide campaign** today (images + AI text): **~$0.45–0.65** depending on regenerations. **Video export** adds roughly **~$0.10–0.30** per Reel (TTS + render) at beta scale. End-user pricing will include tier limits above these costs.

---

## One-line pitch

**Today:** Describe your offer once — get carousel slides, AI images with headlines, voiceover scripts, platform captions, AI narration, and Reel-ready MP4 export.

**Same workflow:** One campaign → carousel zip, narration ZIP, or video — no second production pass.

---

## Elevator pitch (for sales / landing copy)

SlidePress turns a topic into a full social campaign: headlines on every slide, AI-generated visuals, spoken scripts, and captions for TikTok, Instagram, and YouTube. Export **carousel zips**, **AI narration**, or **Reel-ready MP4** from the same workspace — built on the voiceover you already get with every slide.

---

*Last updated: June 2026*
