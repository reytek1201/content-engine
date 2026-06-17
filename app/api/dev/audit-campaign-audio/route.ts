import {
  buildNarrationZip,
  getNarrationZipFilename,
  synthesizeCampaignNarration,
} from "@/utils/tts/synthesize-campaign-narration";
import {
  canAuditCampaign,
  isTtsAuditRouteEnabled,
} from "@/utils/tts/audit-access";
import { isTtsError } from "@/utils/tts";
import { createClient } from "@/utils/supabase/server";
import type { Campaign, Slide } from "@/types/campaign";
import { NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  campaignId: z.string().uuid(),
  persona: z.enum(["warm", "energetic", "professional"]).optional(),
  voiceId: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  if (!isTtsAuditRouteEnabled()) {
    return NextResponse.json(
      { success: false, error: "Not found" },
      { status: 404 },
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

    const { campaignId, persona, voiceId } = parsedInput.data;

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 },
      );
    }

    const typedCampaign = campaign as Campaign;

    if (!canAuditCampaign(user.id, typedCampaign.user_id)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const { data: slides, error: slidesError } = await supabase
      .from("slides")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("slide_index", { ascending: true });

    if (slidesError || !slides || slides.length === 0) {
      return NextResponse.json(
        { success: false, error: "No slides found for campaign" },
        { status: 404 },
      );
    }

    const narrationSlides = await synthesizeCampaignNarration({
      slides: slides as Slide[],
      persona,
      voiceId,
      usage: {
        userId: user.id,
        campaignId,
      },
    });

    const zipBytes = await buildNarrationZip(narrationSlides);
    const filename = getNarrationZipFilename(typedCampaign.title, campaignId);
    const totalChars = narrationSlides.reduce(
      (sum, slide) => sum + slide.charCount,
      0,
    );

    return new NextResponse(Buffer.from(zipBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-TTS-Slide-Count": String(narrationSlides.length),
        "X-TTS-Char-Count": String(totalChars),
      },
    });
  } catch (error) {
    if (isTtsError(error)) {
      const status =
        error.code === "RATE_LIMITED"
          ? 429
          : error.code === "INVALID_INPUT" || error.code === "INVALID_VOICE"
            ? 400
            : error.code === "NOT_CONFIGURED"
              ? 503
              : 502;

      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status },
      );
    }

    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
