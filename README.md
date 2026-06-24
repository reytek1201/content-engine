# SlidePress

**Turn a topic into post-ready carousel campaigns and AI-narrated video in minutes.**

Live at [slidepress.co](https://www.slidepress.co) · Native apps via Capacitor (iOS + Android).

## What it does

- **Create** — topic, website URL ingest, or brand kit → Gemini slide copy + voiceover scripts
- **Assets** — Fal AI slide images + platform captions (auto-chained)
- **Export** — zip, narration MP3s, Reel-ready MP4 (4:5 or 9:16)
- **Publish** — post to YouTube Shorts, TikTok, and Instagram (Reels + carousel)

## Docs

| Doc | Purpose |
|-----|---------|
| [`docs/client-features.md`](docs/client-features.md) | Product features, workflow, roadmap |
| [`docs/launch-status.md`](docs/launch-status.md) | Store launch, billing, migrations, QA checklist |
| [`docs/beta-release.md`](docs/beta-release.md) | TestFlight / Play testing checklist |
| [`docs/billing.md`](docs/billing.md) | Tiers, Stripe, RevenueCat |
| [`docs/platform-posting.md`](docs/platform-posting.md) | YouTube, TikTok, Instagram posting |
| [`docs/capacitor.md`](docs/capacitor.md) | Native app build, push, widgets |

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Requires Supabase, Gemini, Fal, and other env vars — see deployment config on Vercel.

```bash
npm run build   # production build
```

## Stack

Next.js 16 · React 19 · Tailwind · Supabase · Vercel · Capacitor · Gemini · Fal · ElevenLabs

## License

Proprietary — KeyMacro LLC
