import {
  getYouTubeConnectionRow,
  upsertYouTubeConnection,
} from "@/utils/youtube/connection-store";
import { exchangeYouTubeCode, fetchYouTubeChannel } from "@/utils/youtube/oauth";
import { verifyYouTubeOAuthState } from "@/utils/youtube/oauth-state";
import {
  buildOAuthErrorRedirect,
  buildOAuthSuccessRedirect,
} from "@/utils/platforms/oauth-return";
import { hasYouTubeUploadScope } from "@/utils/platforms/scopes";
import { createClient } from "@/utils/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");
  const oauthErrorDescription = searchParams.get("error_description");

  let oauthState;

  try {
    oauthState = state ? verifyYouTubeOAuthState(state) : null;
  } catch {
    oauthState = null;
  }

  const returnTo = oauthState?.returnTo;
  const intent = oauthState?.intent ?? "connect";

  if (oauthError) {
    const reason = oauthErrorDescription
      ? `denied:${oauthErrorDescription}`
      : "denied";

    return NextResponse.redirect(
      buildOAuthErrorRedirect({
        platform: "youtube",
        reason,
        returnTo,
      }),
    );
  }

  if (!code || !state || !oauthState) {
    return NextResponse.redirect(
      buildOAuthErrorRedirect({
        platform: "youtube",
        reason: !oauthState ? "state" : "missing_code",
        returnTo,
      }),
    );
  }

  const userId = oauthState.userId;

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!authError && user && user.id !== userId) {
      return NextResponse.redirect(
        buildOAuthErrorRedirect({
          platform: "youtube",
          reason: "session_mismatch",
          returnTo,
        }),
      );
    }

    const tokens = await exchangeYouTubeCode(code);
    const channel = await fetchYouTubeChannel(tokens.access_token);
    const existing = await getYouTubeConnectionRow(userId);

    await upsertYouTubeConnection({
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresInSeconds: tokens.expires_in,
      channel,
      scopes: tokens.scope,
      existingRefreshToken: existing?.refresh_token,
      existingScopes: existing?.scopes,
    });

    let saved = await getYouTubeConnectionRow(userId);

    if (intent === "publish" && !hasYouTubeUploadScope(saved?.scopes ?? tokens.scope)) {
      return NextResponse.redirect(
        buildOAuthErrorRedirect({
          platform: "youtube",
          reason: "scope",
          returnTo,
        }),
      );
    }

    return NextResponse.redirect(
      buildOAuthSuccessRedirect({
        platform: "youtube",
        intent,
        returnTo,
      }),
    );
  } catch (error) {
    console.error("YouTube OAuth callback error:", error);

    const message = error instanceof Error ? error.message.toLowerCase() : "";

    if (message.includes("platform_connections") || message.includes("relation")) {
      return NextResponse.redirect(
        buildOAuthErrorRedirect({
          platform: "youtube",
          reason: "database",
          returnTo,
        }),
      );
    }

    if (message.includes("channel")) {
      return NextResponse.redirect(
        buildOAuthErrorRedirect({
          platform: "youtube",
          reason: "channel",
          returnTo,
        }),
      );
    }

    if (message.includes("token") || message.includes("oauth")) {
      return NextResponse.redirect(
        buildOAuthErrorRedirect({
          platform: "youtube",
          reason: "token",
          returnTo,
        }),
      );
    }

    return NextResponse.redirect(
      buildOAuthErrorRedirect({
        platform: "youtube",
        reason: "unknown",
        returnTo,
      }),
    );
  }
}
