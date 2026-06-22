import {
  getInstagramConnectionRow,
  upsertInstagramConnection,
} from "@/utils/instagram/connection-store";
import {
  exchangeInstagramCode,
  fetchGrantedInstagramScopes,
  fetchInstagramBusinessAccount,
} from "@/utils/instagram/oauth";
import { verifyInstagramOAuthState } from "@/utils/instagram/oauth-state";
import {
  buildOAuthErrorRedirect,
  buildOAuthSuccessRedirect,
} from "@/utils/platforms/oauth-return";
import { hasInstagramPublishScope } from "@/utils/platforms/scopes";
import { assertPlatformConnectAllowed } from "@/utils/platform-connection-limits";
import { isUsageLimitError } from "@/utils/usage-limits";
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
    oauthState = state ? verifyInstagramOAuthState(state) : null;
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
        platform: "instagram",
        reason,
        returnTo,
      }),
    );
  }

  if (!code || !state || !oauthState) {
    return NextResponse.redirect(
      buildOAuthErrorRedirect({
        platform: "instagram",
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
          platform: "instagram",
          reason: "session_mismatch",
          returnTo,
        }),
      );
    }

    const tokens = await exchangeInstagramCode(code);
    const account = await fetchInstagramBusinessAccount(tokens.access_token);
    const scopes =
      (await fetchGrantedInstagramScopes(tokens.access_token)) ?? null;
    const existing = await getInstagramConnectionRow(userId);

    await assertPlatformConnectAllowed(userId, "instagram");

    await upsertInstagramConnection({
      userId,
      accessToken: tokens.access_token,
      expiresInSeconds: tokens.expires_in,
      account,
      scopes,
      existingScopes: existing?.scopes,
    });

    const saved = await getInstagramConnectionRow(userId);

    if (
      intent === "publish" &&
      !hasInstagramPublishScope(saved?.scopes ?? scopes)
    ) {
      return NextResponse.redirect(
        buildOAuthErrorRedirect({
          platform: "instagram",
          reason: "scope",
          returnTo,
        }),
      );
    }

    return NextResponse.redirect(
      buildOAuthSuccessRedirect({
        platform: "instagram",
        intent,
        returnTo,
      }),
    );
  } catch (error) {
    if (isUsageLimitError(error)) {
      return NextResponse.redirect(
        buildOAuthErrorRedirect({
          platform: "instagram",
          reason: "platform_limit",
          returnTo,
        }),
      );
    }

    console.error("Instagram OAuth callback error:", error);

    const message = error instanceof Error ? error.message.toLowerCase() : "";

    if (message.includes("platform_connections") || message.includes("relation")) {
      return NextResponse.redirect(
        buildOAuthErrorRedirect({
          platform: "instagram",
          reason: "database",
          returnTo,
        }),
      );
    }

    if (
      message.includes("instagram professional") ||
      message.includes("facebook page") ||
      message.includes("no instagram")
    ) {
      return NextResponse.redirect(
        buildOAuthErrorRedirect({
          platform: "instagram",
          reason: "account",
          returnTo,
        }),
      );
    }

    if (message.includes("token") || message.includes("oauth")) {
      return NextResponse.redirect(
        buildOAuthErrorRedirect({
          platform: "instagram",
          reason: "token",
          returnTo,
        }),
      );
    }

    return NextResponse.redirect(
      buildOAuthErrorRedirect({
        platform: "instagram",
        reason: "unknown",
        returnTo,
      }),
    );
  }
}
