import { registerPlugin } from "@capacitor/core";
import { Capacitor } from "@capacitor/core";
import { createClient } from "@/utils/supabase/client";
import { applyNativeAuthTokens } from "@/utils/native-oauth-session";
import { createNativeAuthClient } from "@/utils/supabase/native-auth-client";

const APP_BUNDLE_ID = "co.slidepress.app";

const SignInWithApple = registerPlugin<{
  authorize(options: {
    clientId: string;
    redirectURI: string;
    scopes?: string;
    state?: string;
    nonce?: string;
  }): Promise<{
    response: {
      user: string | null;
      email: string | null;
      givenName: string | null;
      familyName: string | null;
      identityToken: string;
      authorizationCode: string;
    };
  }>;
}>("SignInWithApple");

async function generateAppleNonce(): Promise<{ raw: string; hashed: string }> {
  const raw = crypto.randomUUID();
  const data = new TextEncoder().encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashed = Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return { raw, hashed };
}

export async function startNativeAppleAuth(): Promise<{ error: string | null }> {
  if (Capacitor.getPlatform() !== "ios") {
    return { error: "Apple sign-in is only available on iOS." };
  }

  if (!Capacitor.isPluginAvailable("SignInWithApple")) {
    return {
      error:
        "Apple sign-in is not available in this build. Run npm run cap:sync, rebuild in Xcode, and reinstall the app.",
    };
  }

  try {
    const { raw: rawNonce, hashed: hashedNonce } = await generateAppleNonce();

    const result = await SignInWithApple.authorize({
      clientId: APP_BUNDLE_ID,
      redirectURI: "https://www.slidepress.co/login",
      scopes: "email name",
      state: crypto.randomUUID(),
      nonce: hashedNonce,
    });

    const identityToken = result.response.identityToken;
    if (!identityToken) {
      return { error: "Apple did not return a sign-in token." };
    }

    const nativeSupabase = createNativeAuthClient();
    const { data, error } = await nativeSupabase.auth.signInWithIdToken({
      provider: "apple",
      token: identityToken,
      nonce: rawNonce,
    });

    if (error) {
      return { error: error.message };
    }

    if (!data.session) {
      return { error: "No session returned after Apple sign-in." };
    }

    const syncResult = await applyNativeAuthTokens(
      data.session.access_token,
      data.session.refresh_token,
    );

    if (syncResult.error) {
      return syncResult;
    }

    const { givenName, familyName } = result.response;
    if (givenName || familyName) {
      const browserSupabase = createClient();
      const fullName = [givenName, familyName].filter(Boolean).join(" ");

      await browserSupabase.auth.updateUser({
        data: {
          full_name: fullName,
          ...(givenName ? { given_name: givenName } : {}),
          ...(familyName ? { family_name: familyName } : {}),
        },
      });
    }

    return { error: null };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Apple sign-in failed.";

    if (message.toLowerCase().includes("cancel")) {
      return { error: null };
    }

    return { error: message };
  }
}
