# SlidePress — Repository architecture

Technical map for AI assistants and contributors. **Product behavior** is in [`client-features.md`](client-features.md).

**Claude upload:** See [`claude-project.md`](claude-project.md) for Project instructions and file checklist.

*Last updated: June 25, 2026*

---

## High-level flow

```
User → Next.js (Vercel) → Supabase (auth, Postgres, Realtime, Storage)
                        → Gemini (slide copy, voiceover, captions, URL ingest)
                        → Fal.ai (slide images, video compose webhooks)
                        → ElevenLabs (TTS preview, narration, video audio)
                        → Platform APIs (YouTube, TikTok, Instagram OAuth + publish)
                        → Stripe / RevenueCat (billing webhooks → usage_balances)
```

Native apps (Capacitor) load the same Vercel deployment in a WebView — no separate API.

---

## Directory layout

| Path | Purpose |
|------|---------|
| `app/` | Next.js App Router — pages, layouts, API routes |
| `app/api/` | Serverless route handlers (`route.ts` per endpoint) |
| `app/components/` | Shared React components |
| `app/campaign/[id]/` | Campaign workspace (slides, publish, details) |
| `utils/` | Business logic, API clients, helpers (no `lib/` alias) |
| `utils/supabase/` | `server.ts`, `client.ts`, admin client |
| `utils/tts/` | ElevenLabs synthesis, voice catalog, narration cache |
| `utils/campaign-generation.ts` | Gemini campaign text + Zod schemas |
| `utils/plan-limits.ts` | Tier caps (free / creator / agency) |
| `utils/usage-limits.ts` | Credit read, assert, consume |
| `types/` | Shared TypeScript types |
| `supabase/migrations/` | SQL migrations (apply before deploy) |
| `ios/`, `android/` | Capacitor native projects |
| `docs/` | Internal runbooks and product docs |
| `.cursor/rules/` | Cursor AI project rules (`.mdc`) |

---

## Key API routes

| Route | Purpose |
|-------|---------|
| `POST /api/generate-text` | Create campaign + Gemini slide/voiceover copy |
| `POST /api/campaigns/ingest-url` | Website URL → topic suggestions |
| `POST /api/regenerate-slide` | Single slide image regen (Fal queue) |
| `POST /api/generate-captions` | Platform captions (Gemini) |
| `POST /api/tts/preview` | Per-slide voice preview (ElevenLabs) |
| `POST /api/export-audio` | Narration ZIP |
| `POST /api/export-video` | MP4 export (TTS + Fal FFmpeg) |
| `GET /api/exports/:id` | Poll export status |
| `POST /api/webhooks/fal` | Fal image + video completion |
| `POST /api/webhooks/stripe` | Stripe subscription fulfillment |
| `POST /api/webhooks/revenuecat` | Mobile IAP fulfillment |
| `GET /api/cron/refill-free-credits` | Free-tier calendar-month credit refill |
| `/api/platforms/*` | OAuth connect, publish, status |

---

## Campaign lifecycle

1. **Create** — `generate-text` inserts `campaigns` + `slides` (bulk)
2. **Images** — Fal queue; webhook updates `slide_images`; Realtime pushes to UI
3. **Captions** — auto-trigger when images complete → `platform_captions`
4. **TTS / video** — optional; cached in `tts-cache` storage bucket
5. **Publish** — uses `exports` (video) + `platform_captions` + `platform_connections`

Journey strip states: Copy → Assets (images + captions) → Video → Publish.

---

## Voice personas (TTS)

Four launch personas in `utils/tts/voice-catalog.ts`:

| Persona | Use case |
|---------|----------|
| `warm` | Friendly, conversational |
| `confident` | Polished promos, creator Reels |
| `energetic` | Hooks, high-energy |
| `professional` | B2B, education |

Brand default: `brands.preferred_voice_persona`. Prod voice IDs via `ELEVENLABS_VOICE_IDS` env JSON.

---

## Billing model (v2)

Source of truth: `usage_balances` (per user). Webhooks and cron call `apply_tier_entitlement()`.

| Tier | Web | IAP | Campaigns | Videos/mo |
|------|-----|-----|-----------|-----------|
| Free | $0 | $0 | 2 / month | 0 |
| Creator | $24 | $29.99 | 10 | 10 |
| Agency | $79 | $99.99 | 30 | 20 |

Details: [`billing.md`](billing.md).

---

## Environment variables (summary)

| Area | Key vars |
|------|----------|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, service role (server) |
| Gemini | `GEMINI_API_KEY`, optional `GEMINI_MODEL` |
| Fal | `FAL_KEY`, `FAL_WEBHOOK_SECRET` |
| ElevenLabs | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_IDS` |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_PRICE_*`, `STRIPE_WEBHOOK_SECRET` |
| RevenueCat | `REVENUECAT_WEBHOOK_SECRET`, `NEXT_PUBLIC_REVENUECAT_*` |
| Cron | `CRON_SECRET` (Vercel Cron → free-tier refill) |
| App URL | `NEXT_PUBLIC_APP_URL` (webhooks, OAuth redirects) |

Never commit secrets. Server-only keys must not appear in client bundles.

---

## Cursor rules

Project AI rules live in `.cursor/rules/`:

| File | Scope |
|------|-------|
| `slidepress-core.mdc` | Always apply — stack + philosophy |
| `nextjs-api.mdc` | `app/api/**/*.ts` |
| `react-ui.mdc` | `app/**/*.tsx` |
| `supabase-data.mdc` | Supabase + usage limits |

Legacy `cursorrules` at repo root is deprecated — content migrated to `.cursor/rules/`.

---

## Related docs

| Doc | When to read |
|-----|--------------|
| [`client-features.md`](client-features.md) | Product capabilities, user flows |
| [`launch-status.md`](launch-status.md) | Store, billing, audit status |
| [`billing.md`](billing.md) | Tiers, Stripe, RevenueCat |
| [`tts-runbook.md`](tts-runbook.md) | ElevenLabs setup, smoke tests |
| [`capacitor.md`](capacitor.md) | Native build, auth, push |
| [`platform-posting.md`](platform-posting.md) | YouTube / TikTok / Instagram |
