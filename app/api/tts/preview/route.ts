import { getVoiceIdForPersona } from "@/utils/tts/voice-catalog";
import { isTtsError } from "@/utils/tts/types";
import { normalizeVoiceoverScript } from "@/utils/tts/normalize-script";
import { getTtsProvider } from "@/utils/tts/provider";
import { resolveCampaignVoicePersona } from "@/utils/tts/resolve-campaign-persona";
import {
  buildPreviewCacheKey,
  getCachedPreviewAudio,
  setCachedPreviewAudio,
} from "@/utils/tts/preview-cache";
import {
  buildNarrationCacheKey,
  buildNarrationCachePath,
} from "@/utils/tts/narration-cache-keys";
import {
  getCachedNarrationAudio,
  setCachedNarrationAudio,
} from "@/utils/tts/narration-cache";
import { TTS_PREVIEW_DISCLOSURE } from "@/utils/tts/disclosure-copy";
import {
  assertTtsPreviewLimit,
  isUsageLimitError,
  recordTtsPreview,
} from "@/utils/usage-limits";
import {
  assertTtsPreviewRateLimit,
  isRateLimitError,
} from "@/utils/rate-limit";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  campaignId: z.string().uuid(),
  slideId: z.string().uuid(),
  persona: z.enum(["warm", "energetic", "professional"]).optional(),
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

    assertTtsPreviewRateLimit(user.id);

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

    const { campaignId, slideId, persona: personaOverride } = parsedInput.data;

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, user_id, brand_id")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 },
      );
    }

    if (campaign.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const { data: slide, error: slideError } = await supabase
      .from("slides")
      .select("id, campaign_id, voiceover_script")
      .eq("id", slideId)
      .eq("campaign_id", campaignId)
      .single();

    if (slideError || !slide) {
      return NextResponse.json(
        { success: false, error: "Slide not found" },
        { status: 404 },
      );
    }

    const script = slide.voiceover_script?.trim();
    if (!script) {
      return NextResponse.json(
        { success: false, error: "This slide has no voiceover script" },
        { status: 422 },
      );
    }

    const persona = await resolveCampaignVoicePersona(
      supabase,
      campaign.brand_id,
      user.id,
      personaOverride,
    );
    const voiceId = getVoiceIdForPersona(persona);
    const normalizedText = normalizeVoiceoverScript(script);

    if (!normalizedText) {
      return NextResponse.json(
        { success: false, error: "Voiceover script is empty after normalization" },
        { status: 422 },
      );
    }

    const cacheKey = buildPreviewCacheKey(normalizedText, voiceId);
    const cachedAudio = getCachedPreviewAudio(cacheKey);
    const storageCachePath = buildNarrationCachePath(
      user.id,
      campaignId,
      slideId,
      buildNarrationCacheKey(voiceId, normalizedText),
    );

    if (cachedAudio) {
      return new NextResponse(new Uint8Array(cachedAudio), {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "private, max-age=86400",
          "X-TTS-Preview-Cached": "true",
          "X-TTS-Voice-Persona": persona,
        },
      });
    }

    const storageCachedAudio = await getCachedNarrationAudio(storageCachePath);

    if (storageCachedAudio) {
      setCachedPreviewAudio(cacheKey, storageCachedAudio);

      return new NextResponse(new Uint8Array(storageCachedAudio), {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "private, max-age=86400",
          "X-TTS-Preview-Cached": "true",
          "X-TTS-Voice-Persona": persona,
        },
      });
    }

    await assertTtsPreviewLimit(supabase, user.id);

    const result = await getTtsProvider().synthesize({
      text: normalizedText,
      voiceId,
      usage: {
        userId: user.id,
        campaignId,
        slideId,
      },
    });

    setCachedPreviewAudio(cacheKey, result.audio);
    await setCachedNarrationAudio(storageCachePath, result.audio);
    await recordTtsPreview(user.id, {
      campaignId,
      slideId,
      persona,
      charCount: result.charCount,
      cached: false,
    });

    return new NextResponse(new Uint8Array(result.audio), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-TTS-Char-Count": String(result.charCount),
        "X-TTS-Latency-Ms": String(result.latencyMs),
        "X-TTS-Voice-Persona": persona,
        "X-TTS-Preview-Disclosure": TTS_PREVIEW_DISCLOSURE,
      },
    });
  } catch (error) {
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
