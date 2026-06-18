import {
  buildNarrationZip,
  getNarrationZipFilename,
  synthesizeCampaignNarration,
} from "@/utils/tts/synthesize-campaign-narration";
import { resolveCampaignVoicePersona } from "@/utils/tts/resolve-campaign-persona";
import { isTtsError } from "@/utils/tts/types";
import { TTS_EXPORT_DISCLOSURE } from "@/utils/tts/disclosure-copy";
import type { VoicePersona } from "@/utils/tts/voice-catalog";
import {
  assertTtsAudioExportLimit,
  isUsageLimitError,
  recordTtsAudioExport,
} from "@/utils/usage-limits";
import {
  assertTtsExportRateLimit,
  isRateLimitError,
} from "@/utils/rate-limit";
import { createClient } from "@/utils/supabase/server";
import type { Campaign, Slide } from "@/types/campaign";
import { NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  campaignId: z.string().uuid(),
  persona: z.enum(["warm", "energetic", "professional"]).optional(),
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

    assertTtsExportRateLimit(user.id);

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

    const { campaignId, persona: personaOverride, voiceQuality: voiceQualityInput } =
      parsedInput.data;
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
    const hasVoiceoverScripts = typedSlides.some((slide) =>
      Boolean(slide.voiceover_script?.trim()),
    );

    if (!hasVoiceoverScripts) {
      return NextResponse.json(
        {
          success: false,
          error: "No voiceover scripts found for this campaign",
        },
        { status: 422 },
      );
    }

    await assertTtsAudioExportLimit(supabase, user.id);

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
        export_type: "audio",
        status: "processing",
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

    const narrationSlides = await synthesizeCampaignNarration({
      slides: typedSlides,
      persona,
      voiceQuality,
      usage: {
        userId: user.id,
        campaignId,
      },
    });

    const zipBytes = await buildNarrationZip(narrationSlides);
    const filename = getNarrationZipFilename(typedCampaign.title, campaignId);
    const totalChars = narrationSlides.reduce(
      (sum, slide) => sum + slide.charCount,
      0,
    );

    await recordTtsAudioExport(user.id, {
      campaignId,
      persona,
      slideCount: narrationSlides.length,
      charCount: totalChars,
    });

    await supabase
      .from("exports")
      .update({
        status: "completed",
        error_message: null,
      })
      .eq("id", exportId);

    return new NextResponse(Buffer.from(zipBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-TTS-Slide-Count": String(narrationSlides.length),
        "X-TTS-Char-Count": String(totalChars),
        "X-TTS-Voice-Persona": persona,
        "X-TTS-Export-Disclosure": TTS_EXPORT_DISCLOSURE,
      },
    });
  } catch (error) {
    if (exportId) {
      const supabase = await createClient();
      const message =
        error instanceof Error ? error.message : "Audio export failed";

      await supabase
        .from("exports")
        .update({
          status: "failed",
          error_message: message,
        })
        .eq("id", exportId);
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
