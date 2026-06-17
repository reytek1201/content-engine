# TTS & narration — internal runbook

Internal setup for ElevenLabs text-to-speech (Phase 0). Not user-facing documentation.

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

### `ELEVENLABS_VOICE_IDS` format

```json
{
  "warm": "VOICE_ID_WARM",
  "energetic": "VOICE_ID_ENERGETIC",
  "professional": "VOICE_ID_PROFESSIONAL"
}
```

All three keys are required in production. In local development, if unset, placeholder IDs are used so the catalog code can run without an ElevenLabs account.

### Local `.env.local` example

```bash
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_IDS='{"warm":"...","energetic":"...","professional":"..."}'
```

---

## ElevenLabs account checklist

- [ ] **Creator or Pro** plan (commercial use for SaaS)
- [ ] Commercial license confirmed for user-generated content distributed to end users
- [x] API key created with synthesis scope only (no unnecessary permissions)
- [x] Three launch voices selected and IDs copied into `ELEVENLABS_VOICE_IDS`
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

Brand default voice: `brands.preferred_voice_persona` (`warm` | `energetic` | `professional`).

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

*Last updated: June 2026*
