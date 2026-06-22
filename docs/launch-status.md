# SlidePress — Launch status & next phase

**Last updated:** June 20, 2026

Single source of truth for where store setup, billing, and platform audits stand — and what to work on next.

**Related:** [`beta-release.md`](beta-release.md) · [`billing.md`](billing.md) · [`platform-posting.md`](platform-posting.md) · [`app-store-review-notes.md`](app-store-review-notes.md)

**GitHub:** [Epic #14 Billing](https://github.com/reytek1201/SlidePress.co/issues/14) · [Epic #27 Platform posting](https://github.com/reytek1201/SlidePress.co/issues/27) · [Epic #44 Launch](https://github.com/reytek1201/SlidePress.co/issues/44)

---

## Executive summary

| Area | Status |
|------|--------|
| **Product code** | ✅ Shipped — campaigns, video, billing paywall, 4 platform integrations |
| **Web (Vercel)** | ✅ Live at `https://www.slidepress.co` |
| **iOS TestFlight** | ✅ External beta review passed (build 2+); build **4** uploaded |
| **iOS App Store** | 🟡 **1.0 draft ready** — build + subs attached; **not submitted** (waiting on platform reviews) |
| **Android closed testing** | 🟡 AAB uploaded (`versionCode` **8**); **Play sandbox IAP verified** ([#26](https://github.com/reytek1201/SlidePress.co/issues/26) closed) |
| **Billing v2 (code)** | ✅ Caps, gating, Stripe + RevenueCat integration in repo |
| **Billing v2 (prod)** | 🟡 Migrations + Stripe Price IDs may still need applying in Supabase/Vercel |
| **Platform audits** | 🚧 YouTube OAuth, Meta Instagram, TikTok public posting — **blockers for marketing “direct post”** |

**Strategy:** Finish external platform reviews + internal QA **before** submitting iOS **1.0** for App Store review. TestFlight can continue without App Store submit. iOS uses **manual release** so approval ≠ going live.

---

## What's done

### App & infrastructure

- [x] Capacitor native shell (iOS + Android) loading production web
- [x] Sign in with Apple, Google, email; optional Face ID
- [x] Push notifications (Phases 1–3 closed — [#35](https://github.com/reytek1201/SlidePress.co/issues/35))
- [x] Privacy policy, terms, health endpoint
- [x] v2 tier caps in `utils/plan-limits.ts` (Creator $24 web / $29.99 IAP; Agency $79 / $99.99)

### Platform posting (code)

| Platform | Code | Issue |
|----------|------|-------|
| YouTube Shorts | ✅ | [#28–#30](https://github.com/reytek1201/SlidePress.co/issues/30) closed · [#31](https://github.com/reytek1201/SlidePress.co/issues/31) open |
| TikTok | ✅ | [#32](https://github.com/reytek1201/SlidePress.co/issues/32) closed |
| Instagram Reels | ✅ | [#33](https://github.com/reytek1201/SlidePress.co/issues/33) closed |
| Instagram Carousel | ✅ | [#34](https://github.com/reytek1201/SlidePress.co/issues/34) — code done; Meta review only |

### iOS — App Store Connect

- [x] App record: **SlidePress**, bundle `co.slidepress.app`
- [x] Subscriptions: `slidepress_creator_monthly` ($29.99), `slidepress_agency_monthly` ($99.99)
- [x] Subscription group localization: **SlidePress Plans**
- [x] Both subs **Ready to Submit**; attached to version **1.0**
- [x] Build **4** (marketing version **1.0**) selected on 1.0 page
- [x] RevenueCat iOS products linked — status mirrors ASC (**Ready to Submit**)
- [ ] **Submit 1.0 for App Review** — deferred until launch-ready
- [ ] `ITSAppUsesNonExemptEncryption` in Info.plist — added in repo; ship in next build
- [ ] RevenueCat App Store Connect API key (`.p8`) — optional but recommended before IAP QA
- [ ] `NEXT_PUBLIC_REVENUECAT_IOS_KEY` on Vercel when testing iOS IAP

### Android — Play Console

- [x] Package `co.slidepress.app`, `versionCode` **8**, `versionName` **1.0**
- [x] Store listing (Productivity), privacy, data safety, content ratings, 18+ audience
- [x] Subscriptions: `slidepress_creator_monthly`, `slidepress_agency_monthly` ($29.99 / $99.99)
- [x] RevenueCat Play products linked
- [x] Signed AAB uploaded to closed/internal testing
- [ ] Closed testing **submitted for review** (if not already)
- [x] License tester sandbox IAP end-to-end ([#26](https://github.com/reytek1201/SlidePress.co/issues/26) — closed Jun 2026)
- [ ] Child safety declaration — only if Play blocks on Social category (use **Productivity**)

### Billing implementation (code — Epic #14)

- [x] #15–#24, #22, #23 (iOS ASC setup) — closed
- [ ] #25 QA checklist + launch docs — open
- [x] #26 Google Play subscription QA — closed (sandbox purchase → tier upgrade verified)

---

## Waiting on (external — no code required)

| Blocker | Owner | Action |
|---------|-------|--------|
| **Google OAuth verification** (`youtube.upload`) | Google | Monitor email; respond to CASA if requested — [#31](https://github.com/reytek1201/SlidePress.co/issues/31) |
| **Meta App Review** (`instagram_content_publish`) | Meta | Finish demo video + submit wizard — [`instagram-phase3-runbook.md`](instagram-phase3-runbook.md) |
| **TikTok public posting** | TikTok | Confirm audit status; verify `TIKTOK_*` on Vercel — may already be approved |
| **Apple App Store review** | You | Submit **1.0** only when ready to ship shortly after approval |

---

## Open work (you can do now)

### Phase A — Production data & env (1–2 hours)

Priority: unblock billing QA and platform gating in production.

- [x] Apply `20260623000001_tier_entitlement_v2.sql` in Supabase production
- [x] Apply `20260624000001_platform_connection_grace.sql` in Supabase production
- [ ] Stripe: create v2 Prices ($24 / $79) → update Vercel env (`STRIPE_PRICE_CREATOR`, `STRIPE_PRICE_AGENCY`)
- [ ] Confirm `REVENUECAT_WEBHOOK_SECRET` + webhook URL on RevenueCat
- [ ] Create **reviewer demo account** (`reviewer@slidepress.co`) with sample campaign — [`app-store-review-notes.md`](app-store-review-notes.md)

### Phase B — Platform review submissions (parallel)

- [ ] **Instagram:** record demo video → submit Meta App Review — [`instagram-phase3-runbook.md`](instagram-phase3-runbook.md)
- [ ] **YouTube:** check Google Cloud verification status; add OAuth test users for beta
- [ ] **TikTok:** test public post from production; confirm audit tier

### Phase C — Billing & gating QA ([#25](https://github.com/reytek1201/SlidePress.co/issues/25))

Run on web + one native device after Phase A migrations:

- [ ] Free tier defaults (3 / 10 / 0 campaigns / regens / videos)
- [ ] Free: 2nd platform connect blocked; 4th campaign upsell
- [ ] Stripe upgrade → v2 credits (10/20/10 Creator, 30/60/20 Agency)
- [ ] Downgrade → 7-day connection grace then revoke
- [ ] Brand limits 1 / 3 / 15

### Phase D — Mobile store QA ([#44](https://github.com/reytek1201/SlidePress.co/issues/44))

- [ ] **iOS TestFlight:** smoke test on build 4 (login, campaign, Save to Photos, Settings → Usage paywall UI)
- [ ] **Android:** closed testing install + smoke test
- [x] **Android IAP sandbox** ([#26](https://github.com/reytek1201/SlidePress.co/issues/26)): license tester purchase → `usage_balances` tier upgrade via RevenueCat webhook
- [ ] **iOS IAP sandbox** (after App Store submit + Apple approves subs, or limited sandbox before): Creator + Agency purchase → `usage_balances` updates via webhook
- [ ] Increment iOS build to **5** when shipping `ITSAppUsesNonExemptEncryption` fix

### Phase E — Launch (when Phases A–D + platform audits acceptable)

- [ ] iOS: fill App Review notes on 1.0 → **Submit to App Review** (manual release stays off store until you click Release)
- [ ] Android: promote closed testing → production (or open testing first)
- [ ] Set `NEXT_PUBLIC_APP_STORE_URL` / `NEXT_PUBLIC_PLAY_STORE_URL` on Vercel
- [ ] Close Epic #14, #27 (operational), #44

---

## Version numbers (current)

| Platform | Marketing | Build / versionCode |
|----------|-----------|---------------------|
| iOS | 1.0 | **8** (`CURRENT_PROJECT_VERSION`) |
| Android | 1.0 | **8** (`versionCode`) |

Increment build numbers on every store upload.

---

## Decision log

| Date | Decision |
|------|----------|
| Jun 20, 2026 | **Android Play sandbox IAP verified** — #26 closed; purchase upgrades tier via RevenueCat webhook |
| Jun 22, 2026 | **Do not** submit iOS 1.0 for App Store review until platform audits + QA complete; 1.0 draft with subs attached is correct holding state |
| Jun 22, 2026 | iOS **manual release** — approval will not auto-publish to App Store |
| Jun 2026 | v2 pricing locked: web $24/$79, IAP $29.99/$99.99 |

---

## Deferred (post-launch)

- Home screen widgets — Epic [#36](https://github.com/reytek1201/SlidePress.co/issues/36) (Phases 0–3 open)
- Studio tier (~$129 web) — reassess H2 2026 per [`billing.md`](billing.md)
- YouTube API quota increase — only if >~6 Shorts uploads/day
