import { runCampaignCaptionGeneration } from "@/utils/run-campaign-caption-generation";
import { formatCaptionsValidationError } from "@/utils/caption-generation";
import { createClient } from "@/utils/supabase/server";
import { assertAiRateLimit, isRateLimitError } from "@/utils/rate-limit";
import type { Campaign } from "@/types/campaign";
import type { PlatformCaption } from "@/types/captions";
import { NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  campaignId: z.string().uuid(),
});

export async function POST(request: Request) {
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

    const body = await request.json();
    const parsedInput = RequestSchema.safeParse(body);

    if (!parsedInput.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload",
          details: parsedInput.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { campaignId } = parsedInput.data;

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("user_id")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 },
      );
    }

    if ((campaign as Campaign).user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    assertAiRateLimit(user.id, "generate-captions");

    const savedCaptions = await runCampaignCaptionGeneration(
      supabase,
      campaignId,
      {
        force: true,
        skipRateLimit: true,
        userId: user.id,
      },
    );

    return NextResponse.json(
      {
        success: true,
        captions: savedCaptions as PlatformCaption[],
      },
      { status: 201 },
    );
  } catch (error) {
    if (isRateLimitError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: 429 },
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: formatCaptionsValidationError(error),
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
