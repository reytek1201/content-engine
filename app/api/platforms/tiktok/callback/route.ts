import {
  ensureFreshTikTokAccessToken,
  getTikTokConnectionRow,
  upsertTikTokConnection,
} from "@/utils/tiktok/connection-store";
import {
  exchangeTikTokCode,
  fetchTikTokUserInfo,
} from "@/utils/tiktok/oauth";
import { verifyTikTokOAuthState } from "@/utils/tiktok/oauth-state";
import { getAppUrl } from "@/utils/stripe";
import { createClient } from "@/utils/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

function redirectToSettings(query: string): NextResponse {
  return NextResponse.redirect(`${getAppUrl()}/settings/connected-accounts?${query}`);
}

function redirectWithError(reason: string): NextResponse {
  return redirectToSettings(`tiktok=error&reason=${encodeURIComponent(reason)}`);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");
  const oauthErrorDescription = searchParams.get("error_description");

  if (oauthError) {
    const detail = oauthErrorDescription
      ? `tiktok=denied&reason=${encodeURIComponent(oauthErrorDescription)}`
      : "tiktok=denied";
    return redirectToSettings(detail);
  }

  if (!code || !state) {
    return redirectWithError("missing_code");
  }

  let userId: string;

  try {
    userId = verifyTikTokOAuthState(state);
  } catch (error) {
    console.error("TikTok OAuth state verification failed:", error);
    return redirectWithError("state");
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!authError && user && user.id !== userId) {
      return redirectWithError("session_mismatch");
    }

    const tokens = await exchangeTikTokCode(code);
    const profile = await fetchTikTokUserInfo(tokens.access_token);
    const existing = await getTikTokConnectionRow(userId);

    await upsertTikTokConnection({
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresInSeconds: tokens.expires_in,
      user: profile,
      existingRefreshToken: existing?.refresh_token,
    });

    const saved = await getTikTokConnectionRow(userId);

    if (saved) {
      await ensureFreshTikTokAccessToken(saved);
    }

    return redirectToSettings("tiktok=connected");
  } catch (error) {
    console.error("TikTok OAuth callback error:", error);

    const message = error instanceof Error ? error.message.toLowerCase() : "";

    if (message.includes("platform_connections") || message.includes("relation")) {
      return redirectWithError("database");
    }

    if (message.includes("tiktok account") || message.includes("user")) {
      return redirectWithError("account");
    }

    if (message.includes("token") || message.includes("oauth")) {
      return redirectWithError("token");
    }

    return redirectWithError("unknown");
  }
}
