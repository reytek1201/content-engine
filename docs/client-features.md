# Content Engine — Product Features

**Turn a topic into post-ready carousel campaigns in minutes.**

Content Engine is a marketing automation app for creators and small teams who need social carousel content fast — slide copy, AI-generated visuals, platform captions, and a one-click download. No design tool juggling. No blank-page syndrome.

---

## Who it's for

- Solo founders and marketers shipping organic social content
- Brands running TikTok, Instagram carousel, and YouTube Shorts from the same campaign
- Anyone who wants **topic → slides → images → captions → zip** in one workflow

---

## What you can do today

### Create a campaign

- Enter a **topic or pain point**
- Choose **aspect ratio**: 4:5 (feed/carousel) or 9:16 (Reels/Shorts/TikTok)
- Choose **slide count**: 3, 5, or 7 slides
- Optionally upload **product, style, and logo** reference images to steer copy and visuals

Gemini generates a full campaign: title, target audience, and per-slide headline, voiceover script, and image direction.

### Campaign workspace

- View all slides with **text overlay** and **voiceover script**
- **Edit headlines** inline (up to 12 words per slide)
- **Generate images** when ready — one click for the whole campaign
- Live **status updates** as images finish (no manual refresh)
- Compact layout: image previews appear only after generation (less scrolling)

### Image generation

- Powered by **Fal Nano Banana 2** (Google Gemini Flash Image)
- Headline text is rendered **on the slide** as part of the creative
- Reference images (product/style/logo) are respected when uploaded
- **Regenerate a single slide** without redoing the whole campaign
  - Quick feedback chips: Brighter, Minimal, Bold colors, Product larger, Different layout, Try again
  - Optional free-text notes for what to change
  - Updated headlines apply on the next regeneration

### Publish copy

- **Platform captions** for TikTok, Instagram, and YouTube Shorts
- One scrollable page with hooks, captions, hashtags (# formatted), and YouTube title
- **Copy all** or **copy one platform** to clipboard
- **Regenerate captions only** — updates publish copy without touching slide images

### Export

- **Download zip** when all slide images are ready
- Includes:
  - `slides/` — numbered slide images
  - `captions.txt` — all platform copy in one file (if captions were generated)

### Campaign management

- **My campaigns** list with previews and status
- **Duplicate campaign** — reuse topic and references, fresh AI copy and slides
- **Delete campaign** — remove clutter from your workspace

### Account & security

- Email sign-in via Supabase Auth
- Your campaigns are private to your account (row-level security)

---

## Typical workflow

```
1. Enter topic + pick format + slide count
2. Review generated slide copy
3. Generate images
4. Fix any slide (edit headline → regenerate with chips/notes)
5. Generate captions
6. Copy all or download zip
7. Post to TikTok, Instagram, YouTube
```

**Goal:** Fewest steps between idea and publish-ready assets.

---

## Near future (roadmap)

These are planned next — not live yet.

### Ship & scale

- **Production deployment** — public URL, reliable Fal webhooks, production Supabase
- **Usage tiers & billing** — slide limits and regeneration caps by plan (hooks already in place for slide count)

### Export & publish

- **Video export** — turn slides into a single MP4 for Reels/Shorts/TikTok (Remotion/FFmpeg)
- **Direct platform posting** — optional upload to TikTok / Instagram / YouTube (later; higher complexity)

### Workflow polish

- **Brand library** — save and reuse product/style/logo references across campaigns
- **Mobile-friendly workspace** — better experience on phone and tablet

### Not planned for v1

- Full design editor (Canva-style)
- Unlimited free regenerations without metering
- Programmatic pixel-perfect logo placement (logo is AI-guided today)

---

## Under the hood (for trust, not sales fluff)

| Layer | Technology |
|-------|------------|
| App | Next.js 16, React 19, Tailwind |
| Database & auth | Supabase (PostgreSQL + RLS) |
| Slide copy | Google Gemini 2.5 Flash |
| Slide images | Fal.ai Nano Banana 2 |
| Realtime | Supabase Realtime on slides & campaigns |

Approximate **variable cost per 5-slide campaign** (images + AI text): **~$0.45–0.65** depending on regenerations. Pricing for end users will be set above this with tier limits.

---

## One-line pitch

**Content Engine:** Describe your offer once — get carousel slides, AI images with headlines, and platform captions ready to post.

---

*Last updated: June 2026*
