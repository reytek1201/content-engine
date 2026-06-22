import { getAppUrl } from "@/utils/stripe";
import { createClient } from "@/utils/supabase/server";
import {
  buildYouTubeUploadAuthUrl,
  getYouTubeOAuthConfig,
} from "@/utils/youtube/oauth";
import { createYouTubeOAuthState } from "@/utils/youtube/oauth-state";
import { buildOAuthErrorRedirect } from "@/utils/platforms/oauth-return";
import { assertPlatformConnectAllowed } from "@/utils/platform-connection-limits";
import { isUsageLimitError } from "@/utils/usage-limits";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get("returnTo");

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(
        new URL("/login?next=/settings/connected-accounts", getAppUrl()),
      );
    }

    getYouTubeOAuthConfig();

    await assertPlatformConnectAllowed(user.id, "youtube");

    const state = createYouTubeOAuthState(user.id, {
      returnTo,
      intent: "publish",
    });
    const authUrl = buildYouTubeUploadAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    if (isUsageLimitError(error)) {
      return NextResponse.redirect(
        buildOAuthErrorRedirect({
          platform: "youtube",
          reason: "platform_limit",
          returnTo: returnTo ?? undefined,
        }),
      );
    }

    console.error("YouTube upload authorize error:", error);

    return NextResponse.redirect(
      buildOAuthErrorRedirect({
        platform: "youtube",
        reason: "connect",
        returnTo: returnTo ?? undefined,
      }),
    );
  }
}
