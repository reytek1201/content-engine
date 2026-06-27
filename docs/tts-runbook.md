# TTS & narration — internal runbook

Internal setup for ElevenLabs text-to-speech (Phase 0). Not user-facing documentation.

**Claude / AI context:** [`claude-project.md`](claude-project.md) · [`architecture.md`](architecture.md)

**GitHub:** Epic [#1](https://github.com/reytek1201/SlidePress.co/issues/1) · Phase 0 issues [#2](https://github.com/reytek1201/SlidePress.co/issues/2)–[#5](https://github.com/reytek1201/SlidePress.co/issues/5)

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ELEVENLABS_API_KEY` | Yes (for live synthesis) | Server-only API key. Set in Vercel prod + preview. Never in client bundle. |
| `ELEVENLABS_VOICE_IDS` | Yes (prod) | JSON map of launch personas → ElevenLabs voice IDs (see below). |
| `ELEVENLABS_USD_PER_1K_CHARS` | No | Internal COGS rate override (default `0.10` for Flash). |
| `ENABLE_TTS_AUDIT` | No | Set `true` on preview/prod to enable `POST /api/dev/audit-campaign-audio` (disabled in prod by default). |
| `BETA_TTS_PREVIEWS_PER_MONTH` | No | Monthly voice preview cap per user (default `30`). |
| `BETA_AUDIO_EXPORTS_PER_MONTH` | No | Monthly narration ZIP export cap per user (default `5`). |
| `BETA_VIDEO_EXPORTS_PER_MONTH` | No | Monthly video export cap per user (default `3`). |

### `ELEVENLABS_VOICE_IDS` format

```json
{
  "warm": "VOICE_ID_WARM",
  "confident": "VOICE_ID_CONFIDENT",
  "energetic": "VOICE_ID_ENERGETIC",
  "professional": "VOICE_ID_PROFESSIONAL"
}
```

All four keys are required in production. In local development, if unset, placeholder IDs are used so the catalog code can run without an ElevenLabs account.

### Local `.env.local` example

```bash
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_IDS='{"warm":"...","confident":"...","energetic":"...","professional":"..."}'
```

---

## ElevenLabs account checklist

- [ ] **Creator or Pro** plan (commercial use for SaaS)
- [ ] Commercial license confirmed for user-generated content distributed to end users
- [x] API key created with synthesis scope only (no unnecessary permissions)
- [x] Four launch voices selected and IDs copied into `ELEVENLABS_VOICE_IDS`
- [x] Terms/Privacy updated for third-party voice processing (#5) — `app/privacy/page.tsx`, `app/terms/page.tsx`
- [x] UI copy drafted — `utils/tts/disclosure-copy.ts` (wire in Phase 2 preview/export UI)

---

## Smoke test

With `npm run dev`:

```bash
# By persona (uses voice catalog)
curl -X POST http://localhost:3000/api/dev/tts-smoke \
  -H "Content-Type: application/json" \
  -d '{"persona":"warm"}' \
  --output smoke-test.mp3

# By raw voice ID
curl -X POST http://localhost:3000/api/dev/tts-smoke \
  -H "Content-Type: application/json" \
  -d '{"voiceId":"YOUR_VOICE_ID"}' \
  --output smoke-test.mp3
```

Response headers include `X-TTS-Char-Count`, `X-TTS-Model-Id`, and `X-TTS-Latency-Ms`.

---

## Campaign audio audit (Phase 1)

Internal route to synthesize all slides for a campaign and download a narration ZIP.
Enabled in development, or when `ENABLE_TTS_AUDIT=true`.

Optional: `TTS_AUDIT_USER_IDS` — comma-separated user UUIDs who can audit **any** campaign
(owners can always audit their own).

Sign in first, then:

```bash
curl -X POST http://localhost:3000/api/dev/audit-campaign-audio \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_SESSION_COOKIE" \
  -d '{"campaignId":"CAMPAIGN_UUID","persona":"warm"}' \
  --output narration-audit.zip
```

ZIP contains `slide-01.mp3`, `slide-02.mp3`, … and `full-narration.mp3` (concatenated).

Run normalizer unit tests:

```bash
npm run test:tts-normalize
```

---

## Voice preview (Phase 2)

User-facing route: `POST /api/tts/preview` (auth required).

```json
{ "campaignId": "...", "slideId": "...", "persona": "warm" }
```

Returns `audio/mpeg`. Cached previews (24h, in-memory per instance) do not count toward monthly preview limits.

Brand default voice: `brands.preferred_voice_persona` (`warm` | `confident` | `energetic` | `professional`).

---

## Audio export (Phase 3)

User-facing route: `POST /api/export-audio` (auth required).

```json
{ "campaignId": "...", "persona": "warm" }
```

`persona` is optional — defaults to the campaign brand's `preferred_voice_persona`, then `warm`.

Returns a ZIP with per-slide MP3s (`slide-01.mp3`, …) and `full-narration.mp3`. Rate-limited to 3 requests/minute. Monthly cap via `BETA_AUDIO_EXPORTS_PER_MONTH` (default `5`). Each export records a `tts_export` usage event; character synthesis is also metered via `tts_characters`.

```bash
curl -X POST http://localhost:3000/api/export-audio \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_SESSION_COOKIE" \
  -d '{"campaignId":"CAMPAIGN_UUID"}' \
  --output narration.zip
```

Apply migration `supabase/migrations/20260617000004_audio_export.sql` before deploying (adds `audio` export type and `tts_export` event).

---

## Video export (Phase 4)

User-facing route: `POST /api/export-video` (auth required). Pipeline:

1. **Prepare** — ElevenLabs TTS (+ word timings when `burn_captions: true`); narration MP3 uploaded to Fal storage; ASS subtitle track built and cached.
2. **Compose** — Fal `fal-ai/ffmpeg-api/images-to-video` queues from POST (hard cuts between slides, 24 fps).
3. **Merge** — Fal `fal-ai/ffmpeg-api/merge-audio-video` when Quick Reel preset includes narration.
4. **Burn captions** (optional) — local FFmpeg burns ASS into merged MP4 on Vercel during poll advancement.

Uses `FAL_KEY` and `/api/webhooks/fal` callback; `GET /api/exports/:id` polls Fal queue when webhooks are unavailable.

```json
{
  "campaignId": "...",
  "persona": "warm",
  "preset": "quick_reel",
  "aspectRatio": "9:16",
  "burn_captions": true
}
```

Requirements: **4:5 or 9:16** campaign, all slide images ready for the target format, every slide has a voiceover script (Quick Reel). Burned captions require Quick Reel preset.

Returns `{ exportId, status: "processing" }`. Poll `GET /api/exports/:id` until `status` is `completed`, then download `outputUrl`.

Rate-limited to 2 requests/minute. Monthly cap via `BETA_VIDEO_EXPORTS_PER_MONTH` (default `3`).

`GET /api/exports/:id` returns `export.stage` for the rendering overlay:

| Stage | Overlay label |
|-------|---------------|
| `images_to_video` | Rendering slides |
| `merge_audio` | Adding voiceover |
| `burn_captions` | Burning captions |

Client poll timeout: **10 minutes** default (`VIDEO_EXPORT_POLL_TIMEOUT_MS`); **20 minutes** when `burn_captions` is enabled (`VIDEO_EXPORT_POLL_TIMEOUT_BURN_CAPTIONS_MS`).

**Timing (typical 5-slide Quick Reel):** ~1–3 minutes without burned captions; ~2–5 minutes with burned captions.

**Stale exports:** `failStaleVideoExportsForCampaign` runs at the start of each new export — marks `processing` exports failed after 15 minutes, or legacy `compose_slides` deadlocks after 6 minutes.

**Legacy:** In-flight exports on `compose_slides` (local multi-pass FFmpeg) are still advanced on poll until they complete or time out. New exports use Fal `images_to_video` only.

Apply migration `supabase/migrations/20260617000005_video_export.sql` before deploying. Burned captions: `20260629000001_exports_burn_captions.sql`.

### Narration cache

Slide MP3s are cached in private Supabase Storage (`tts-cache` bucket) keyed by voice + normalized script. Audio export and video export reuse cached audio — no second ElevenLabs charge for the same slide/persona/script.

Apply migration `supabase/migrations/20260617000006_tts_narration_cache.sql` before deploying.

Local dev requires `FAL_KEY`, `FAL_WEBHOOK_SECRET`, and `NEXT_PUBLIC_APP_URL` reachable by Fal (use ngrok or deploy preview for webhook testing).

---

## Usage metering

Every user-facing synthesis should pass `usage: { userId, campaignId?, slideId? }` on `SynthesizeInput`. Events are stored in `usage_events` with:

- `event_type`: `tts_characters`
- `metadata`: `{ charCount, modelId, latencyMs, success, campaignId?, slideId?, voiceId?, errorCode? }`

Query characters synthesized this month:

```ts
import { getTtsCharactersUsedThisMonth } from "@/utils/tts";

const chars = await getTtsCharactersUsedThisMonth(userId);
```

### COGS estimate (internal)

Default Flash rate: **~$0.10 / 1k characters** (`utils/tts/cogs.ts`).

| Scenario | Estimate |
|----------|----------|
| 5-slide campaign (~500 chars) | ~$0.05 TTS |
| Epic target (TTS only) | ≤ ~$0.08 / 5-slide campaign |

Adjust `ELEVENLABS_USD_PER_1K_CHARS` if your ElevenLabs plan rate differs.

---

## Database migration

Apply `supabase/migrations/20260617000002_tts_usage_events.sql` before recording TTS events in deployed environments.

---

## Key rotation

1. Create new API key in ElevenLabs dashboard.
2. Update `ELEVENLABS_API_KEY` in Vercel (prod, then preview).
3. Redeploy or wait for cold start refresh.
4. Revoke old key after smoke test passes.

---

*Last updated: June 25, 2026*
