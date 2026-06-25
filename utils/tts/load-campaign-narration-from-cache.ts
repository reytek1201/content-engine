import type { Slide } from "@/types/campaign";
import {
  buildNarrationCacheKey,
  buildNarrationCachePath,
} from "@/utils/tts/narration-cache-keys";
import { getCachedNarrationAudio } from "@/utils/tts/narration-cache";
import {
  buildNarrationTimingsCachePath,
  getCachedNarrationTimings,
} from "@/utils/tts/narration-timings-cache";
import { normalizeVoiceoverScript } from "@/utils/tts/normalize-script";
import type { CampaignNarrationSlide } from "@/utils/tts/synthesize-campaign-narration";
import { getVoiceIdForPersona, type VoicePersona } from "@/utils/tts/voice-catalog";
import type { TtsModelId, TtsUsageContext } from "@/utils/tts/types";

function padSlideIndex(index: number): string {
  return String(index + 1).padStart(2, "0");
}

/**
 * Loads per-slide narration MP3s from the TTS cache only — no ElevenLabs calls.
 * Used when narration fingerprints match a prior export (image-only video update).
 */
export async function loadCampaignNarrationFromCache(input: {
  slides: Slide[];
  persona: VoicePersona;
  modelId: TtsModelId;
  usage: TtsUsageContext;
}): Promise<CampaignNarrationSlide[]> {
  const voiceId = getVoiceIdForPersona(input.persona);
  const sortedSlides = [...input.slides].sort(
    (left, right) => left.slide_index - right.slide_index,
  );

  const { userId, campaignId } = input.usage;
  if (!campaignId) {
    throw new Error("Campaign ID is required to load cached narration");
  }

  const results: CampaignNarrationSlide[] = [];

  for (const slide of sortedSlides) {
    const normalizedText = normalizeVoiceoverScript(slide.voiceover_script ?? "");
    if (!normalizedText) {
      throw new Error(
        `Slide ${slide.slide_index + 1} has an empty voiceover script after normalization`,
      );
    }

    const cacheKey = buildNarrationCacheKey(
      voiceId,
      normalizedText,
      input.modelId,
    );
    const cachePath = buildNarrationCachePath(
      userId,
      campaignId,
      slide.id,
      cacheKey,
    );

    const cachedAudio = await getCachedNarrationAudio(cachePath);
    if (!cachedAudio) {
      throw new Error(
        `Cached narration missing for slide ${slide.slide_index + 1}`,
      );
    }

    const timingsCachePath = buildNarrationTimingsCachePath(
      userId,
      campaignId,
      slide.id,
      cacheKey,
    );
    const cachedTimings = await getCachedNarrationTimings(timingsCachePath);

    results.push({
      slideIndex: slide.slide_index,
      filename: `slide-${padSlideIndex(slide.slide_index)}.mp3`,
      audio: cachedAudio,
      charCount: normalizedText.length,
      wordTimings: cachedTimings?.words,
      timingSource: cachedTimings?.source,
    });
  }

  return results;
}
