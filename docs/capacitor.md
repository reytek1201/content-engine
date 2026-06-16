# SlidePress mobile (Capacitor)

Native iOS and Android shells that load the production web app in a WebView.

**Default URL:** `https://www.slidepress.co` (configured in `capacitor.config.ts`)

The Next.js app stays on Vercel — no static export. Capacitor opens the live site.

---

## Prerequisites

### iOS (Mac only)

- Xcode (from the Mac App Store)
- Apple ID (simulator); Apple Developer account for device / TestFlight

### Android

- [Android Studio](https://developer.android.com/studio)
- JDK 17 recommended for Gradle (Capacitor 8 / Android Gradle Plugin)

---

## npm scripts

| Command | Action |
|---------|--------|
| `npm run cap:assets` | Build `assets/` from `public/brand/logo.png` and generate iOS + Android icons/splash |
| `npm run cap:assets:ios` | Generate iOS icons and splash only |
| `npm run cap:assets:android` | Generate Android icons and splash only |
| `npm run cap:assets:prepare` | Regenerate source files in `assets/` only (no native output) |
| `npm run cap:sync` | Copy web assets + config into `ios/` and `android/` |
| `npm run cap:ios` | Open the iOS project in Xcode |
| `npm run cap:android` | Open the Android project in Android Studio |

After changing `capacitor.config.ts`, run **`npm run cap:sync`**.

---

## First run

```bash
npm run cap:sync
npm run cap:ios      # Xcode → pick a simulator → Run
# or
npm run cap:android  # Android Studio → sync Gradle → Run emulator
```

The app should load SlidePress from production and behave like mobile Safari/Chrome.

**Important:** The Capacitor shell loads the **live web app** (default: production). UI changes such as hiding the mobile top bar only appear after that code is deployed, **or** when you point the shell at a local dev server (see below).

After changing `capacitor.config.ts`, run **`npm run cap:sync`**, then rebuild in Xcode/Android Studio so the custom user agent (`SlidePressApp/1`) is applied for native detection.

**Top nav in the native app:** the web app hides the mobile top bar when it detects the Capacitor shell (`SlidePressApp/` user agent or `window.WEBVIEW_SERVER_URL`). Deploying to Vercel alone is not enough — you must **rebuild the native app** after `cap:sync` so the shell sends those signals. If you still see the bar in mobile Safari, that is expected (the hide only applies inside the Capacitor app).

**Marketing landing (`/`):** skipped in the native app — unauthenticated users are redirected to `/login` via the `SlidePressApp/` user agent. The marketing page remains the public web entry point.

---

## Local web dev (optional)

Point the shell at your local Next.js server:

```bash
CAPACITOR_SERVER_URL=http://localhost:3000 npm run cap:sync
npm run dev          # in another terminal
npm run cap:ios
```

Use your machine’s LAN IP instead of `localhost` for a physical device.

---

## Project layout

| Path | Purpose |
|------|---------|
| `capacitor.config.ts` | App id, name, server URL |
| `capacitor-www/` | Fallback assets when offline (minimal) |
| `ios/` | Xcode project |
| `android/` | Android Studio / Gradle project |

**App ID:** `co.slidepress.app`

---

## App icon and splash screen

Uses [`@capacitor/assets`](https://capacitorjs.com/docs/guides/splash-screens-and-icons). The package is installed as a dev dependency; the CLI binary is `capacitor-assets` (not a standalone `capacitor-assets` npm package).

**Do not run** `npx capacitor-assets` without installing `@capacitor/assets` first — that name is not published on npm. Use the npm scripts below or `npx @capacitor/assets generate`.

### One-command workflow

```bash
npm run cap:assets      # prepare source images + generate for iOS and Android
npm run cap:sync        # copy config into native projects
npm run cap:ios         # rebuild in Xcode
```

`cap:assets` reads `public/brand/logo.png`, writes masters into `assets/`, then generates all platform sizes into `ios/` and `android/`.

### Source image sizes (generated automatically)

| File | Size | Purpose |
|------|------|---------|
| `assets/icon-only.png` | 1024×1024 | App icon (logo on `#09090b`) |
| `assets/icon-foreground.png` | 1024×1024 | Android adaptive icon foreground |
| `assets/icon-background.png` | 1024×1024 | Android adaptive icon background |
| `assets/splash.png` | 2732×2732 | Splash screen |
| `assets/splash-dark.png` | 2732×2732 | Dark-mode splash |

After updating the brand logo, run `npm run cap:assets` again.

### Manual CLI (equivalent)

```bash
npm run cap:assets:prepare
npx @capacitor/assets generate --ios --android \
  --iconBackgroundColor '#09090b' \
  --iconBackgroundColorDark '#09090b' \
  --splashBackgroundColor '#09090b' \
  --splashBackgroundColorDark '#09090b'
```

Platform-specific: `npm run cap:assets:ios` or `npm run cap:assets:android`.

---

## Native auth (Google, Apple, password reset)

Google blocks OAuth inside embedded WebViews. The native app uses the system browser and a deep link back into the app.

The native auth client stores the PKCE verifier in **localStorage** (survives Chrome Custom Tab). Android uses a full page navigation after sign-in so session cookies reach the server.

**Sign-in flow:**
1. Tap **Continue with Google** → opens Safari / Chrome Custom Tab → deep link back to the app
2. Tap **Continue with Apple** (iOS only) → native Face ID / Apple ID sheet (no Safari)
3. After auth, navigates to campaigns

Google uses browser OAuth + deep link. Apple on iOS uses the native Sign in with Apple sheet and `signInWithIdToken` (bundle ID `co.slidepress.app`).

**Password reset flow:**
1. Forgot password email links to `co.slidepress.app://auth/callback` (native) with session tokens
2. App applies the session and opens **Settings** with a new-password form (`/settings?reset=1`)

### Supabase redirect URLs (required)

In **Supabase → Authentication → URL configuration → Redirect URLs**, add:

```
co.slidepress.app://auth/callback
co.slidepress.app://**
```

Keep the existing web callbacks (`https://www.slidepress.co/auth/callback`, `http://localhost:3000/auth/callback`).

### Native rebuild (required)

Deep link URL schemes are in `ios/App/App/Info.plist` and `android/app/src/main/AndroidManifest.xml`. After pulling these changes:

```bash
npm run cap:sync
npm run cap:ios    # clean build in Xcode
```

Google Cloud Console redirect URI stays **only** the Supabase callback (`https://<project>.supabase.co/auth/v1/callback`) — do not add the app scheme there.

### Sign in with Apple (required for iOS App Store)

Enable the **Apple** provider in **Supabase → Authentication → Providers**.

**Supabase Client IDs** (comma-separated):

```
co.slidepress.app,co.slidepress.app.auth
```

- `co.slidepress.app` — native iOS sign-in (`signInWithIdToken`)
- `co.slidepress.app.auth` — web OAuth if you add Apple on web later

**Secret Key** is only required for web OAuth (`co.slidepress.app.auth`). Native iOS does not use it.

In [Apple Developer](https://developer.apple.com/account/resources/identifiers/list):
1. **App ID** `co.slidepress.app` — enable Sign in with Apple
2. **Services ID** `co.slidepress.app.auth` — for web OAuth only (Return URL: `https://<project-ref>.supabase.co/auth/v1/callback`)
Native iOS uses a built-in Capacitor plugin (`NativeAppleSignInPlugin`) compiled into the App target — no third-party Apple Sign In package. After pulling:

```bash
npm run cap:sync
npm run cap:ios
```

Clean build in Xcode before testing on device.

The iOS app shows **Continue with Apple** only in the native shell (App Store requirement when Google is offered).

---

## Native shell & slide export (Phase 5.3–5.4)

**Status bar:** `NativeShell` configures the Capacitor status bar (dark background `#09090b`, light icons) on iOS and Android.

**Save / Share:** In the native app, slide cards and carousel preview show **Save to Photos** and **Share** instead of **Download image**. The sticky **Next step** bar offers **Save all to Photos** (primary export on mobile), **Copy all captions**, and **Download zip**. Images save to a **SlidePress** album when the OS allows. Uses `@capacitor-community/media` and `@capacitor/share`.

**iOS permission:** `NSPhotoLibraryAddUsageDescription` in `ios/App/App/Info.plist` (required for Save to Photos).

**Deploy note:** The shell loads the live web app. Deploy web changes to Vercel, then rebuild the native app after `npm run cap:sync` when adding new Capacitor plugins.

**Icons & splash:** Run `npm run cap:assets` before App Store / Play Store builds.

---

## Phase 5 roadmap

| Step | Status |
|------|--------|
| **5.1 Scaffold** | ✅ This setup |
| **5.2 Auth** | Google + Apple OAuth via deep link ✅; password reset deep links ✅ |
| **5.3 App shell** | Icons + splash (`npm run cap:assets`) ✅, status bar (SlidePress dark + orange) ✅ |
| **5.4 Native affordances** | Share sheet + Save to Photos (per slide, carousel, and **Save all to Photos** in next step bar) ✅ |
| **5.5 Beta** | TestFlight, Play internal testing |
| **5.6 Push** | FCM push when all campaign images finish generating ✅ |

See `docs/client-features.md` for full product roadmap.

### Push notifications (Phase 5.6)

Notify users in the **native app** when every slide image in a campaign is ready (app in background or closed).

**Client:** `@capacitor/push-notifications` registers device tokens after sign-in (`NativePushListener`). Tapping the notification opens the campaign workspace.

**Server:** When a campaign transitions to `completed`, `maybeSendCampaignImagesReadyPush` sends one FCM message per registered device (deduped via `campaigns.images_ready_notified_at`).

**Required (production push):**

1. Create a [Firebase](https://console.firebase.google.com/) project.
2. Add an **Android** app with package `co.slidepress.app` → download `google-services.json` → place in `android/app/` (gitignored; see `google-services.json.example`).
3. Add an **iOS** app with bundle `co.slidepress.app` → download `GoogleService-Info.plist` → place in `ios/App/` (gitignored; see `GoogleService-Info.plist.example`) → upload **APNs key**.
4. Create a **service account** with Firebase Cloud Messaging API access.
5. Set `FCM_SERVICE_ACCOUNT_JSON` on Vercel (base64-encoded service account JSON) **or** `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`.

**iOS Xcode:** Enable **Push Notifications** capability on the App target, then rebuild.

**Android:** Ensure `google-services.json` is present before release builds.

**Database:** Run migration `20260616000001_push_device_tokens.sql` (table `push_device_tokens`, column `campaigns.images_ready_notified_at`).

Push is **optional** — if FCM env vars are unset, the app still works; notifications are simply skipped server-side.

### Push test (development)

To test push **without generating images**:

1. Set `NEXT_PUBLIC_ALLOW_PUSH_TEST=true` on Vercel (or in `.env.local` for local dev).
2. Redeploy.
3. Open the **native app** → **Settings** → **Send test push**.
4. Background the app to see the notification banner.

Remove or disable `NEXT_PUBLIC_ALLOW_PUSH_TEST` when you are done testing.
