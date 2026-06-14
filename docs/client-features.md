# SlidePress — Product Features

**Turn a topic into post-ready carousel campaigns in minutes.**

SlidePress is a marketing automation app for creators and small teams who need social carousel content fast — slide copy, AI-generated visuals, platform captions, and a one-click download. No design tool juggling. No blank-page syndrome.

**Live at:** [slidepress.co](https://www.slidepress.co)

---

## Who it's for

- Solo founders and marketers shipping organic social content
- Agencies and brands running TikTok, Instagram carousel, and YouTube Shorts from the same campaign
- Anyone who wants **topic → slides → images → captions → zip** in one workflow

---

## What you can do today

### Create a campaign

- Enter a **topic or pain point**
- Choose **aspect ratio**: 4:5 (feed/carousel) or 9:16 (Reels/Shorts/TikTok)
- Choose **slide count**: 3, 5, or 7 slides
- Optionally upload **product, style, and logo** reference images to steer copy and visuals
- **Brand library** — save product/style/logo once and reuse on every new campaign (auto-saves after create; toggle on/off per campaign; full management in **Settings**)
- **Instant redirect** to the campaign workspace — a waiting screen runs while Gemini writes slide scripts (usually 15–30 seconds)
- **Retry** if text generation fails, with a clear error message

**Desktop:** full create form at `/` (New campaign in nav) — redirects straight to workspace on submit.

**Mobile:** tap the **+** button to open a native-style **bottom sheet** — slide-up form with scroll, backdrop dismiss, and redirect to workspace on success.

### App navigation

- **Shared app shell** when signed in — one consistent way to move around
- **Desktop:** top bar with SlidePress logo, Campaigns, New campaign, **Settings**
- **Mobile:** top bar (logo) + **bottom tab bar** with Campaigns, center **+** FAB, and **Settings**
- **Settings** (`/settings`) — account, brand library, usage summary; sign out lives here
- **Campaigns list** is browse-only — tap a row to open; no delete/duplicate clutter on the list
- Logged-in mobile users land on **My campaigns**; create always via **+** or New campaign button (opens sheet)
- **Forgot password** on the sign-in screen sends a reset email

### Campaign workspace

- **Campaign progress strip** — Copy → Images → Captions → Export with checkmarks and live image count
- **Sticky Next step bar** — one primary action that adapts (generate images → captions → download zip + copy all)
- **Inline campaign rename** — edit title from the workspace header
- **Slides before Publish** — review copy and images first, then captions
- **Scroll-to-top** button when deep in the page (above mobile tab bar)
- **Mobile workspace** — compact progress strip, sticky next-step bar, tighter slide cards and publish section on small screens
- View all slides with **text overlay** and **voiceover script**
- **Edit headlines** inline (up to 12 words per slide)
- **Copy voiceover** per slide to clipboard
- **Download a single slide image** without exporting the full zip
- **Carousel preview** — full-screen swipe through ready slides (tap image or “Preview carousel”)
- **Generate images** when ready — one click for the whole campaign
- Live **image progress** — “2 of 5 images ready” with realtime updates
- Metadata at a glance: **target audience**, **aspect ratio**, **slide count**
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

### Publish copy

- **Platform captions** for TikTok, Instagram, and YouTube Shorts
- Publish section **after slides** in the workspace
- One scrollable page with hooks, captions, hashtags (# formatted), and YouTube title
- **Copy all** (via Next step bar) or **copy one platform** to clipboard
- **Regenerate captions only** — updates publish copy without touching slide images

### Export

- **Download zip** when all slide images are ready (via Next step bar)
- **Download individual slide images** from each slide card
- Includes in zip:
  - `slides/` — numbered slide images
  - `captions.txt` — all platform copy in one file (if captions were generated)

### Campaign management

- **My campaigns** list with preview thumbnails, format, and date
- **Duplicate campaign** — from the workspace (not the list)
- **Delete campaign** — hidden in workspace Danger zone only

### Account & security

- Email sign-in via Supabase Auth
- **Forgot password** on the sign-in screen
- **Settings** — email, password reset email, sign out
- Your campaigns are private to your account (row-level security)
- Production auth configured for SlidePress.co domain

### Settings

- **Account** — view email, send password reset link, sign out
- **Brand library** — upload, replace, or clear saved product/style/logo references (same assets used on create)
- **Usage** — campaigns and slide regenerations this month with beta limits (default 10 campaigns, 30 regenerations; resets monthly)

### Beta usage limits

- **10 campaigns per month** — enforced on create and duplicate
- **30 slide regenerations per month** — enforced when regenerating a slide image
- Limits shown in **Settings**; create form blocks when campaign cap is reached
- Server returns a clear error if a limit is hit mid-flow
- Tune limits with env vars `BETA_CAMPAIGNS_PER_MONTH` and `BETA_REGENERATIONS_PER_MONTH`

### Design & brand

- **SlidePress** dark UI — zinc background with orange primary actions
- Orange gradient CTAs for generate/create actions
- Semantic greens/ambers/reds for success, progress, and errors

---

## Typical workflow

```
1. Sign in → My campaigns (mobile) or New campaign (desktop)
2. Enter topic + pick format + slide count (+ optional references)
3. Land on workspace waiting screen → slide scripts appear
4. Review slide copy → Generate images
5. Preview carousel → fix any slide (edit headline → regenerate)
6. Generate captions
7. Copy all or download zip / individual slides
8. Post to TikTok, Instagram, YouTube
```

**Goal:** Fewest steps between idea and publish-ready assets.

---

## Near future (roadmap)

These are planned next — not live yet.

### Ship & scale

- **Marketing landing page** — dedicated `/` hero for SEO and sign-up (app stays behind nav)
- **Usage tiers & billing** — slide limits and regeneration caps by plan (hooks already in place for slide count)
- **Beta usage limits** — protect API spend before wider invites
  - **10 campaigns / month** (create + duplicate)
  - **30 slide regenerations / month**
  - Enforced server-side; shown in Settings
  - Configurable via `BETA_CAMPAIGNS_PER_MONTH` and `BETA_REGENERATIONS_PER_MONTH`
- **Usage tiers & billing** — paid plans with higher caps (after beta)

### Export & publish

- **Video export** — turn slides into a single MP4 for Reels/Shorts/TikTok (Remotion/FFmpeg)
- **Direct platform posting** — optional upload to TikTok / Instagram / YouTube (later; higher complexity)

### Workflow polish

- **Mobile workspace polish** — tighter slide cards, compact sticky next-step bar, and denser publish captions on small screens

### Not planned for v1

- Full design editor (Canva-style)
- Unlimited free regenerations without metering
- Programmatic pixel-perfect logo placement (logo is AI-guided today)
- Delete from the campaigns list (destructive actions stay in workspace only)

---

## Under the hood (for trust, not sales fluff)

| Layer | Technology |
|-------|------------|
| App | Next.js 16, React 19, Tailwind |
| Hosting | Vercel (SlidePress.co) |
| Database & auth | Supabase (PostgreSQL + RLS) |
| Slide copy | Google Gemini 2.5 Flash |
| Slide images | Fal.ai Nano Banana 2 |
| Realtime | Supabase Realtime on slides & campaigns |

Approximate **variable cost per 5-slide campaign** (images + AI text): **~$0.45–0.65** depending on regenerations. Pricing for end users will be set above this with tier limits.

---

## One-line pitch

**SlidePress:** Describe your offer once — get carousel slides, AI images with headlines, and platform captions ready to post.

---

*Last updated: June 2026*
