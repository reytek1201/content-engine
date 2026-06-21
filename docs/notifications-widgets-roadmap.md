# Notifications & Widgets Roadmap

**Mobile engagement** — push alerts when async work finishes, and home-screen widgets for ambient campaign status.

---

## GitHub epics

| Epic | Track | Issue |
|------|--------|-------|
| **Push notifications & async alerts** | Native push when pipelines complete | [#35](https://github.com/reytek1201/SlidePress.co/issues/35) |
| **Home screen widgets** | WidgetKit / App Widgets glance + continue | [#36](https://github.com/reytek1201/SlidePress.co/issues/36) |

---

## Push notifications ([#35](https://github.com/reytek1201/SlidePress.co/issues/35))

Notifications are **optional** (not an App Store requirement) but high value for an async creative workflow. **Native app only** — web has no push today.

### Shipped

| Item | Detail |
|------|--------|
| Opt-in toggle | Settings → Notifications — “Campaign ready alerts” |
| Trigger | All slide images finish; video export completes; **YouTube/TikTok/Instagram publish succeeds or fails** |
| Deep link | Tap opens `/campaign/{id}` (images) or `?tab=publish` (video) |
| Infra | APNs + FCM, `push_device_tokens`, `maybeSendCampaignImagesReadyPush`, `maybeSendVideoExportReadyPush`, `maybeSendPlatformPublishPush` |
| Docs | [`docs/capacitor.md`](capacitor.md) → Push notifications |

### Roadmap

| Phase | Scope | Issue | Priority |
|-------|--------|-------|----------|
| 0 | Image-ready push | — | ✅ Shipped |
| 1 | Video export complete | [#41](https://github.com/reytek1201/SlidePress.co/issues/41) | ✅ Shipped |
| 2 | YouTube / TikTok / Instagram publish success & failure | [#37](https://github.com/reytek1201/SlidePress.co/issues/37) | ✅ Shipped |
| 3 | Granular notification preferences | [#38](https://github.com/reytek1201/SlidePress.co/issues/38) | ✅ Shipped |

### Principles

- **Master opt-in** on device; per-type toggles in `user_notification_preferences`
- Server-triggered; preference check before dedupe claim; actionable copy with campaign title
- Skip sends when APNs/FCM not configured (app still works)

### Out of scope

Web push, marketing/re-engagement pushes, email/SMS, rich media thumbnails in banners

---

## Home screen widgets ([#36](https://github.com/reytek1201/SlidePress.co/issues/36))

Widgets show status **before** the user opens the app. Push **pulls** them back when work completes. Both tracks share campaign status logic from `utils/campaign-status-display.ts` and `utils/campaign-progress.ts`.

Capacitor has **no widget plugin** — requires native Xcode / Android extensions.

### Roadmap

| Phase | Scope | Issue | Priority |
|-------|--------|-------|----------|
| 0 | Snapshot type + App Group / shared prefs write path | [#39](https://github.com/reytek1201/SlidePress.co/issues/39) | **Blocker** for all widget work |
| 1 | iOS Continue campaign widget (WidgetKit) | [#40](https://github.com/reytek1201/SlidePress.co/issues/40) | High |
| 2 | Android Continue campaign widget | [#42](https://github.com/reytek1201/SlidePress.co/issues/42) | High |
| 3 | Quick Create shortcut widget (no live data) | [#43](https://github.com/reytek1201/SlidePress.co/issues/43) | Low / optional |

### v1 widget content (target)

```
Summer Sale carousel
3/5 images · Next: Generate captions
```

When publish-ready:

```
Summer Sale carousel
Ready to publish →
```

### Out of scope (v1)

Multiple campaigns per widget, live thumbnails, posting from widget without opening app

---

## Suggested build order

1. **#39** → **#40** → **#42** — widgets (iOS first, then Android parity)
5. **#43** — shortcut widget if Continue widget proves useful

---

## Related docs

- [`docs/capacitor.md`](capacitor.md) — Phase 5.6 push (shipped)
- [`docs/beta-release.md`](beta-release.md) — optional APNs/FCM setup for TestFlight
- [`docs/client-features.md`](client-features.md) — product roadmap index
