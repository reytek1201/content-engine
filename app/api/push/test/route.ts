import { isPushTestEnabled } from "@/utils/push-test-enabled";
import { sendTestPushToUser } from "@/utils/send-campaign-push";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  campaignId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  if (!isPushTestEnabled()) {
    return NextResponse.json(
      { success: false, error: "Push test is disabled" },
      { status: 403 },
    );
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    if (parsed.data.campaignId) {
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .select("id")
        .eq("id", parsed.data.campaignId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (campaignError || !campaign) {
        return NextResponse.json(
          { success: false, error: "Campaign not found" },
          { status: 404 },
        );
      }
    }

    const result = await sendTestPushToUser(user.id, {
      campaignId: parsed.data.campaignId,
    });

    if (result.sent === 0) {
      return NextResponse.json(
        {
          success: false,
          error: result.errors[0] ?? "Push was not delivered",
          sent: result.sent,
          failed: result.failed,
          errors: result.errors,
          removedStaleTokens: result.staleTokenIds.length,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors,
      removedStaleTokens: result.staleTokenIds.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
