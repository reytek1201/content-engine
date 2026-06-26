# Claude Project setup — SlidePress

Use this guide to configure a **Claude.ai Project** for planning, architecture, and docs — then implement in **Cursor**.

*Last updated: June 25, 2026*

---

## 1. Create the Project

1. Go to [claude.ai](https://claude.ai) → **Projects** → **New project**
2. Name: **SlidePress**
3. Paste the **Project instructions** below into **Set project instructions**
4. Upload the **knowledge files** listed in [Upload checklist](#upload-checklist)

Re-upload or refresh files when you make major doc changes on `main`.

---

## 2. Project instructions (paste this)

```
You are a senior product + engineering advisor for SlidePress (slidepress.co) — a marketing automation SaaS built by a solo founder.

## Product
SlidePress turns a topic into social campaigns: AI slide copy with on-image headlines, voiceover scripts, Fal-generated images, platform captions, ElevenLabs narration, MP4 video export, and direct posting to YouTube Shorts, TikTok, and Instagram (Reels + carousel). Native iOS/Android via Capacitor loading the Vercel-hosted Next.js app.

## Stack
- Next.js App Router, React 19, Tailwind (dark UI)
- Supabase (auth, Postgres, RLS, Realtime, Storage)
- Google Gemini (text, captions, URL ingest)
- Fal.ai (images + video compose)
- ElevenLabs (TTS)
- Stripe (web billing) + RevenueCat (mobile IAP)
- Vercel hosting; Capacitor 8 mobile shell

## How to respond
- Be concise and actionable. Prefer checklists and tradeoffs over long prose.
- Assume the founder implements code in Cursor — do not write full file implementations unless asked.
- Match project conventions: Zod validation, bulk Supabase inserts, server-side billing guards, no manual React memoization (React Compiler enabled).
- When suggesting schema or API changes, name affected tables/routes and migration needs.
- Flag platform audit blockers (Google OAuth, Meta App Review, TikTok audit) when discussing direct posting for public users.

## Current focus (June 2026)
- v2 billing live (Stripe + IAP); QA matrix in progress
- Platform posting code shipped; external audits pending
- Website URL ingest Phase A shipped; Phase B planned
- App Store 1.0 draft ready; submit after audits + QA

## Docs in this Project
Use uploaded knowledge files as source of truth. If something conflicts, prefer launch-status.md for ops status and client-features.md for product behavior.
```

---

## 3. Upload checklist

### Tier 1 — Upload first (essential)

| File | Why |
|------|-----|
| [`architecture.md`](architecture.md) | Repo map, routes, stack, conventions |
| [`client-features.md`](client-features.md) | Full product spec and roadmap |
| [`launch-status.md`](launch-status.md) | What's done, blockers, next phases |

### Tier 2 — Upload when working in that area

| File | Why |
|------|-----|
| [`billing.md`](billing.md) | Tiers, credits, Stripe/RevenueCat |
| [`tts-runbook.md`](tts-runbook.md) | ElevenLabs, voice personas, export APIs |
| [`capacitor.md`](capacitor.md) | Native build, auth, push, widgets |
| [`platform-posting.md`](platform-posting.md) | OAuth + publish architecture |
| [`beta-release.md`](beta-release.md) | TestFlight / Play checklist |

### Tier 3 — Reference / ops (optional)

| File | Why |
|------|-----|
| [`youtube-phase3-runbook.md`](youtube-phase3-runbook.md) | Google OAuth verification |
| [`instagram-phase3-runbook.md`](instagram-phase3-runbook.md) | Meta App Review |
| [`app-store-review-notes.md`](app-store-review-notes.md) | Store review copy (contains reviewer credentials — **do not share publicly**) |
| [`notifications-widgets-roadmap.md`](notifications-widgets-roadmap.md) | Push + widgets (shipped) |

### Do not upload

- `.env`, `.env.local`, API keys, Stripe/RevenueCat secrets
- `app-store-review-notes.md` if sharing the Project with others (contains demo account password)

---

## 4. Daily workflow (Claude + Cursor)

```
Plan in Claude  →  Implement in Cursor  →  Update docs  →  Re-upload to Claude if needed
```

| Step | Tool | Example |
|------|------|---------|
| Architecture / "should we?" | Claude Project | "How should confident persona propagate to exports?" |
| Implementation | Cursor Agent | "Implement per plan; follow .cursor/rules" |
| Code review | Claude (paste diff) or Cursor Ask | "Review this migration for RLS gaps" |
| Docs / runbooks | Claude → commit in Cursor | Draft TTS runbook section, save to `docs/` |

**Cursor** has live repo access (`.cursor/rules/`, `@file`, terminal). **Claude Project** has uploaded docs only — paste code/errors when debugging.

---

## 5. Keeping context in sync

After significant changes:

1. Update the relevant `docs/*.md` file
2. Bump *Last updated* date in that file
3. Re-upload changed files to the Claude Project (or replace in Project knowledge)

Priority files to keep fresh:

- `launch-status.md` — after store/billing/audit milestones
- `client-features.md` — after shipping user-facing features
- `architecture.md` — after new subsystems or route patterns
- `billing.md` — after tier/cap changes

---

## 6. Cursor rules (separate from Claude)

Cursor loads rules from `.cursor/rules/*.mdc` automatically. No upload needed.

| File | Applies |
|------|---------|
| `slidepress-core.mdc` | Every session |
| `nextjs-api.mdc` | When editing API routes |
| `react-ui.mdc` | When editing components |
| `supabase-data.mdc` | When editing Supabase/migrations |

Legacy `cursorrules` at repo root is deprecated — kept only as a short pointer.

---

## 7. Example Claude prompts

**Planning:**
> I'm adding a fifth voice persona. What tables, env vars, API routes, and UI components need to change? Give a ordered checklist, no full code.

**Review:**
> Here's a Zod schema and migration for platform_captions realtime. Any RLS or backfill risks?

**Product:**
> Write App Store subtitle + 3 bullet features for video export, under 400 chars total.

**Ops:**
> From launch-status.md, what are the top 3 unblocked tasks I can do this week?

---

## Doc index

Full list: [`README.md`](README.md)
