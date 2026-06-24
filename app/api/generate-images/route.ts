import { referencesFromCampaign } from "@/utils/campaign-generation";
import {
  markCampaignFailed,
  refreshCampaignImageStatus,
} from "@/utils/campaign-image-status";
import { maybeAutoGenerateCampaignCaptions } from "@/utils/run-campaign-caption-generation";
import { queueSlideImagesForAspect } from "@/utils/queue-slide-images";
import { assertAiRateLimit, isRateLimitError } from "@/utils/rate-limit";
import { createClient } from "@/utils/supabase/server";
import { getReferenceImageUrls } from "@/types/references";
import type { Campaign, Slide } from "@/types/campaign";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 300;

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

    assertAiRateLimit(user.id, "generate-images");

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

    if (typedCampaign.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    if (typedCampaign.status === "generating_images") {
      return NextResponse.json(
        { success: false, error: "Image generation already in progress" },
        { status: 409 },
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

    const typedSlides = slides as Slide[];
    const slidesToGenerate = typedSlides.filter((slide) => !slide.image_url);

    if (slidesToGenerate.length === 0) {
      void maybeAutoGenerateCampaignCaptions(
        supabase,
        campaignId,
        typedCampaign.user_id,
      );

      return NextResponse.json(
        { success: true, message: "All slide images already exist" },
        { status: 200 },
      );
    }

    const referenceUrls = getReferenceImageUrls(
      referencesFromCampaign(typedCampaign),
    );

    const result = await queueSlideImagesForAspect({
      supabase,
      campaign: typedCampaign,
      slidesToGenerate,
      aspectRatio: typedCampaign.aspect_ratio,
      referenceUrls,
      request,
    });

    return NextResponse.json(
      {
        success: true,
        mode: result.mode,
        queued: result.queued,
        message:
          result.mode === "sync"
            ? "Images generated locally"
            : "Image generation queued",
      },
      { status: result.mode === "sync" ? 200 : 202 },
    );
  } catch (error) {
    if (isRateLimitError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: 429 },
      );
    }

    if (error instanceof Error && error.message === "Slide missing required content") {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 422 },
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
