# SlidePress — Billing & Usage Tiers

Paid subscription tiers with credit-based usage enforcement, dual payment rails (Stripe web + RevenueCat mobile), and tier-gated features.

**GitHub epic:** [#14 — Billing & Usage Tiers](https://github.com/reytek1201/SlidePress.co/issues/14)

**Related:** [#1 — ElevenLabs narration & video export](https://github.com/reytek1201/SlidePress.co/issues/1) (video credit enforcement depends on Epic #1)

**Status:** **v2** caps and list prices are implemented in code (`utils/plan-limits.ts`, Settings → Usage). Run the Supabase migration and create new Stripe Prices in the Dashboard (see [Stripe price change runbook](#stripe-price-change-runbook)) before charging new amounts.

**Deferred:** Studio / Enterprise tier with higher video caps — reassess H2 2026 after `usage_events` data.

---

## Tier matrix — v2 (current)

### Pricing

| Tier | Web (Stripe) | iOS / Android (IAP) | You keep (web, approx.) | You keep (IAP @ 30%, approx.) |
|------|--------------|---------------------|--------------------------|-------------------------------|
| Free | $0 | $0 | — | — |
| Creator | **$24/mo** | **$29.99/mo** | ~$23.00 | ~$21.00 |
| Agency Pro | **$79/mo** | **$99.99/mo** | ~$76.40 | ~$70.00 |

- **Same entitlements** on web and mobile; IAP list price is higher to offset Apple/Google’s cut.
- **Apple Small Business Program (15%):** Creator IAP net ~$25.49, Agency ~$84.99 — recalculate margins if enrolled.
- **No Stripe checkout in the native app** (App Store / Play policy). Web subscribers get the same tier via shared `usage_balances`.

### Entitlements

| Entitlement | Free | Creator | Agency Pro |
|-------------|------|---------|------------|
| Campaigns | 3 **lifetime** | 10 / month | 30 / month |
| Slide regenerations | 10 **lifetime** | 20 / month | 60 / month |
| Video exports | 0 (blocked) | 10 / month | 20 / month |
| TTS voice previews | 5 **lifetime** | 30 / month | 60 / month |
| Narration ZIP exports | 0 | 5 / month | 15 / month |
| Brand workspaces | 1 | 3 | 15 |
| **Platform connections** | **1** (YouTube, TikTok, or Instagram — user’s choice) | **All 3** | **All 3** |
| Direct platform publish | On connected platform only | All connected | All connected |
| Carousel zip / captions / manual export | Yes (within campaign limits) | Yes | Yes |
| Reset cadence | Never | Monthly | Monthly |

**Design principles (v2):**

- **Free** = prove the workflow (create → export manually). One auto-post channel max.
- **Paid** = volume + **full distribution** (all platforms) + video.
- **Video** stays relatively generous (low API COGS); **campaigns and regens** are the expensive meters.
- **No unlimited entitlements.** Studio tier later for heavy video shops.

### Marketing one-liners

| Tier | Pitch |
|------|-------|
| Free | Create carousel campaigns and captions. Export anywhere. Connect **one** social account to post from SlidePress. |
| Creator | Post to **YouTube, TikTok, and Instagram**. ~10 Reels/month, more campaigns, video export. |
| Agency Pro | Multiple client brands at volume — agencies and social managers. |

---

## Platform connections (v2 — connect + publish enforced)

| Rule | Behavior |
|------|----------|
| Free limit | Max **1** row in `platform_connections` per user |
| First connect | User picks any platform |
| Second connect on free | Block with `LIMIT_EXCEEDED` + upgrade CTA |
| Switch platform (free) | Must **disconnect** current platform before connecting another |
| Creator / Agency | Up to **3** connections (one per platform) |
| Downgrade paid → free | If user has 2–3 connections: **grace period** (e.g. 7 days) to pick one; disable publish on extras until resolved |
| Publish API | Second line of defense: reject publish if platform not in allowed set for tier |

**Implementation touchpoints:** `utils/plan-limits.ts` (`maxPlatformConnections`), connect/callback routes under `/api/platforms/*/`, `connected-accounts-settings.tsx`, publish routes.

---

## Tier matrix — v1 (retired)

| Entitlement | Free | Creator ($19/mo) | Agency Pro ($49/mo) |
|-------------|------|------------------|---------------------|
| Campaigns | 3 lifetime | 15 / month | 50 / month |
| Video exports | 0 | 5 / month | 15 / month |

Grandfather existing Stripe/IAP subscribers on v1 price until they change plans or you migrate them.

---

## Architecture

```
Web browser  → Stripe Checkout  → Stripe webhook  ─┐
                                                    ├→ usage_balances (source of truth)
Capacitor app → RevenueCat IAP → RC webhook      ─┘
                                                    ↓
API route guards (generate-text, duplicate, regenerate, video, brands, platforms)
                                                    ↓
usage_events (audit log, append-only)
```

| Layer | Responsibility |
|-------|----------------|
| `usage_balances` | Per-user credits, tier, billing metadata |
| `usage_events` | Audit trail (existing table) |
| `utils/plan-limits.ts` | Tier cap constants |
| `utils/usage-limits.ts` | Read balances, assert limits, consume credits |
| Stripe webhooks | Web checkout fulfillment |
| RevenueCat webhooks | Mobile IAP fulfillment |
| `apply_tier_entitlement()` | Shared helper — both webhooks call this |

**Enforcement is server-side only** on every costly API route. Never trust client-side credit checks.

---

## Database: `usage_balances`

Provisioned automatically on signup via trigger on `auth.users`.

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | UUID PK | FK → `auth.users` |
| `tier` | enum | `free`, `creator`, `agency` |
| `campaign_credits_remaining` | int | Decremented on create / duplicate |
| `regeneration_credits_remaining` | int | Decremented on slide regenerate |
| `video_credits_remaining` | int | Decremented on video export |
| `tts_preview_credits_remaining` | int | Decremented on fresh TTS preview synthesis |
| `audio_export_credits_remaining` | int | Decremented on narration ZIP export |
| `stripe_customer_id` | text | Nullable |
| `stripe_subscription_id` | text | Nullable |
| `revenuecat_app_user_id` | text | Nullable; usually = `user_id` |
| `current_period_start` | timestamptz | Paid tiers only |
| `current_period_end` | timestamptz | Paid tiers only |

**RLS:** users can `SELECT` their own row. No client `UPDATE` — only service role (webhooks + admin client).

**Atomic decrement:** Postgres function `consume_credit(user_id, credit_type)` with `SELECT … FOR UPDATE`.

### Free-tier defaults (on signup)

| Credit | v1 (code) | v2 (proposed) |
|--------|-----------|---------------|
| Campaigns | 3 | 3 |
| Regenerations | 10 | 10 |
| Video | 0 | 0 |
| TTS previews | 5 | 5 |
| Audio export | 0 | 0 |

### Monthly refill (paid tiers, on renewal)

| Tier | | Campaigns | Regens | Videos | TTS previews | Audio export |
|------|---|-----------|--------|--------|--------------|--------------|
| creator | v1 | 15 | 30 | 5 | 30 | 5 |
| creator | **v2** | **10** | **20** | **10** | 30 | 5 |
| agency | v1 | 50 | 100 | 15 | 60 | 15 |
| agency | **v2** | **30** | **60** | **20** | 60 | 15 |

Free tier never refills. Paid tiers **hard reset** to caps (not additive).

**v2 migration:** `supabase/migrations/20260623000001_tier_entitlement_v2.sql` updates `apply_tier_entitlement()`. New refills use v2 caps; mid-cycle balances are unchanged until the next renewal webhook.

---

## Platform routing

```typescript
isNativeAppRuntime()
  ? RevenueCat paywall (iOS / Android IAP)
  : Stripe Checkout Session
```

- **Web:** `POST /api/billing/create-checkout` → Stripe Checkout → `POST /api/webhooks/stripe`
- **Mobile:** RevenueCat Capacitor plugin → `POST /api/webhooks/revenuecat`
- **No Stripe links in the native app** (App Store / Play policy)
- **Restore purchases** button required on mobile

---

## API guards

| Action | Route | Credit / gate |
|--------|-------|----------------|
| Create campaign | `POST /api/generate-text` | campaign |
| Duplicate campaign | `POST /api/duplicate-campaign` | campaign |
| Regenerate slide | `POST /api/regenerate-slide` | regeneration |
| Video export | `POST /api/export-video` | video (1 per aspect ratio export) |
| TTS preview | `POST /api/tts/preview` | tts_preview (cache hits skip API + credit) |
| Narration ZIP | `POST /api/export-audio` | audio_export |
| Add brand | brand create path | tier brand cap |
| Connect platform | `/api/platforms/*/connect` | v2: connection cap |
| Publish | `/api/platforms/*/publish*` | v2: tier + connection |

**Error contract:**

```json
{
  "success": false,
  "code": "LIMIT_EXCEEDED",
  "error": "…",
  "tier": "free",
  "upgradeUrl": "/settings/usage"
}
```

---

## Stripe (web)

### Dashboard setup (v2)

1. Products: `SlidePress Creator`, `SlidePress Agency Pro`
2. Prices: **$24/mo**, **$79/mo** (recurring) — see [Stripe price change runbook](#stripe-price-change-runbook)
3. Enable Customer Portal (manage / cancel)

### Environment variables

```bash
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_CREATOR=
STRIPE_PRICE_AGENCY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

### Webhook events

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Link customer, set tier, refill credits |
| `invoice.paid` | Monthly refill on renewal |
| `customer.subscription.updated` | Tier change (upgrade / downgrade) |
| `customer.subscription.deleted` | Downgrade to free |

**Idempotency:** track processed event IDs; webhook replay must not double-refill.

---

## RevenueCat (mobile)

Defer IAP until Stripe web is stable at v2 prices.

```bash
REVENUECAT_WEBHOOK_SECRET=
NEXT_PUBLIC_REVENUECAT_IOS_KEY=
NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=
```

- `appUserID` = Supabase `user.id`
- Entitlements: `creator`, `agency`
- **v2 IAP products:** Creator **$29.99/mo**, Agency **$99.99/mo** (separate from Stripe Price IDs)

---

## Unit economics

Approximate **variable API costs** (see `docs/client-features.md`, `utils/tts/cogs.ts`):

| Action | Typical COGS |
|--------|----------------|
| New 5-slide campaign (text + images @ Fal 1K) | ~$0.45–0.55 |
| Dual format (+second aspect images) | +~$0.40 |
| Slide regeneration | ~$0.08–0.15 |
| Video export (Quick Reel, standard voice) | ~$0.05–0.15 |
| Video re-export (cached narration) | ~$0.001 |
| TTS preview (1 slide, uncached) | ~$0.01 |

Images (Fal) dominate campaign cost. Video is cheap relative to perceived value. **IAP 30% fee** often exceeds extra video COGS.

### v2 — worst case (100% utilization, variable API only)

| Tier | Max API COGS | Web net | IAP net @ 30% | Web margin | IAP margin |
|------|--------------|---------|---------------|------------|------------|
| Free | ~$2.50 | $0 | $0 | CAC | CAC |
| Creator | **~$10.00** | ~$23.00 | ~$21.00 | **~57%** | **~52%** |
| Agency | **~$32.00** | ~$76.40 | ~$70.00 | **~58%** | **~54%** |

Creator v2 max COGS breakdown: 10 campaigns (~$5.50) + 20 regens (~$2.40) + 10 videos (~$1.50) + previews/audio (~$0.60).

Agency v2 max COGS breakdown: 30 campaigns (~$16.50) + 60 regens (~$7.20) + 20 videos (~$3.00) + previews/audio (~$5.00).

Margins exclude Vercel, Supabase, support, and RevenueCat (negligible at low MTR). Target **≥50% gross margin on net revenue even at heavy use** on IAP.

### v2 — typical (~40% utilization)

| Tier | Est. COGS | Web margin | IAP margin @ 30% |
|------|-----------|------------|------------------|
| Creator | ~$4.00 | ~83% | ~81% |
| Agency | ~$13.00 | ~83% | ~81% |

### v1 — why we’re changing (reference)

At v1 prices, Creator max COGS (~$13.25) ≈ IAP net (~$13.30) → break-even on heavy app subscribers. Agency max COGS (~$47) > IAP net (~$34.30) → **loss** at max use. Not acceptable for a sustainable model.

---

## Stripe price change runbook

Stripe **Prices are immutable** — you cannot edit $19 → $24 on an existing Price. Create new Prices and point env vars at them.

### 1. Create new Prices in Stripe Dashboard

1. Open [Stripe Dashboard → Products](https://dashboard.stripe.com/products).
2. Open **SlidePress Creator** (or create the product if missing).
3. Click **Add another price**:
   - **Pricing model:** Standard
   - **Price:** `$24.00` USD
   - **Billing period:** Monthly
   - Save and copy the new Price ID (`price_…`).
4. Repeat for **SlidePress Agency Pro** at **$79.00** USD monthly.
5. (Optional) Open each old $19 / $49 Price → **Archive** so it cannot be used for new checkouts.

### 2. Update Vercel environment variables

In **Vercel → Project → Settings → Environment Variables** (Production + Preview):

```bash
STRIPE_PRICE_CREATOR=price_xxxxxxxx   # new $24/mo ID
STRIPE_PRICE_AGENCY=price_xxxxxxxx    # new $79/mo ID
```

Redeploy after saving.

### 3. Customer Portal (plan switches)

The app auto-creates a portal config from the Price IDs in env (`utils/stripe.ts`). After updating env:

- **Option A:** Unset `STRIPE_PORTAL_CONFIGURATION_ID` (if set) and let the app create a fresh config on next portal open, **or**
- **Option B:** In Dashboard → **Settings → Billing → Customer portal**, edit the SlidePress configuration to list only the new $24 / $79 prices under subscription updates.

### 4. Existing subscribers

Customers on old $19 / $49 Prices **keep that rate** until they cancel or switch. To move everyone to v2:

- Use Stripe Dashboard → subscription → **Update subscription** → new Price, **or**
- Email users and ask them to re-subscribe via Settings → Usage.

### 5. Smoke test

1. Stripe **Test mode**: create $24 / $79 test Prices, set test env vars.
2. Settings → Usage → Upgrade to Creator → confirm Checkout shows **$24.00**.
3. Complete test payment → confirm `usage_balances` shows **10 / 20 / 10** credits.
4. **Manage subscription** → portal loads and shows new prices.

---

## v2 implementation checklist

### Billing & caps

- [x] Update `utils/plan-limits.ts` to v2 caps
- [x] Migration: `apply_tier_entitlement()` CASE values match v2
- [ ] Apply migration `20260623000001_tier_entitlement_v2.sql` in Supabase
- [ ] Stripe: new Price IDs ($24 / $79) + Vercel env
- [x] `usage-settings.tsx` plan copy and prices (web vs IAP)
- [ ] RevenueCat products ($29.99 / $99.99) when mobile billing ships

### Platform gating

- [x] `maxPlatformConnections` per tier in `plan-limits.ts`
- [x] Guard connect routes + OAuth callbacks
- [x] Guard publish routes (YouTube, TikTok, Instagram reel + carousel)
- [x] Guard publish-authorize / upload-authorize routes
- [x] Connected accounts UI: locked cards + upgrade CTA on free (Phase 2)
- [x] Downgrade webhook: 7-day grace + auto-revoke extras (Phase 4)
- [ ] Apply migration `20260624000001_platform_connection_grace.sql` in Supabase

### QA

- [ ] New signup → free defaults (3 / 10 / 0 / 5 / 0)
- [ ] Free: 2nd platform connect blocked
- [ ] Free: 4th campaign blocked with upsell
- [ ] Stripe upgrade Creator → v2 credits (10 / 20 / 10)
- [ ] Stripe upgrade Agency → v2 credits (30 / 60 / 20)
- [ ] Checkout shows $24 / $79 (not legacy $19 / $49)
- [ ] Cancel subscription → free tier + connection grace handling
- [ ] Brand limits: 1 / 3 / 15 per tier
- [ ] Period reset refills paid credits (hard reset, not additive)
- [ ] Video: dual aspect = 2 credits (document in UI)
- [ ] Webhook idempotency (replay same event)
- [ ] Cross-platform: web subscription visible in native app

---

## Implementation phases (Epic #14)

| Sprint | Scope | Exit criteria |
|--------|-------|---------------|
| **A** | Schema + limits refactor | Free tier enforces 3 lifetime campaigns |
| **B** | Stripe web | Test card upgrades to Creator |
| **C** | Brand gating + platform connection caps (v2) | Brand + connection caps enforced |
| **D** | Video credits | Blocked on free; decrement on export |
| **E** | RevenueCat mobile | Sandbox IAP at v2 IAP prices |
| **F** | QA + launch docs | Full v2 test matrix passes |

### Sub-issues (Epic #14)

| # | Issue | Sprint |
|---|-------|--------|
| 15 | usage_balances schema + signup trigger | A |
| 16 | tier config + refactor usage-limits.ts | A |
| 24 | monthly credit refill job | A |
| 18 | Stripe Checkout + webhooks | B |
| 19 | Settings upgrade UI (web) | B |
| 17 | brand count tier gating | C |
| — | platform connection tier gating (v2) | C |
| 20 | block video features on free tier | C |
| 21 | video export credit decrement | D |
| 22 | RevenueCat SDK + mobile paywall | E |
| 23 | App Store + Play subscription setup | E |
| 25 | QA checklist + launch docs | F |

[Epic #14 — Billing & Usage Tiers](https://github.com/reytek1201/SlidePress.co/issues/14)

---

## Future: Studio tier (H2 2026)

Revisit after ~3 months of `usage_events` + conversion data. Candidates:

| Studio (~$129/mo web / ~$149 IAP) | Possible entitlements |
|-------------------------------------|----------------------|
| Campaigns | 60–80 / month |
| Videos | 40–50 / month |
| Brands | 30 |
| Extras | custom voice, priority render, team seats |

---

*Last updated: June 2026 — v2 draft*
