# YouTube Shorts — Phase 3 runbook (verification & launch)

**Epic:** [#27 Direct Platform Posting](https://github.com/reytek1201/SlidePress.co/issues/27) · **Issue:** [#31 Phase 3](https://github.com/reytek1201/SlidePress.co/issues/31)

Phases 0–2 are shipped in code. Phase 3 is **operational**: Google review, quota, privacy, and QA before marketing “Post to YouTube Shorts” broadly.

---

## Prerequisites

- [ ] `platform_connections` migration applied
- [ ] `platform_posts` migration applied
- [ ] `platform_posts_export_unique` migration applied (dedupes test rows + adds unique index)
- [ ] `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REDIRECT_URI` set on Vercel
- [ ] Latest `main` deployed to `https://www.slidepress.co`
- [ ] Privacy policy live with YouTube section (`/privacy`)

---

## Google OAuth verification (`youtube.upload`)

**Why:** `youtube.upload` is a **sensitive scope**. Only test users on your OAuth consent screen can grant upload until Google approves the app.

### Consent screen checklist

| Item | Value |
|------|--------|
| App name | SlidePress |
| User support email | hello@slidepress.co |
| App home page | `https://www.slidepress.co` |
| Privacy policy | `https://www.slidepress.co/privacy` |
| Authorized domains | `slidepress.co` |
| OAuth client type | Web application |
| Redirect URI | `https://www.slidepress.co/api/platforms/youtube/callback` |

### Scopes to declare

| Scope | When requested | Purpose |
|-------|----------------|---------|
| `youtube.readonly` | Settings → Connect YouTube | Read channel name for connected account display |
| `youtube.upload` | First publish (incremental consent) | Upload campaign video as a Short |

### Submission package

1. **Privacy policy** — documents YouTube data access, retention, deletion (see `/privacy`)
2. **Demo video** (~2 min) — sign in → Settings → Connect YouTube → campaign with 9:16 export → Post to YouTube Shorts → show published Short
3. **Scope justification** — “Upload user-authored campaign videos to their own YouTube channel as Shorts”
4. **Limited use** — SlidePress uses YouTube API data only to post on behalf of the signed-in user; no resale, no ads targeting

**Where to submit:** [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → OAuth consent screen → **Publish app** / **Submit for verification**

**Timeline:** Often 1–3 weeks. Keep **Testing** mode with explicit test users until approved.

### Test users (until verified)

Add emails under OAuth consent screen → **Test users**. They can connect and publish; other Google accounts see `access_denied`.

---

## API quota increase

| Operation | Quota cost |
|-----------|------------|
| `videos.insert` (upload) | 1,600 units |
| `videos.list` (processing poll) | 1 unit |
| Default daily quota | 10,000 units (~6 uploads/day) |

**Request increase:** Google Cloud Console → APIs & Services → YouTube Data API v3 → **Quotas** → request higher `Queries per day`.

Plan capacity before marketing direct posting.

---

## Environment variables

```bash
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REDIRECT_URI=https://www.slidepress.co/api/platforms/youtube/callback

# Optional — default unlisted
YOUTUBE_PUBLISH_PRIVACY=unlisted   # public | unlisted | private
```

---

## QA checklist

Run on **web** and **native app** (Capacitor loads production URL).

### Connect & disconnect

- [ ] Settings → Connected accounts → **Connect YouTube** → channel name appears
- [ ] OAuth callback works on iOS (signed state in URL; no `youtube=error`)
- [ ] **Disconnect YouTube** revokes token and clears connection
- [ ] Reconnect after disconnect works

### Upload permission (testing mode)

- [ ] Publish without upload scope → **Grant upload permission** CTA
- [ ] `/api/platforms/youtube/upload-authorize` adds `youtube.upload` scope
- [ ] Second publish succeeds after grant

### Publish flow

- [ ] Campaign with `youtube_shorts` captions + completed 9:16 video export
- [ ] Publish panel shows **Post to YouTube Shorts**
- [ ] Upload completes; **View on YouTube** opens Short
- [ ] Video is **unlisted** by default (unless `YOUTUBE_PUBLISH_PRIVACY` overridden)
- [ ] Title/description match caption fields

### Idempotency

- [ ] Tap **Post** again on same export → **Already on YouTube** (no duplicate upload)
- [ ] New 9:16 export → publish allowed again

### Error paths

- [ ] No captions → YouTube section hidden
- [ ] No 9:16 export → button disabled with clear helper text
- [ ] Not connected → **Connect YouTube** link
- [ ] Expired token → reconnect message (disconnect + connect)

### Account deletion

- [ ] Settings → Account deletion (`DELETE` confirm)
- [ ] `platform_connections` row removed; YouTube token revoked
- [ ] User cannot sign in; campaigns and `platform_posts` removed (CASCADE)

---

## Architecture reminder

- **Connect** (`youtube.readonly`) ≠ **upload consent** (`youtube.upload`)
- OAuth tokens stored server-side in `platform_connections`; never in the WebView
- Publish uses resumable upload + processing poll (`utils/youtube/upload-short.ts`)
- Duplicate guard: one active/published post per `(campaign_id, export_id)`

---

## Launch criteria

- [ ] OAuth verification **approved** (or explicit beta with test users only)
- [ ] Quota sufficient for expected daily uploads
- [ ] QA checklist signed off on web + iOS
- [ ] `docs/client-features.md` reflects live YouTube posting
- [ ] Remove or soften “export only” language in marketing once verified

---

## After YouTube

Next platforms per [`docs/platform-posting.md`](platform-posting.md): TikTok (#32) → Instagram Reels (#33) → Carousel (#34).
