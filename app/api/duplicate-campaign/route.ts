import { generateCampaignContent } from "@/utils/gemini";
import {
  assertSlideCountAllowed,
  referencesFromCampaign,
} from "@/utils/campaign-generation";
import {
  assertCampaignLimit,
  isUsageLimitError,
} from "@/utils/usage-limits";
import { createClient } from "@/utils/supabase/server";
import type { Campaign } from "@/types/campaign";
import {
  DEFAULT_SLIDE_COUNT,
  isSlideCount,
  type SlideCount,
} from "@/types/slides";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 300;

const RequestSchema = z.object({
  campaignId: z.string().uuid(),
});

function resolveSlideCount(campaign: Campaign, slideCount?: number): SlideCount {
  const value = campaign.slide_count ?? slideCount ?? DEFAULT_SLIDE_COUNT;

  if (isSlideCount(value)) {
    return value;
  }

  return DEFAULT_SLIDE_COUNT;
}

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

    const { data: sourceCampaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !sourceCampaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    const typedSource = sourceCampaign as Campaign;

    if (typedSource.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { count: slideCount } = await supabase
      .from("slides")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId);

    const resolvedSlideCount = resolveSlideCount(
      typedSource,
      slideCount ?? undefined
    );

    assertSlideCountAllowed(resolvedSlideCount, user.id);
    await assertCampaignLimit(supabase, user.id);

    const references = referencesFromCampaign(typedSource);

    const generated = await generateCampaignContent(
      typedSource.topic,
      typedSource.aspect_ratio,
      resolvedSlideCount,
      references
    );

    const { data: campaign, error: insertError } = await supabase
      .from("campaigns")
      .insert({
        user_id: user.id,
        topic: typedSource.topic,
        title: generated.title,
        target_audience: generated.target_audience,
        aspect_ratio: typedSource.aspect_ratio,
        slide_count: resolvedSlideCount,
        status: "idle",
        product_reference_url: typedSource.product_reference_url,
        style_reference_url: typedSource.style_reference_url,
        logo_reference_url: typedSource.logo_reference_url,
      })
      .select("id")
      .single();

    if (insertError || !campaign) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create duplicate campaign",
          details: insertError?.message,
        },
        { status: 500 }
      );
    }

    const slidesPayload = generated.slides.map((slide) => ({
      campaign_id: campaign.id,
      slide_index: slide.slide_index,
      text_overlay: slide.text_overlay,
      voiceover_script: slide.voiceover_script,
      image_prompt: slide.image_prompt,
    }));

    const { error: slidesError } = await supabase
      .from("slides")
      .insert(slidesPayload);

    if (slidesError) {
      await supabase.from("campaigns").delete().eq("id", campaign.id);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to persist slides for duplicate campaign",
          details: slidesError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, campaignId: campaign.id },
      { status: 201 }
    );
  } catch (error) {
    if (isUsageLimitError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: 429 }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
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
