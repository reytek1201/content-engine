import { createClient } from "@/utils/supabase/client";
import { createNativeAuthClient } from "@/utils/supabase/native-auth-client";
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

  const browserSupabase = createClient();
  const { error: setSessionError } = await browserSupabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });

  if (setSessionError) {
    return { error: setSessionError.message };
  }

  await browserSupabase.auth.getSession();

  return { error: null };
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
