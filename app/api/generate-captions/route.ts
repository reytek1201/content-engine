import { generatePlatformCaptions } from "@/utils/gemini-captions";
import {
  formatCaptionsValidationError,
  normalizeCaptionOutput,
} from "@/utils/caption-generation";
import { createClient } from "@/utils/supabase/server";
import type { Campaign, Slide } from "@/types/campaign";
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
        { status: 401 }
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
        { status: 400 }
      );
    }

    const { campaignId } = parsedInput.data;

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    const typedCampaign = campaign as Campaign;

    const { data: slides, error: slidesError } = await supabase
      .from("slides")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("slide_index", { ascending: true });

    if (slidesError || !slides || slides.length === 0) {
      return NextResponse.json(
        { success: false, error: "No slides found for campaign" },
        { status: 404 }
      );
    }

    const generated = await generatePlatformCaptions(
      typedCampaign,
      slides as Slide[]
    );

    await supabase
      .from("platform_captions")
      .delete()
      .eq("campaign_id", campaignId);

    const captionsPayload = generated.platforms.map((platformCaption) => {
      const normalized = normalizeCaptionOutput(platformCaption);

      return {
        campaign_id: campaignId,
        platform: normalized.platform,
        hook: normalized.hook,
        caption: normalized.caption,
        hashtags: normalized.hashtags,
        title: normalized.title,
      };
    });

    const { data: savedCaptions, error: insertError } = await supabase
      .from("platform_captions")
      .insert(captionsPayload)
      .select("*");

    if (insertError || !savedCaptions) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to save captions",
          details: insertError?.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        captions: savedCaptions as PlatformCaption[],
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: formatCaptionsValidationError(error),
          details: error.flatten(),
        },
        { status: 400 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
