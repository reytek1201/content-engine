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

## ### Why Android needs a native rebuild for OAuth

The native auth client stores the PKCE verifier in **localStorage** (survives Chrome Custom Tab). Android also uses a full page navigation after sign-in so session cookies reach the server. Rebuild after pulling:

```bash
npm run cap:sync
npm run cap:android
```

Google sign-in (native app)

Google blocks OAuth inside embedded WebViews. The native app uses the system browser and a deep link back into the app.

**Flow:**
1. Tap **Continue with Google** → opens Safari / Chrome Custom Tab
2. After Google + Supabase auth → redirects to `co.slidepress.app://auth/callback?code=...`
3. App catches the deep link → loads `https://www.slidepress.co/auth/callback?code=...` in the WebView
4. Session cookies are set → user lands in the app

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

---

## Phase 5 roadmap

| Step | Status |
|------|--------|
| **5.1 Scaffold** | ✅ This setup |
| **5.2 Auth** | Google OAuth via deep link + system browser ✅; Sign in with Apple (iOS) |
| **5.3 App shell** | Icons + splash (`npm run cap:assets`), status bar |
| **5.4 Native affordances** | Share sheet, save to camera roll |
| **5.5 Beta** | TestFlight, Play internal testing |

See `docs/client-features.md` for full product roadmap.
