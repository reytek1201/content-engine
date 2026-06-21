# YouTube Shorts — Phase 3 runbook (verification & launch)

**Epic:** [#27 Direct Platform Posting](https://github.com/reytek1201/SlidePress.co/issues/27) · **Issue:** [#31 Phase 3](https://github.com/reytek1201/SlidePress.co/issues/31)

**Status (June 2026):** Phases 0–2 shipped. Phase 3 in progress — **Google OAuth verification submitted** (awaiting approval, ~1–3 weeks). Closed beta works for OAuth **test users** only until approved.

Phases 0–2 are shipped in code. Phase 3 is **operational**: Google review, quota, privacy, and QA before marketing “Post to YouTube Shorts” broadly.

---

## Prerequisites

- [x] `platform_connections` migration applied
- [x] `platform_posts` migration applied
- [x] `platform_posts_export_unique` migration applied (dedupes test rows + adds unique index)
- [x] `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REDIRECT_URI` set on Vercel
- [x] Latest `main` deployed to `https://www.slidepress.co`
- [x] Privacy policy live with YouTube section (`/privacy`)

---

## Google OAuth verification (`youtube.upload`)

**Why:** `youtube.upload` is a **sensitive scope**. Only test users on your OAuth consent screen can grant upload until Google approves the app.

**Current:** Submitted for verification with scope justification + unlisted YouTube demo video. Keep **Testing** mode and test users until Google approves.

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

- [x] **Privacy policy** — documents YouTube data access, retention, deletion (see `/privacy`)
- [x] **Demo video** — sign in → Connect YouTube → campaign with 9:16 export → Post to YouTube Shorts → published Short (unlisted on YouTube)
- [x] **Scope justification** — submitted in Google Cloud verification form
- [x] **Limited use** — SlidePress uses YouTube API data only to post on behalf of the signed-in user

**Where to submit:** [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → OAuth consent screen → **Publish app** / **Submit for verification**

**Timeline:** Often 1–3 weeks. Keep **Testing** mode with explicit test users until approved.

### Test users (until verified)

Add emails under OAuth consent screen → **Test users**. They can connect and publish; other Google accounts see `access_denied`.

### After approval

1. OAuth consent screen → **Publish app** / Production
2. Test with a Google account **not** on the test users list
3. Confirm consent no longer requires Advanced → unsafe
4. Market **Post to YouTube Shorts** publicly

---

## API quota increase

| Operation | Quota cost |
|-----------|------------|
| `videos.insert` (upload) | 1,600 units |
| `videos.list` (processing poll) | 1 unit |
| Default daily quota | 10,000 units (~6 uploads/day) |

**Request increase:** Google Cloud Console → APIs & Services → YouTube Data API v3 → **Quotas** → request higher `Queries per day`.

- [ ] Quota increase requested (optional until >~6 uploads/day)

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

- [x] Settings → Connected accounts → **Connect YouTube** → channel name appears
- [x] OAuth callback works on iOS (signed state in URL; no `youtube=error`)
- [ ] **Disconnect YouTube** revokes token and clears connection
- [ ] Reconnect after disconnect works

### Upload permission (testing mode)

- [x] Publish without upload scope → **Grant upload permission** CTA
- [x] `/api/platforms/youtube/upload-authorize` adds `youtube.upload` scope
- [x] Second publish succeeds after grant

### Publish flow

- [x] Campaign with `youtube_shorts` captions + completed 9:16 video export
- [x] Publish panel shows **Post to YouTube Shorts**
- [x] Upload completes; **View on YouTube** opens Short
- [x] Video is **unlisted** by default (unless `YOUTUBE_PUBLISH_PRIVACY` overridden)
- [x] Title/description match caption fields

### Idempotency

- [x] Tap **Post** again on same export → **Already on YouTube** (no duplicate upload)
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

- [ ] OAuth verification **approved** (submitted — in review)
- [ ] Quota sufficient for expected daily uploads
- [ ] QA checklist signed off on web + iOS (core publish path ✅; edge cases pending)
- [x] `docs/client-features.md` reflects live YouTube posting
- [ ] Remove or soften “export only” language in marketing once verified

---

## After YouTube

TikTok (#32) and Instagram Reels (#33) + Carousel (#34) are shipped in code. See [`docs/platform-posting.md`](platform-posting.md) and [`docs/instagram-phase3-runbook.md`](instagram-phase3-runbook.md) for remaining Meta/TikTok app review steps.
