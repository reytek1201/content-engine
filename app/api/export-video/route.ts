import type { Campaign, Slide } from "@/types/campaign";
import type { VideoExportMetadata } from "@/utils/fal-video";
import { prepareCampaignVideo } from "@/utils/prepare-campaign-video";
import {
  buildComposeStageMetadata,
  buildStoredSlideClips,
} from "@/utils/compose-video-export-stage";
import { findReusableVideoExportNarration } from "@/utils/find-reusable-video-export-narration";
import { resolveCampaignVoicePersona } from "@/utils/tts/resolve-campaign-persona";
import { isTtsError } from "@/utils/tts/types";
import type { VoicePersona } from "@/utils/tts/voice-catalog";
import { VoicePersonaSchema } from "@/utils/tts/voice-catalog";
import {
  presetIncludesNarration,
} from "@/utils/video-export-presets";
import { buildVideoExportFingerprints } from "@/utils/video-export-fingerprint";
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
import { createAdminClient } from "@/utils/supabase/admin";
import {
  indexSlideImages,
  isCampaignAspectRatio,
  mergeSlidesWithAspect,
} from "@/utils/slide-aspect-images";
import { loadSlideImagesForCampaign } from "@/utils/slide-image-persistence";
import { isBurnCaptionsEnabled } from "@/utils/burn-captions-feature";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 300;

const RequestSchema = z.object({
  campaignId: z.string().uuid(),
  persona: VoicePersonaSchema.optional(),
  preset: z.enum(["quick_reel", "silent_captions"]).optional(),
  voiceQuality: z.enum(["standard", "studio"]).optional(),
  aspectRatio: z.enum(["4:5", "9:16"]).optional(),
  burn_captions: z.boolean().optional(),
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
      voiceQuality: voiceQualityInput,
      aspectRatio: aspectRatioInput,
      burn_captions: burnCaptionsInput,
    } = parsedInput.data;

    const preset = presetInput ?? "quick_reel";
    const voiceQuality = voiceQualityInput ?? "standard";
    const burnCaptionsRequested = burnCaptionsInput ?? false;

    if (burnCaptionsRequested && !isBurnCaptionsEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: "Burned captions are not enabled on this environment",
        },
        { status: 400 },
      );
    }

    if (burnCaptionsRequested && !presetIncludesNarration(preset)) {
      return NextResponse.json(
        {
          success: false,
          error: "Burned captions require the Quick Reel preset with narration",
        },
        { status: 422 },
      );
    }

    const burnCaptions = burnCaptionsRequested && isBurnCaptionsEnabled();

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

    const targetAspectRatio =
      aspectRatioInput ?? typedCampaign.aspect_ratio;

    if (!isCampaignAspectRatio(typedCampaign, targetAspectRatio)) {
      return NextResponse.json(
        {
          success: false,
          error: "Video export aspect ratio is not enabled for this campaign",
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

    const slideImages = await loadSlideImagesForCampaign(supabase, campaignId);
    const imageIndex = indexSlideImages(slideImages as never);
    const slidesForExport = mergeSlidesWithAspect(
      slides as Slide[],
      targetAspectRatio,
      typedCampaign,
      imageIndex,
    );

    await assertVideoExportLimit(supabase, user.id);

    const persona = await resolveCampaignVoicePersona(
      supabase,
      typedCampaign.brand_id,
      user.id,
      personaOverride as VoicePersona | undefined,
    );

    const fingerprints = buildVideoExportFingerprints({
      slides: slidesForExport,
      persona,
      voiceQuality,
      preset,
    });

    let reusedAudioUrl: string | undefined;
    let fastPath: "image_only" | undefined;

    if (presetIncludesNarration(preset)) {
      const reusableNarration = await findReusableVideoExportNarration(
        supabase,
        {
          campaignId,
          aspectRatio: targetAspectRatio,
          preset,
          voiceQuality,
          persona,
          narrationFingerprint: fingerprints.narrationFingerprint,
          slideFingerprints: fingerprints.slides,
        },
      );

      if (reusableNarration) {
        reusedAudioUrl = reusableNarration.audioUrl;
        if (reusableNarration.imageOnlyUpdate) {
          fastPath = "image_only";
        }
      }
    }

    const { data: exportRow, error: exportInsertError } = await supabase
      .from("exports")
      .insert({
        campaign_id: campaignId,
        export_type: "video",
        status: "processing",
        burn_captions: burnCaptions,
        metadata: {
          stage: "compose_slides",
          preset,
          voiceQuality,
          persona,
          aspectRatio: targetAspectRatio,
          burnCaptions,
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

    const estimatedCharCount = slidesForExport.reduce(
      (sum, slide) => sum + (slide.voiceover_script?.trim().length ?? 0),
      0,
    );

    await recordVideoExport(user.id, {
      campaignId,
      exportId: exportRow.id,
      persona,
      slideCount: slidesForExport.length,
      charCount: estimatedCharCount,
    });

    const prepared = await prepareCampaignVideo({
      slides: slidesForExport,
      persona,
      preset,
      voiceQuality,
      aspectRatio: targetAspectRatio,
      burnCaptions,
      narrationFingerprint: fingerprints.narrationFingerprint,
      usage: {
        userId: user.id,
        campaignId,
      },
      reusedAudioUrl,
    });

    const slideClips = buildStoredSlideClips(prepared);
    const composeMetadata = buildComposeStageMetadata({
      preset,
      voiceQuality,
      persona,
      aspectRatio: targetAspectRatio,
      prepared,
      slideClips,
      narrationFingerprint: fingerprints.narrationFingerprint,
      slideFingerprints: fingerprints.slides,
      reusedNarration: Boolean(reusedAudioUrl),
      burnCaptions,
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

    return NextResponse.json({
      success: true,
      exportId,
      status: "processing",
      ...(fastPath ? { fastPath } : {}),
      ...(reusedAudioUrl ? { reusedNarration: true } : {}),
    });
  } catch (error) {
    if (exportId) {
      try {
        const admin = createAdminClient();
        const message =
          error instanceof Error ? error.message : "Video export failed";
        await admin
          .from("exports")
          .update({ status: "failed", error_message: message })
          .eq("id", exportId);
      } catch {
        // Best-effort; don't let this shadow the original error.
      }
    }

    if (isUsageLimitError(error)) {
      return NextResponse.json(error.toJSON(), { status: 429 });
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
