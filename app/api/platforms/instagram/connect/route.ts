import { getAppUrl } from "@/utils/stripe";
import { createClient } from "@/utils/supabase/server";
import {
  buildInstagramAuthUrl,
  getInstagramOAuthConfig,
} from "@/utils/instagram/oauth";
import { createInstagramOAuthState } from "@/utils/instagram/oauth-state";
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

    getInstagramOAuthConfig();

    await assertPlatformConnectAllowed(user.id, "instagram");

    const state = createInstagramOAuthState(user.id, {
      returnTo,
      intent: "connect",
    });
    const authUrl = buildInstagramAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    if (isUsageLimitError(error)) {
      return NextResponse.redirect(
        buildOAuthErrorRedirect({
          platform: "instagram",
          reason: "platform_limit",
          returnTo: returnTo ?? undefined,
        }),
      );
    }

    console.error("Instagram connect error:", error);

    return NextResponse.redirect(
      buildOAuthErrorRedirect({
        platform: "instagram",
        reason: "connect",
        returnTo: returnTo ?? undefined,
      }),
    );
  }
}
