# Notifications & Widgets Roadmap

**Mobile engagement** — push alerts when async work finishes, and home-screen widgets for ambient campaign status.

---

## GitHub epics

| Epic | Track | Issue | Status |
|------|--------|-------|--------|
| **Push notifications & async alerts** | Native push when pipelines complete | [#35](https://github.com/reytek1201/SlidePress.co/issues/35) | ✅ Shipped |
| **Home screen widgets** | WidgetKit / Jetpack Glance glance + continue | [#36](https://github.com/reytek1201/SlidePress.co/issues/36) | ✅ Shipped |

---

## Push notifications ([#35](https://github.com/reytek1201/SlidePress.co/issues/35))

Notifications are **optional** (not an App Store requirement) but high value for an async creative workflow. **Native app only** — web has no push today.

### Shipped

| Item | Detail |
|------|--------|
| Opt-in toggle | Settings → Notifications — “Campaign ready alerts” |
| Trigger | All slide images finish; **draft ready** (images + captions); video export completes; **YouTube/TikTok/Instagram publish succeeds or fails** |
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

Widgets show campaign status **before** the user opens the app. Push **pulls** them back when work completes. Both tracks share campaign status logic from `utils/campaign-status-display.ts` and `utils/campaign-progress.ts`.

Capacitor has **no widget plugin** — native **WidgetKit** (iOS) and **Jetpack Glance** (Android) extensions with a thin `NativeWidget` Capacitor bridge.

### Shipped

| Phase | Scope | Issue | Status |
|-------|--------|-------|--------|
| 0 | Snapshot contract + shared storage write path | [#39](https://github.com/reytek1201/SlidePress.co/issues/39) | ✅ Shipped |
| 1 | iOS Continue campaign widget (WidgetKit small/medium) | [#40](https://github.com/reytek1201/SlidePress.co/issues/40) | ✅ Shipped |
| 2 | Android Continue campaign widget (Glance, resizable) | [#42](https://github.com/reytek1201/SlidePress.co/issues/42) | ✅ Shipped |
| 3 | Quick Create shortcut widget (iOS + Android) | [#43](https://github.com/reytek1201/SlidePress.co/issues/43) | ✅ Shipped |

### Widget types (v1)

| Widget | Platforms | Sizes | Tap action |
|--------|-----------|-------|------------|
| **Continue Campaign** | iOS, Android | Small + medium (journey strip on medium/wide) | `co.slidepress.app://campaign/{id}` or `?tab=publish` |
| **New Campaign** | iOS, Android | Small shortcut | `co.slidepress.app://new` |

### Snapshot & sync

| Layer | Path |
|-------|------|
| Type | `types/widget-snapshot.ts` (`schemaVersion: 1`) |
| Client builder | `utils/widget-snapshot.ts` |
| Server builder | `utils/widget-snapshot-server.ts` |
| API | `GET /api/widget/snapshot` |
| Capacitor bridge | `utils/native-widget-plugin.ts` → `NativeWidget` plugin |
| iOS storage | App Group `group.co.slidepress.app` |
| Android storage | `SharedPreferences` (`co.slidepress.app.widgets`) |

**Sync triggers:** app launch / sign-in / resume; campaign workspace live updates; campaigns list mount; pull-to-refresh; push payloads with embedded `widgetSnapshot`; Settings → Widgets → “Refresh widget now”. Android also syncs on app resume via native `WidgetBridgeSync` (fetches snapshot through WebView session).

**Setup UI:** Settings → Widgets (`/settings/widgets`) — platform-specific add-to-home-screen instructions.

### Example widget content

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

Multiple campaigns per widget, live thumbnails, posting from widget without opening app, watchOS / lock screen complications

---

## Related docs

- [`docs/capacitor.md`](capacitor.md) — push + widgets native setup
- [`docs/beta-release.md`](beta-release.md) — optional APNs/FCM setup for TestFlight
- [`docs/client-features.md`](client-features.md) — product roadmap index
