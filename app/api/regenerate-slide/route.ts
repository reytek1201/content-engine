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
import { createClient } from "@/utils/supabase/server";
import { TextOverlayInputSchema } from "@/utils/campaign-generation";
import { getRegenerationImageUrls } from "@/types/references";
import {
  REGENERATE_FEEDBACK_CHIP_IDS,
  type RegenerateFeedbackChipId,
} from "@/types/regenerate-feedback";
import type { AspectRatio, Campaign, Slide } from "@/types/campaign";
import {
  indexSlideImages,
  resolveSlideImage,
} from "@/utils/slide-aspect-images";
import {
  loadSlideImagesForCampaign,
  upsertSlideImageRecord,
} from "@/utils/slide-image-persistence";
import {
  assertRegenerationLimit,
  isUsageLimitError,
  recordSlideRegeneration,
} from "@/utils/usage-limits";
import { assertAiRateLimit, isRateLimitError } from "@/utils/rate-limit";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 300;

const RequestSchema = z.object({
  slideId: z.string().uuid(),
  feedback: z.array(z.enum(REGENERATE_FEEDBACK_CHIP_IDS)).max(4).default([]),
  notes: z.string().trim().max(300).optional(),
  text_overlay: TextOverlayInputSchema.optional(),
  snapProductUrl: z.string().url().optional(),
  aspectRatio: z.enum(["4:5", "9:16"]).optional(),
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

    assertAiRateLimit(user.id, "regenerate-slide");

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

    const {
      slideId,
      feedback,
      notes,
      text_overlay: textOverlay,
      snapProductUrl,
      aspectRatio: aspectRatioInput,
    } = parsedInput.data;

    const { data: slide, error: slideError } = await supabase
      .from("slides")
      .select("*")
      .eq("id", slideId)
      .single();

    if (slideError || !slide) {
      return NextResponse.json(
        { success: false, error: "Slide not found" },
        { status: 404 },
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
        { status: 404 },
      );
    }

    const typedCampaign = campaign as Campaign;

    if (typedCampaign.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 },
      );
    }

    const targetAspectRatio: AspectRatio =
      aspectRatioInput ?? typedCampaign.aspect_ratio;

    if (
      targetAspectRatio !== typedCampaign.aspect_ratio &&
      targetAspectRatio !== typedCampaign.secondary_aspect_ratio
    ) {
      return NextResponse.json(
        { success: false, error: "Aspect ratio is not enabled for this campaign" },
        { status: 422 },
      );
    }

    const slideImages = await loadSlideImagesForCampaign(
      supabase,
      typedCampaign.id,
    );
    const imageIndex = indexSlideImages(slideImages as never);
    const resolvedImage = resolveSlideImage(
      typedSlide,
      targetAspectRatio,
      typedCampaign,
      imageIndex,
    );

    if (!resolvedImage.image_url) {
      return NextResponse.json(
        { success: false, error: "Slide has no image to regenerate" },
        { status: 422 },
      );
    }

    const { data: siblingSlides } = await supabase
      .from("slides")
      .select("*")
      .eq("campaign_id", typedCampaign.id);

    const anotherSlideGenerating = (siblingSlides ?? []).some((entry) => {
      if (entry.id === slideId) {
        return false;
      }

      const resolved = resolveSlideImage(
        entry as Slide,
        targetAspectRatio,
        typedCampaign,
        imageIndex,
      );

      return Boolean(resolved.fal_request_id && !resolved.image_url);
    });

    if (anotherSlideGenerating) {
      return NextResponse.json(
        {
          success: false,
          error: "Wait for other slide images to finish generating",
        },
        { status: 409 },
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
          { status: 500 },
        );
      }

      typedSlide.text_overlay = textOverlay.trim();
    }

    const prompt = buildSlideImagePrompt(
      typedSlide,
      typedCampaign,
      feedbackChipIds,
      notes,
      { isRegeneration: true },
    );

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: "Slide missing required content" },
        { status: 422 },
      );
    }

    const sourceImageUrl = resolvedImage.image_url;
    const regenerationImageUrls = getRegenerationImageUrls(sourceImageUrl, {
      product: snapProductUrl ?? campaign.product_reference_url,
      style: campaign.style_reference_url,
      logo: campaign.logo_reference_url,
    });

    await upsertSlideImageRecord(supabase, {
      slideId,
      aspectRatio: targetAspectRatio,
      imageUrl: null,
      falRequestId: null,
      campaign: typedCampaign,
    });

    await supabase
      .from("campaigns")
      .update({
        status: "generating_images",
        error_message: null,
        image_generation_aspect: targetAspectRatio,
      })
      .eq("id", typedCampaign.id);

    const referenceUrls = regenerationImageUrls;
    const appBaseUrl = getAppBaseUrl(request);
    const useLocalSync = isLocalAppUrl(appBaseUrl);

    if (useLocalSync) {
      try {
        const imageUrl = await runNanoBananaSync(
          prompt,
          targetAspectRatio,
          regenerationImageUrls,
        );

        await upsertSlideImageRecord(supabase, {
          slideId,
          aspectRatio: targetAspectRatio,
          imageUrl,
          falRequestId: null,
          campaign: typedCampaign,
        });

        await refreshCampaignImageStatus(supabase, typedCampaign.id);
        await maybeSendCampaignImagesReadyPush(typedCampaign.id);
        await recordSlideRegeneration(user.id);

        return NextResponse.json(
          {
            success: true,
            mode: "sync",
            slideId,
            aspectRatio: targetAspectRatio,
          },
          { status: 200 },
        );
      } catch (generationError) {
        const message =
          generationError instanceof Error
            ? generationError.message
            : "Image regeneration failed";

        await markCampaignFailed(supabase, typedCampaign.id, message);

        return NextResponse.json(
          { success: false, error: message },
          { status: 502 },
        );
      }
    }

    try {
      const webhookUrl = buildFalWebhookUrl(appBaseUrl);
      const requestId = await submitNanoBananaToQueue(
        prompt,
        targetAspectRatio,
        webhookUrl,
        referenceUrls,
      );

      await upsertSlideImageRecord(supabase, {
        slideId,
        aspectRatio: targetAspectRatio,
        imageUrl: null,
        falRequestId: requestId,
        campaign: typedCampaign,
      });

      await recordSlideRegeneration(user.id);

      return NextResponse.json(
        {
          success: true,
          mode: "queue",
          slideId,
          aspectRatio: targetAspectRatio,
        },
        { status: 202 },
      );
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "Failed to queue image regeneration";

      await markCampaignFailed(supabase, typedCampaign.id, message);

      return NextResponse.json(
        { success: false, error: message },
        { status: 502 },
      );
    }
  } catch (error) {
    if (isRateLimitError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: 429 },
      );
    }

    if (isUsageLimitError(error)) {
      return NextResponse.json(error.toJSON(), { status: 429 });
    }

    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
