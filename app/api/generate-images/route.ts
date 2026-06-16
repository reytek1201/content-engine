import { referencesFromCampaign } from "@/utils/campaign-generation";
import {
  markCampaignFailed,
  refreshCampaignImageStatus,
} from "@/utils/campaign-image-status";
import { maybeSendCampaignImagesReadyPush } from "@/utils/send-campaign-push";
import {
  buildFalWebhookUrl,
  getAppBaseUrl,
  isLocalAppUrl,
  runNanoBananaSync,
  submitNanoBananaToQueue,
} from "@/utils/fal";
import { buildSlideImagePrompt } from "@/utils/slide-image-prompt";
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
        { status: 401 }
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

    if (typedCampaign.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    if (typedCampaign.status === "generating_images") {
      return NextResponse.json(
        { success: false, error: "Image generation already in progress" },
        { status: 409 }
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
        { status: 404 }
      );
    }

    const typedSlides = slides as Slide[];
    const slidesToGenerate = typedSlides.filter((slide) => !slide.image_url);

    if (slidesToGenerate.length === 0) {
      return NextResponse.json(
        { success: true, message: "All slide images already exist" },
        { status: 200 }
      );
    }

    const { error: statusError } = await supabase
      .from("campaigns")
      .update({ status: "generating_images", error_message: null })
      .eq("id", campaignId);

    if (statusError) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update campaign status",
          details: statusError.message,
        },
        { status: 500 }
      );
    }

    const referenceUrls = getReferenceImageUrls(
      referencesFromCampaign(typedCampaign)
    );
    const appBaseUrl = getAppBaseUrl(request);
    const useLocalSync = isLocalAppUrl(appBaseUrl);

    if (useLocalSync) {
      for (const slide of slidesToGenerate) {
        const prompt = buildSlideImagePrompt(slide, typedCampaign);

        if (!prompt) {
          await markCampaignFailed(
            supabase,
            campaignId,
            `Slide ${slide.slide_index + 1} is missing overlay or image prompt`
          );
          return NextResponse.json(
            { success: false, error: "Slide missing required content" },
            { status: 422 }
          );
        }

        try {
          const imageUrl = await runNanoBananaSync(
            prompt,
            typedCampaign.aspect_ratio,
            referenceUrls
          );

          const { error: slideUpdateError } = await supabase
            .from("slides")
            .update({ image_url: imageUrl })
            .eq("id", slide.id);

          if (slideUpdateError) {
            throw new Error(slideUpdateError.message);
          }
        } catch (generationError) {
          const message =
            generationError instanceof Error
              ? generationError.message
              : "Image generation failed";

          await markCampaignFailed(supabase, campaignId, message);

          return NextResponse.json(
            { success: false, error: message },
            { status: 502 }
          );
        }
      }

      await refreshCampaignImageStatus(supabase, campaignId);
      await maybeSendCampaignImagesReadyPush(campaignId);

      return NextResponse.json(
        {
          success: true,
          mode: "sync",
          message: "Images generated locally",
        },
        { status: 200 }
      );
    }

    const webhookUrl = buildFalWebhookUrl(appBaseUrl);
    const submitted: string[] = [];

    for (const slide of slidesToGenerate) {
      const prompt = buildSlideImagePrompt(slide, typedCampaign);

      if (!prompt) {
        await markCampaignFailed(
          supabase,
          campaignId,
          `Slide ${slide.slide_index + 1} is missing overlay or image prompt`
        );
        return NextResponse.json(
          { success: false, error: "Slide missing required content" },
          { status: 422 }
        );
      }

      try {
        const requestId = await submitNanoBananaToQueue(
          prompt,
          typedCampaign.aspect_ratio,
          webhookUrl,
          referenceUrls
        );

        const { error: slideUpdateError } = await supabase
          .from("slides")
          .update({ fal_request_id: requestId })
          .eq("id", slide.id);

        if (slideUpdateError) {
          throw new Error(slideUpdateError.message);
        }

        submitted.push(requestId);
      } catch (submissionError) {
        const message =
          submissionError instanceof Error
            ? submissionError.message
            : "Failed to queue image generation";

        await markCampaignFailed(supabase, campaignId, message);

        return NextResponse.json(
          { success: false, error: message },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        mode: "queue",
        queued: submitted.length,
        message: "Image generation queued",
      },
      { status: 202 }
    );
  } catch (error) {
    if (isRateLimitError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: 429 }
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
