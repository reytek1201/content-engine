import {
  markCampaignFailed,
  refreshCampaignImageStatus,
} from "@/utils/campaign-image-status";
import {
  buildFalWebhookUrl,
  getAppBaseUrl,
  isLocalAppUrl,
  runNanoBananaSync,
  submitNanoBananaToQueue,
} from "@/utils/fal";
import { buildSlideImagePrompt } from "@/utils/slide-image-prompt";
import { createClient } from "@/utils/supabase/server";
import { TextOverlayInputSchema } from "@/utils/campaign-generation";
import { getReferenceImageUrls } from "@/types/references";
import {
  REGENERATE_FEEDBACK_CHIP_IDS,
  type RegenerateFeedbackChipId,
} from "@/types/regenerate-feedback";
import type { Campaign, Slide } from "@/types/campaign";
import {
  assertRegenerationLimit,
  isUsageLimitError,
  recordSlideRegeneration,
} from "@/utils/usage-limits";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 300;

const RequestSchema = z.object({
  slideId: z.string().uuid(),
  feedback: z.array(z.enum(REGENERATE_FEEDBACK_CHIP_IDS)).max(4).default([]),
  notes: z.string().trim().max(300).optional(),
  text_overlay: TextOverlayInputSchema.optional(),
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

    const { slideId, feedback, notes, text_overlay: textOverlay } =
      parsedInput.data;

    const { data: slide, error: slideError } = await supabase
      .from("slides")
      .select("*")
      .eq("id", slideId)
      .single();

    if (slideError || !slide) {
      return NextResponse.json(
        { success: false, error: "Slide not found" },
        { status: 404 }
      );
    }

    const typedSlide = slide as Slide;

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", typedSlide.campaign_id)
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
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    if (!typedSlide.image_url) {
      return NextResponse.json(
        { success: false, error: "Slide has no image to regenerate" },
        { status: 422 }
      );
    }

    const { data: siblingSlides } = await supabase
      .from("slides")
      .select("id, fal_request_id, image_url")
      .eq("campaign_id", typedCampaign.id);

    const anotherSlideGenerating = (siblingSlides ?? []).some(
      (entry) =>
        entry.id !== slideId &&
        entry.fal_request_id &&
        !entry.image_url
    );

    if (anotherSlideGenerating) {
      return NextResponse.json(
        {
          success: false,
          error: "Wait for other slide images to finish generating",
        },
        { status: 409 }
      );
    }

    await assertRegenerationLimit(supabase, user.id);

    const feedbackChipIds = feedback as RegenerateFeedbackChipId[];

    if (textOverlay) {
      const { error: overlayUpdateError } = await supabase
        .from("slides")
        .update({ text_overlay: textOverlay.trim() })
        .eq("id", slideId);

      if (overlayUpdateError) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to update headline before regeneration",
            details: overlayUpdateError.message,
          },
          { status: 500 }
        );
      }

      typedSlide.text_overlay = textOverlay.trim();
    }

    const prompt = buildSlideImagePrompt(
      typedSlide,
      typedCampaign,
      feedbackChipIds,
      notes
    );

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: "Slide missing required content" },
        { status: 422 }
      );
    }

    const { error: clearError } = await supabase
      .from("slides")
      .update({ image_url: null, fal_request_id: null })
      .eq("id", slideId);

    if (clearError) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to reset slide image",
          details: clearError.message,
        },
        { status: 500 }
      );
    }

    await supabase
      .from("campaigns")
      .update({ status: "generating_images", error_message: null })
      .eq("id", typedCampaign.id);

    await recordSlideRegeneration(user.id);

    const referenceUrls = getReferenceImageUrls({
      product: campaign.product_reference_url,
      style: campaign.style_reference_url,
      logo: campaign.logo_reference_url,
    });
    const appBaseUrl = getAppBaseUrl(request);
    const useLocalSync = isLocalAppUrl(appBaseUrl);

    if (useLocalSync) {
      try {
        const imageUrl = await runNanoBananaSync(
          prompt,
          campaign.aspect_ratio,
          referenceUrls
        );

        const { error: slideUpdateError } = await supabase
          .from("slides")
          .update({ image_url: imageUrl, fal_request_id: null })
          .eq("id", slideId);

        if (slideUpdateError) {
          throw new Error(slideUpdateError.message);
        }

        await refreshCampaignImageStatus(supabase, typedCampaign.id);

        return NextResponse.json(
          {
            success: true,
            mode: "sync",
            slideId,
          },
          { status: 200 }
        );
      } catch (generationError) {
        const message =
          generationError instanceof Error
            ? generationError.message
            : "Image regeneration failed";

        await markCampaignFailed(supabase, typedCampaign.id, message);

        return NextResponse.json(
          { success: false, error: message },
          { status: 502 }
        );
      }
    }

    try {
      const webhookUrl = buildFalWebhookUrl(appBaseUrl);
      const requestId = await submitNanoBananaToQueue(
        prompt,
        campaign.aspect_ratio,
        webhookUrl,
        referenceUrls
      );

      const { error: slideUpdateError } = await supabase
        .from("slides")
        .update({ fal_request_id: requestId })
        .eq("id", slideId);

      if (slideUpdateError) {
        throw new Error(slideUpdateError.message);
      }

      return NextResponse.json(
        {
          success: true,
          mode: "queue",
          slideId,
        },
        { status: 202 }
      );
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "Failed to queue image regeneration";

      await markCampaignFailed(supabase, typedCampaign.id, message);

      return NextResponse.json(
        { success: false, error: message },
        { status: 502 }
      );
    }
  } catch (error) {
    if (isUsageLimitError(error)) {
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
