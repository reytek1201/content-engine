# SlidePress — Direct Platform Posting

**Post campaigns to social platforms from SlidePress without manual export + copy/paste.**

**GitHub epic:** [Epic — Direct Platform Posting](https://github.com/reytek1201/SlidePress.co/issues/27)

**Current state:** Export MP4 / images + copy captions, plus **direct YouTube Shorts posting** (connect in Settings, publish from campaign). TikTok and Instagram remain manual export. See `docs/client-features.md`.

**Platform order (easiest → hardest):**

| Rank | Platform | Content type | Issue |
|------|----------|--------------|-------|
| 1 | YouTube Shorts | 9:16 MP4 + title/description/hashtags | #28–#31 |
| 2 | TikTok | 9:16 MP4 + caption/hashtags | #32 |
| 3 | Instagram Reels | 9:16 MP4 + caption/hashtags | #33 |
| 4 | Instagram Carousel | 4:5 multi-image + caption/hashtags | #34 |

---

## Principles

- **Server-side posting only** — platform OAuth tokens and upload calls live on Vercel; never in the Capacitor WebView.
- **Separate from Supabase auth** — Google sign-in for SlidePress ≠ YouTube upload consent. Each platform gets its own “Connect account” flow in Settings.
- **Reuse existing assets** — video from `exports` (Quick Reel MP4), captions from `platform_captions`, slide images from campaign storage.
- **Async jobs** — uploads and platform processing are long-running; persist status and poll until published or failed.
- **Ship one platform end-to-end** before starting the next.

---

## Shared infrastructure (built with YouTube Phase 0)

These pieces are reused by TikTok and Instagram later:

| Piece | Purpose |
|-------|---------|
| `platform_connections` table | Per-user OAuth tokens (encrypted), platform id, account display name, expiry |
| `platform_posts` table | Per-campaign publish attempts: platform, status, external post id/url, error |
| Settings → **Connected accounts** | Connect / disconnect TikTok, YouTube, Instagram |
| OAuth callback routes | `/api/platforms/[platform]/callback` |
| Job status API | `GET /api/platforms/posts/[id]` for UI polling |

---

## YouTube Shorts — phased plan

YouTube is first because: single MP4 asset, mature resumable upload API, caption fields already match `youtube_shorts` in `types/captions.ts` (`title`, `caption`, `hashtags`).

### Phase 0 — OAuth & connection storage ([#28](https://github.com/reytek1201/SlidePress.co/issues/28)) ✅

**Goal:** User can connect a YouTube channel from Settings; tokens stored securely server-side.

| Task | Notes |
|------|-------|
| Google Cloud project | Enable **YouTube Data API v3** |
| OAuth client | Web application; redirect URI `https://www.slidepress.co/api/platforms/youtube/callback` (+ localhost for dev) |
| Scopes | `youtube.upload`, `youtube.readonly` (channel picker), `openid email` |
| DB migration | `platform_connections` — `user_id`, `platform`, `access_token`, `refresh_token`, `expires_at`, `account_label`, `account_external_id` |
| Connect route | `GET /api/platforms/youtube/connect` → Google OAuth |
| Callback route | Exchange code → store tokens → redirect to Settings |
| Disconnect route | `DELETE /api/platforms/youtube` — revoke + delete row |
| Settings UI | “Connect YouTube” / connected channel name / Disconnect |
| RLS | User can only read/write own connections |

**Exit criteria:** Settings shows connected channel; tokens refresh automatically; disconnect works.

### Phase 1 — Resumable upload pipeline ([#29](https://github.com/reytek1201/SlidePress.co/issues/29)) ✅

**Goal:** Server can upload a completed campaign video export to the user’s YouTube channel.

| Task | Notes |
|------|-------|
| `platform_posts` migration | `campaign_id`, `platform`, `export_id`, `status`, `external_id`, `external_url`, `error_message`, timestamps |
| Upload service | `utils/youtube/upload-short.ts` — resumable upload per [YouTube API guide](https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol) |
| Metadata mapping | `title` ← caption `title`; `description` ← `caption` + hashtags; `categoryId` 22 (People & Blogs) or configurable |
| Video source | Signed/public URL from completed `exports` row (`export_type: video`, aspect `9:16`) |
| API route | `POST /api/platforms/youtube/publish` — body: `campaignId`, optional `exportId` |
| Processing poll | After upload, poll `videos.list` until `processingDetails.processingStatus` is terminal |
| Shorts eligibility | Vertical 9:16, ≤60s — align with Quick Reel export constraints |

**Exit criteria:** API route uploads MP4 and returns YouTube video id + watch URL (manual/curl test OK).

### Phase 2 — Publish UI & orchestration ([#30](https://github.com/reytek1201/SlidePress.co/issues/30)) ✅

**Goal:** One-tap “Post to YouTube” from the campaign Publish panel.

| Task | Notes |
|------|-------|
| Publish panel CTA | “Post to YouTube Shorts” — disabled until 9:16 video export complete + `youtube_shorts` caption exists |
| Not connected state | Link to Settings → Connected accounts |
| Progress UX | Uploading → Processing on YouTube → Published (with link) |
| Error UX | Quota exceeded, token expired, video too long, processing failed — actionable messages |
| Idempotency | Warn if already posted; optional “Post again” for new export |
| Usage / limits | Consider beta cap on platform posts per month (optional v1) |

**Exit criteria:** User completes full flow from campaign workspace without leaving SlidePress (except to view published Short on YouTube).

### Phase 3 — Verification & launch ([#31](https://github.com/reytek1201/SlidePress.co/issues/31)) 🚧

**Goal:** Production-ready for TestFlight / web users.

**Runbook:** [`docs/youtube-phase3-runbook.md`](youtube-phase3-runbook.md) — QA checklist, OAuth verification steps, quota increase.

| Task | Status |
|------|--------|
| Google OAuth verification | Submit `youtube.upload` for review |
| Quota | Request increase if default 10k units/day is tight (~1600 units per upload) |
| Privacy policy | ✅ YouTube data access documented at `/privacy` |
| Account deletion | ✅ Revokes YouTube tokens + deletes `platform_connections` |
| Duplicate publish guard | ✅ Idempotent per campaign export |
| QA checklist | See runbook |
| Docs | ✅ `docs/client-features.md` updated |

**Exit criteria:** OAuth verification approved (or in review with staging test users); QA checklist signed off.

---

## TikTok ([#32](https://github.com/reytek1201/SlidePress.co/issues/32))

**Content:** 9:16 Quick Reel MP4 + `tiktok` caption.

**Blockers:** TikTok [Content Posting API](https://developers.tiktok.com/doc/content-posting-api-get-started) app audit before public posting.

**Reuse from YouTube:** `platform_connections`, `platform_posts`, Settings connected accounts, Publish panel pattern.

**Key work:** TikTok OAuth, `video.upload` / Direct Post flow, audit package (privacy policy, UX screencasts), caption + hashtag mapping.

---

## Instagram Reels ([#33](https://github.com/reytek1201/SlidePress.co/issues/33))

**Content:** 9:16 MP4 + `instagram` caption.

**Blockers:** Meta app review; user must have **Instagram Professional** account linked to a **Facebook Page**.

**Key work:** Meta OAuth (`instagram_content_publish`, `pages_show_list`), container create → poll → publish for Reels, public video URL hosting during publish.

---

## Instagram Carousel ([#34](https://github.com/reytek1201/SlidePress.co/issues/34))

**Content:** 4:5 slide images (3–7) + `instagram` caption.

**Hardest** because of multi-image container orchestration (child containers → parent carousel → publish) on top of full Meta requirements.

**Depends on:** Instagram Reels path (#33) for shared Meta app, OAuth, and account-linking UX.

---

## Environment variables (YouTube)

```bash
# Google OAuth (YouTube) — separate from Supabase Google provider
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REDIRECT_URI=https://www.slidepress.co/api/platforms/youtube/callback

# Optional: encrypt platform tokens at rest
PLATFORM_TOKEN_ENCRYPTION_KEY=
```

---

## API quota reference (YouTube)

| Operation | Quota cost |
|-----------|------------|
| `videos.insert` (upload) | 1,600 units |
| `videos.list` (status poll) | 1 unit |
| Default daily quota | 10,000 units |

Plan for ~6 uploads/day on default quota or request an increase before marketing “Post to YouTube.”

---

## Out of scope (this epic)

- LinkedIn, X/Twitter, Facebook feed-only posts
- Scheduling / queue for future posts
- Cross-posting one action to all platforms at once (consider after 2+ platforms ship)
- Replacing manual export flow (keep share sheet as fallback)

---

## Timeline (rough)

| Phase | Duration |
|-------|----------|
| YouTube 0–1 | 1–2 weeks |
| YouTube 2 | 1 week |
| YouTube 3 | 1–3 weeks (OAuth verification often dominates) |
| TikTok | 2–4 weeks + audit wait |
| Instagram Reels | 2–3 weeks + Meta review |
| Instagram Carousel | 2–3 weeks (after Reels) |
