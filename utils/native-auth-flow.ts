import type { Provider } from "@supabase/supabase-js";
import { Browser } from "@capacitor/browser";
import { buildNativeOAuthRedirectUrl } from "@/utils/native-oauth";
import { setNativeOAuthInProgress } from "@/utils/native-oauth-in-progress";
import { createNativeAuthClient } from "@/utils/supabase/native-auth-client";

export async function startNativeProviderAuth(
  provider: Provider,
  nextPath: string,
): Promise<{ error: string | null }> {
  const redirectTo = buildNativeOAuthRedirectUrl(nextPath);
  const nativeSupabase = createNativeAuthClient();

  const { data, error } = await nativeSupabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      ...(provider === "apple" ? { scopes: "name email" } : {}),
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data?.url) {
    setNativeOAuthInProgress(true);
    try {
      await Browser.open({ url: data.url });
    } catch (browserError) {
      setNativeOAuthInProgress(false);
      const message =
        browserError instanceof Error
          ? browserError.message
          : "Could not open the sign-in browser";
      return { error: message };
    }
  }

  return { error: null };
}

export function buildWebOAuthRedirectUrl(nextPath: string): string {
  const callbackUrl = `${window.location.origin}/auth/callback`;

  if (nextPath !== "/campaigns") {
    return `${callbackUrl}?next=${encodeURIComponent(nextPath)}`;
  }

  return callbackUrl;
}
