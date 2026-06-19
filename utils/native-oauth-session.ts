import { createClient } from "@/utils/supabase/client";
import { createNativeAuthClient } from "@/utils/supabase/native-auth-client";
import { isBiometricLockEnabled } from "@/utils/biometric-session";
import { storeRefreshToken } from "@/utils/secure-token-store";
import type { NativeAuthCallback } from "@/utils/native-oauth";
import { Capacitor } from "@capacitor/core";

async function persistNativeServerSession(tokens: {
  access_token: string;
  refresh_token: string;
}): Promise<{ error: string | null }> {
  const response = await fetch("/api/auth/native-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(tokens),
  });

  const data = (await response.json().catch(() => null)) as {
    success?: boolean;
    error?: string;
  } | null;

  if (!response.ok || !data?.success) {
    return {
      error: data?.error ?? "Failed to establish server session",
    };
  }

  return { error: null };
}

export async function exchangeNativeOAuthCode(
  code: string,
): Promise<{ error: string | null }> {
  const nativeSupabase = createNativeAuthClient();
  const { data, error } = await nativeSupabase.auth.exchangeCodeForSession(code);

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    return { error: "No session returned after OAuth." };
  }

  return syncBrowserSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
}

export async function applyNativeAuthTokens(
  accessToken: string,
  refreshToken: string,
): Promise<{ error: string | null }> {
  return syncBrowserSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
}

async function syncBrowserSession(tokens: {
  access_token: string;
  refresh_token: string;
}): Promise<{ error: string | null }> {
  if (Capacitor.isNativePlatform()) {
    const serverResult = await persistNativeServerSession(tokens);
    if (serverResult.error) {
      return serverResult;
    }
  }

  const browserSupabase = createClient();
  const { error: setSessionError } = await browserSupabase.auth.setSession(tokens);

  if (setSessionError) {
    return { error: setSessionError.message };
  }

  const {
    data: { user },
    error: userError,
  } = await browserSupabase.auth.getUser();

  if (userError || !user) {
    return { error: userError?.message ?? "Session was not established." };
  }

  // Re-stash the new refresh token if biometric lock is enabled. This keeps
  // the Keychain vault current after an OAuth sign-in (covers the
  // session-expired re-login path and routine token rotation).
  if (isBiometricLockEnabled()) {
    void storeRefreshToken(tokens.refresh_token);
  }

  return { error: null };
}

export async function completeNativeAuthCallback(
  callback: NativeAuthCallback,
): Promise<{ error: string | null; nextPath: string }> {
  if (callback.kind === "code") {
    const { error } = await exchangeNativeOAuthCode(callback.code);
    return { error, nextPath: callback.next };
  }

  const { error } = await applyNativeAuthTokens(
    callback.accessToken,
    callback.refreshToken,
  );

  return { error, nextPath: callback.next };
}

async function waitForServerSession(
  maxAttempts = 6,
  delayMs = 200,
): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    try {
      const response = await fetch("/api/auth/check", {
        credentials: "include",
        cache: "no-store",
      });
      if (response.ok) {
        const data = (await response.json()) as { authenticated?: boolean };
        if (data.authenticated) {
          return;
        }
      }
    } catch {
      // Network error — keep retrying
    }
  }
  // Timed out — navigate anyway; the page will redirect if needed.
}

export async function navigateAfterAuth(
  nextPath: string,
  navigate: (path: string) => void,
) {
  // On WKWebView (iOS), cookies from a fetch() response are not always
  // committed to the cookie store before the next navigation fires, even
  // when the fetch is fully awaited. Poll the server auth check endpoint
  // until the session is visible server-side, then navigate using the
  // Next.js router so the React app stays mounted (avoids re-processing
  // the deep link after a full-page reload).
  if (Capacitor.isNativePlatform()) {
    await waitForServerSession();
    navigate(nextPath);
    return;
  }

  navigate(nextPath);
}

export async function completeNativeOAuthNavigation(
  nextPath: string,
  navigate: (path: string) => void,
) {
  await navigateAfterAuth(nextPath, navigate);
}
