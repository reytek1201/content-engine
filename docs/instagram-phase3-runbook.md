# Instagram — Phase 3 runbook (verification & launch)

**Epic:** [#27 Direct Platform Posting](https://github.com/reytek1201/SlidePress.co/issues/27) · **Issues:** [#33 Reels](https://github.com/reytek1201/SlidePress.co/issues/33) · [#34 Carousel](https://github.com/reytek1201/SlidePress.co/issues/34)

**Status (June 21, 2026):** OAuth, Reels publish, and Carousel publish **shipped and tested** (Reels + carousel confirmed on @slidepress1). **Meta App Review in progress** — submission started via App Review → “Manage messaging & content on Instagram” use case; demo video + final submit pending. Works for app testers/roles until approved.

**Business entity:** Meta app owned by **KeyMacro LLC** (Business Portfolio). Product brand is SlidePress; no separate “SlidePress LLC” required.

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
| Business portfolio | KeyMacro LLC |
| Facebook Page | SlidePress (linked to @slidepress1) |
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
- [x] **End-to-end test** — Reels + carousel published successfully from SlidePress (June 21, 2026)
- [ ] **Demo video** — sign in → Connect Instagram → grant publish permission → post Reel → post carousel
- [ ] **Use-case description** — creators publish campaign Reels and carousels from SlidePress using their own IG Professional account
- [ ] **Test credentials** — Meta reviewer test user with Page + IG Professional linked
- [ ] **KeyMacro LLC business verification** — gather business paperwork if Meta requests it

**Where to submit:** [Meta for Developers](https://developers.facebook.com/) → **SlidePress Publishing** app → **Use cases** → **Manage messaging & content on Instagram** → **App Review** → **Next** through the wizard (video upload is on a later step, not the top-level Publish page).

**Permission test counters:** Meta dashboard may take up to 24 hours to show API test calls as complete after successful publishes.

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

- [x] Settings → Connect Instagram → Meta login → returns to Settings with @username
- [ ] Disconnect removes connection
- [ ] Account deletion revokes tokens and removes row

### Reels (Step 5)

- [x] 9:16 video export + Instagram captions required
- [x] “Grant publishing permission” flow works
- [x] Post to Instagram Reels → splash overlay → published permalink
- [x] Duplicate publish blocked for same export
- [ ] New export can be posted again

### Carousel (Step 6)

- [x] 4:5 slide images + Instagram captions required
- [x] Post carousel → splash overlay → published permalink
- [x] One carousel per campaign (re-post requires new campaign)

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

- [ ] Meta App Review **submitted** (wizard in progress — demo video remaining)
- [ ] Meta App Review **approved** for `instagram_content_publish`
- [x] Carousel migration applied in production
- [ ] QA checklist signed off on web + iOS (core Reels + carousel paths ✅)
- [x] `docs/client-features.md` reflects Instagram posting
- [x] Campaign list shows **On Instagram** when published

---

## Related docs

- [`docs/platform-posting.md`](platform-posting.md) — platform epic overview
- [`docs/youtube-phase3-runbook.md`](youtube-phase3-runbook.md) — parallel OAuth review process for YouTube
