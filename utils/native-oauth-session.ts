import { createClient } from "@/utils/supabase/client";
import { createNativeAuthClient } from "@/utils/supabase/native-auth-client";
import type { NativeAuthCallback } from "@/utils/native-oauth";
import { Capacitor } from "@capacitor/core";

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
  const browserSupabase = createClient();
  const { error: setSessionError } = await browserSupabase.auth.setSession(tokens);

  if (setSessionError) {
    return { error: setSessionError.message };
  }

  await browserSupabase.auth.getSession();

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

export function completeNativeOAuthNavigation(
  nextPath: string,
  navigate: (path: string) => void,
) {
  if (Capacitor.getPlatform() === "android") {
    window.location.replace(nextPath);
    return;
  }

  navigate(nextPath);
}
