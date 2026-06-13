import { createAdminClient } from "@/utils/supabase/admin";
import {
  extractImageUrlFromWebhook,
  type FalWebhookPayload,
} from "@/utils/fal";
import { NextResponse } from "next/server";

async function refreshCampaignStatus(campaignId: string) {
  const supabase = createAdminClient();

  const { data: slides } = await supabase
    .from("slides")
    .select("image_url")
    .eq("campaign_id", campaignId);

  const allComplete =
    slides &&
    slides.length > 0 &&
    slides.every((slide) => Boolean(slide.image_url));

  await supabase
    .from("campaigns")
    .update({
      status: allComplete ? "completed" : "generating_images",
      error_message: null,
    })
    .eq("id", campaignId);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FalWebhookPayload;

    if (!body.request_id) {
      return NextResponse.json(
        { success: false, error: "Missing request_id" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: slide, error: slideError } = await supabase
      .from("slides")
      .select("id, campaign_id, image_url")
      .eq("fal_request_id", body.request_id)
      .maybeSingle();

    if (slideError || !slide) {
      return NextResponse.json(
        { success: false, error: "Slide not found for request" },
        { status: 404 }
      );
    }

    if (body.status === "ERROR") {
      await supabase
        .from("campaigns")
        .update({
          status: "failed",
          error_message: body.error ?? "Fal image generation failed",
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
        })
        .eq("id", slide.campaign_id);

      return NextResponse.json(
        { success: false, error: "Missing image URL in webhook payload" },
        { status: 422 }
      );
    }

    const { error: updateError } = await supabase
      .from("slides")
      .update({ image_url: imageUrl })
      .eq("id", slide.id);

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update slide",
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    await refreshCampaignStatus(slide.campaign_id);

    return NextResponse.json({ success: true, handled: "updated" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
