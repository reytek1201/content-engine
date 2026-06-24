import { createAdminClient } from "@/utils/supabase/admin";
import {
  extractImageUrlFromWebhook,
  getAppBaseUrl,
  verifyFalWebhookSecret,
  type FalWebhookPayload,
} from "@/utils/fal";
import type { FalVideoWebhookPayload } from "@/utils/fal-video";
import { refreshCampaignImageStatus } from "@/utils/campaign-image-status";
import { upsertSlideImageRecord } from "@/utils/slide-image-persistence";
import { handleVideoExportWebhook } from "@/utils/video-export-webhook";
import type { Campaign } from "@/types/campaign";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!verifyFalWebhookSecret(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as FalWebhookPayload &
      FalVideoWebhookPayload;

    if (!body.request_id) {
      return NextResponse.json(
        { success: false, error: "Missing request_id" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data: slideImage, error: slideImageError } = await supabase
      .from("slide_images")
      .select("id, slide_id, aspect_ratio, image_url, slides!inner(campaign_id)")
      .eq("fal_request_id", body.request_id)
      .maybeSingle();

    if (slideImageError) {
      return NextResponse.json(
        { success: false, error: "Failed to look up slide image" },
        { status: 500 },
      );
    }

    if (slideImage) {
      const slideRelation = slideImage.slides as
        | { campaign_id: string }
        | { campaign_id: string }[]
        | null;
      const campaignId = Array.isArray(slideRelation)
        ? slideRelation[0]?.campaign_id
        : slideRelation?.campaign_id;

      if (!campaignId) {
        return NextResponse.json(
          { success: false, error: "Campaign not found for slide image" },
          { status: 404 },
        );
      }

      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .select("aspect_ratio")
        .eq("id", campaignId)
        .single();

      if (campaignError || !campaign) {
        return NextResponse.json(
          { success: false, error: "Campaign not found for slide image" },
          { status: 404 },
        );
      }

      if (body.status === "ERROR") {
        await supabase
          .from("campaigns")
          .update({
            status: "failed",
            error_message: body.error ?? "Fal image generation failed",
            image_generation_aspect: null,
          })
          .eq("id", campaignId);

        return NextResponse.json({ success: true, handled: "error" });
      }

      if (slideImage.image_url) {
        return NextResponse.json({ success: true, handled: "duplicate" });
      }

      const imageUrl = extractImageUrlFromWebhook(body);

      if (!imageUrl) {
        await supabase
          .from("campaigns")
          .update({
            status: "failed",
            error_message: "Fal webhook did not include an image URL",
            image_generation_aspect: null,
          })
          .eq("id", campaignId);

        return NextResponse.json(
          { success: false, error: "Missing image URL in webhook payload" },
          { status: 422 },
        );
      }

      await upsertSlideImageRecord(supabase, {
        slideId: slideImage.slide_id,
        aspectRatio: slideImage.aspect_ratio as Campaign["aspect_ratio"],
        imageUrl,
        falRequestId: null,
        campaign: campaign as Campaign,
      });

      await refreshCampaignImageStatus(supabase, campaignId);

      return NextResponse.json({ success: true, handled: "slide_image" });
    }

    const { data: slide, error: slideError } = await supabase
      .from("slides")
      .select("id, campaign_id, image_url")
      .eq("fal_request_id", body.request_id)
      .maybeSingle();

    if (slideError) {
      return NextResponse.json(
        { success: false, error: "Failed to look up slide" },
        { status: 500 },
      );
    }

    if (!slide) {
      const videoResult = await handleVideoExportWebhook(
        body,
        getAppBaseUrl(request),
      );

      if (videoResult.status === 404) {
        return NextResponse.json(
          { success: false, error: "Request not found for webhook" },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        handled: videoResult.handled,
      });
    }

    if (body.status === "ERROR") {
      await supabase
        .from("campaigns")
        .update({
          status: "failed",
          error_message: body.error ?? "Fal image generation failed",
          image_generation_aspect: null,
        })
        .eq("id", slide.campaign_id);

      return NextResponse.json({ success: true, handled: "error" });
    }

    if (slide.image_url) {
      return NextResponse.json({ success: true, handled: "duplicate" });
    }

    const imageUrl = extractImageUrlFromWebhook(body);

    if (!imageUrl) {
      await supabase
        .from("campaigns")
        .update({
          status: "failed",
          error_message: "Fal webhook did not include an image URL",
          image_generation_aspect: null,
        })
        .eq("id", slide.campaign_id);

      return NextResponse.json(
        { success: false, error: "Missing image URL in webhook payload" },
        { status: 422 },
      );
    }

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("aspect_ratio")
      .eq("id", slide.campaign_id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found for slide" },
        { status: 404 },
      );
    }

    await upsertSlideImageRecord(supabase, {
      slideId: slide.id,
      aspectRatio: campaign.aspect_ratio as Campaign["aspect_ratio"],
      imageUrl,
      falRequestId: null,
      campaign: campaign as Campaign,
    });

    await refreshCampaignImageStatus(supabase, slide.campaign_id);

    return NextResponse.json({ success: true, handled: "updated" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
