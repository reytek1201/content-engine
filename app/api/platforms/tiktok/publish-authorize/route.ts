import { getAppUrl } from "@/utils/stripe";
import { createClient } from "@/utils/supabase/server";
import {
  buildTikTokPublishAuthUrl,
  getTikTokOAuthConfig,
} from "@/utils/tiktok/oauth";
import { createTikTokOAuthState } from "@/utils/tiktok/oauth-state";
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

    getTikTokOAuthConfig();

    await assertPlatformConnectAllowed(user.id, "tiktok");

    const state = createTikTokOAuthState(user.id, {
      returnTo,
      intent: "publish",
    });
    const authUrl = buildTikTokPublishAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    if (isUsageLimitError(error)) {
      return NextResponse.redirect(
        buildOAuthErrorRedirect({
          platform: "tiktok",
          reason: "platform_limit",
          returnTo: returnTo ?? undefined,
        }),
      );
    }

    console.error("TikTok publish authorize error:", error);

    return NextResponse.redirect(
      buildOAuthErrorRedirect({
        platform: "tiktok",
        reason: "connect",
        returnTo: returnTo ?? undefined,
      }),
    );
  }
}
