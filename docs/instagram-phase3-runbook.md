# Instagram — Phase 3 runbook (verification & launch)

**Epic:** [#27 Direct Platform Posting](https://github.com/reytek1201/SlidePress.co/issues/27) · **Issues:** [#33 Reels](https://github.com/reytek1201/SlidePress.co/issues/33) · [#34 Carousel](https://github.com/reytek1201/SlidePress.co/issues/34)

**Status (June 2026):** OAuth, Reels publish, and Carousel publish shipped in code. **Meta App Review pending** for `instagram_content_publish` — works for app testers/roles until approved.

---

## Prerequisites

- [x] `platform_connections` migration applied (Instagram in platform check)
- [x] `platform_posts` migration applied (Instagram in platform check)
- [x] `platform_posts_instagram_carousel` migration applied (carousel dedupe index)
- [x] `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI` set on Vercel
- [x] Latest `main` deployed to `https://www.slidepress.co`
- [x] Privacy policy live with Instagram section (`/privacy`) — Reels + carousel
- [x] Facebook Page linked to Instagram Professional account in Meta Business Suite

---

## Meta App Review (`instagram_content_publish`)

**Why:** `instagram_content_publish` is an advanced permission. Only users with a **role on your Meta app** (Admin, Developer, Tester) or accounts in **Development** mode can grant publish access until Meta approves the app.

### App checklist

| Item | Value |
|------|--------|
| App name | SlidePress Publishing |
| Redirect URI | `https://www.slidepress.co/api/platforms/instagram/callback` |
| Privacy policy | `https://www.slidepress.co/privacy` |
| Login method | Facebook Login for Business |

### Permissions to declare

| Permission | When requested | Purpose |
|------------|----------------|---------|
| `instagram_basic` | Settings → Connect Instagram | Show connected @username |
| `pages_show_list` | Connect | Find Facebook Page linked to IG |
| `pages_read_engagement` | Connect | Read `instagram_business_account` on Page |
| `business_management` | Connect | Pages managed via Business Suite |
| `instagram_content_publish` | First publish (Grant publishing permission) | Post Reels and carousel |

### Submission package

- [x] **Privacy policy** — documents Instagram data access, Reels + carousel posting, deletion
- [ ] **Demo video** — sign in → Connect Instagram → grant publish permission → post Reel → post carousel
- [ ] **Use-case description** — creators publish campaign Reels and carousels from SlidePress using their own IG Professional account
- [ ] **Test credentials** — Meta reviewer test user with Page + IG Professional linked

**Where to submit:** [Meta for Developers](https://developers.facebook.com/) → your app → **App Review** → request `instagram_content_publish`

**Timeline:** Often 1–4 weeks. Keep Development mode + testers until approved.

### Test users (until approved)

Add Facebook accounts as **App roles** (Developer/Tester) or use Development mode test users. They can connect, grant publish permission, and post. Other users see permission errors.

### After approval

1. Switch app to **Live** mode (if not already)
2. Test with a Facebook account **not** on the app roles list
3. Confirm “Grant publishing permission” completes without errors
4. Market **Post to Instagram** publicly

---

## User requirements (support docs)

Users must have:

1. **Instagram Professional** account (Creator or Business)
2. Instagram linked to a **Facebook Page** they manage
3. In Business Suite: grant SlidePress access to the **Page** and **Instagram account**

Common failure: `/me/accounts` empty — user must grant Business integrations for the correct Page in Meta Business Suite.

---

## QA checklist

### Connect

- [ ] Settings → Connect Instagram → Meta login → returns to Settings with @username
- [ ] Disconnect removes connection
- [ ] Account deletion revokes tokens and removes row

### Reels (Step 5)

- [ ] 9:16 video export + Instagram captions required
- [ ] “Grant publishing permission” flow works
- [ ] Post to Instagram Reels → splash overlay → published permalink
- [ ] Duplicate publish blocked for same export
- [ ] New export can be posted again

### Carousel (Step 6)

- [ ] 4:5 slide images + Instagram captions required
- [ ] Post carousel → splash overlay → published permalink
- [ ] One carousel per campaign (re-post requires new campaign)

### Errors

- [ ] Expired token → reconnect message
- [ ] Scope revoked → “Grant publishing permission” shown again
- [ ] Processing timeout → user told to check profile

---

## Environment variables

```bash
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=https://www.slidepress.co/api/platforms/instagram/callback

# Optional: encrypt platform tokens at rest
PLATFORM_TOKEN_ENCRYPTION_KEY=
```

---

## Launch checklist

- [ ] Meta App Review **approved** for `instagram_content_publish`
- [ ] Carousel migration applied in production
- [ ] QA checklist signed off on web + iOS
- [x] `docs/client-features.md` reflects Instagram posting
- [x] Campaign list shows **On Instagram** when published

---

## Related docs

- [`docs/platform-posting.md`](platform-posting.md) — platform epic overview
- [`docs/youtube-phase3-runbook.md`](youtube-phase3-runbook.md) — parallel OAuth review process for YouTube
