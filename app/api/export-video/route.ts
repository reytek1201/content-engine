import type { VideoExportMetadata } from "@/utils/fal-video";
import { prepareCampaignVideo } from "@/utils/prepare-campaign-video";
import {
  buildComposeStageMetadata,
  buildStoredSlideClips,
} from "@/utils/compose-video-export-stage";
import { shouldBurnVideoCaptions } from "@/utils/complete-video-export";
import { resolveCampaignVoicePersona } from "@/utils/tts/resolve-campaign-persona";
import { isTtsError } from "@/utils/tts/types";
import type { VoicePersona } from "@/utils/tts/voice-catalog";
import {
  assertVideoExportLimit,
  isUsageLimitError,
  recordVideoExport,
} from "@/utils/usage-limits";
import {
  assertVideoExportRateLimit,
  isRateLimitError,
} from "@/utils/rate-limit";
import { createClient } from "@/utils/supabase/server";
import type { Campaign, Slide } from "@/types/campaign";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 300;

const RequestSchema = z.object({
  campaignId: z.string().uuid(),
  persona: z.enum(["warm", "energetic", "professional"]).optional(),
  preset: z.enum(["quick_reel", "silent_captions"]).optional(),
  includeCaptions: z.boolean().optional(),
  voiceQuality: z.enum(["standard", "studio"]).optional(),
});

export async function POST(request: Request) {
  let exportId: string | null = null;

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

    assertVideoExportRateLimit(user.id);

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
      campaignId,
      persona: personaOverride,
      preset: presetInput,
      includeCaptions: includeCaptionsInput,
      voiceQuality: voiceQualityInput,
    } = parsedInput.data;

    const preset = presetInput ?? "quick_reel";
    const includeCaptions = includeCaptionsInput ?? false;
    const voiceQuality = voiceQualityInput ?? "standard";

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

    if (
      typedCampaign.aspect_ratio !== "9:16" &&
      typedCampaign.aspect_ratio !== "4:5"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Video export is only available for 4:5 and 9:16 campaigns",
        },
        { status: 422 },
      );
    }

    const { data: processingExport } = await supabase
      .from("exports")
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("export_type", "video")
      .eq("status", "processing")
      .maybeSingle();

    if (processingExport) {
      return NextResponse.json(
        {
          success: true,
          exportId: processingExport.id,
          status: "processing",
          message: "Video export already in progress",
        },
        { status: 200 },
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

    await assertVideoExportLimit(supabase, user.id);

    const persona = await resolveCampaignVoicePersona(
      supabase,
      typedCampaign.brand_id,
      user.id,
      personaOverride as VoicePersona | undefined,
    );

    const { data: exportRow, error: exportInsertError } = await supabase
      .from("exports")
      .insert({
        campaign_id: campaignId,
        export_type: "video",
        status: "processing",
        metadata: {
          stage: "compose_slides",
          preset,
          includeCaptions,
          voiceQuality,
          persona,
        } satisfies VideoExportMetadata,
      })
      .select("id")
      .single();

    if (exportInsertError || !exportRow) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create export record",
          details: exportInsertError?.message,
        },
        { status: 500 },
      );
    }

    exportId = exportRow.id;

    const prepared = await prepareCampaignVideo({
      slides: slides as Slide[],
      persona,
      preset,
      voiceQuality,
      usage: {
        userId: user.id,
        campaignId,
      },
    });

    const captionsOnSlides = shouldBurnVideoCaptions({
      stage: "compose_slides",
      preset,
      includeCaptions,
    });
    const slideClips = buildStoredSlideClips(prepared, captionsOnSlides);
    const composeMetadata = buildComposeStageMetadata({
      preset,
      includeCaptions,
      voiceQuality,
      persona,
      aspectRatio: typedCampaign.aspect_ratio,
      prepared,
      captionsOnSlides,
      slideClips,
    });

    const { error: exportUpdateError } = await supabase
      .from("exports")
      .update({
        metadata: composeMetadata,
      })
      .eq("id", exportRow.id);

    if (exportUpdateError) {
      throw new Error("Failed to update export record with compose metadata");
    }

    await recordVideoExport(user.id, {
      campaignId,
      exportId: exportRow.id,
      persona,
      slideCount: prepared.slideCount,
      charCount: prepared.totalChars,
    });

    return NextResponse.json({
      success: true,
      exportId,
      status: "processing",
    });
  } catch (error) {
    if (exportId) {
      const supabase = await createClient();
      const message =
        error instanceof Error ? error.message : "Video export failed";

      await supabase
        .from("exports")
        .update({
          status: "failed",
          error_message: message,
        })
        .eq("id", exportId);
    }

    if (isUsageLimitError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: 429 },
      );
    }

    if (isRateLimitError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: 429 },
      );
    }

    if (isTtsError(error)) {
      const status =
        error.code === "RATE_LIMITED" || error.code === "QUOTA_EXCEEDED"
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
