import type { Slide } from "@/types/campaign";
import {
  buildNarrationCacheKey,
  buildNarrationCachePath,
} from "@/utils/tts/narration-cache-keys";
import {
  getCachedNarrationAudio,
  setCachedNarrationAudio,
} from "@/utils/tts/narration-cache";
import {
  buildNarrationTimingsCachePath,
  getCachedNarrationTimings,
  setCachedNarrationTimings,
} from "@/utils/tts/narration-timings-cache";
import { normalizeVoiceoverScript } from "@/utils/tts/normalize-script";
import { getVoiceIdForPersona, type VoicePersona } from "@/utils/tts/voice-catalog";
import { getTtsProvider } from "@/utils/tts/provider";
import {
  resolveTtsModelId,
  type TtsModelId,
  type TtsUsageContext,
  type VoiceQuality,
  type WordTiming,
} from "@/utils/tts/types";
import JSZip from "jszip";

export interface CampaignNarrationSlide {
  slideIndex: number;
  filename: string;
  audio: Buffer;
  charCount: number;
  wordTimings?: WordTiming[];
  timingSource?: "elevenlabs" | "estimated";
}

export interface SynthesizeCampaignNarrationInput {
  slides: Slide[];
  persona?: VoicePersona;
  voiceId?: string;
  modelId?: TtsModelId;
  voiceQuality?: VoiceQuality;
  withTimestamps?: boolean;
  usage: TtsUsageContext;
}

function padSlideIndex(index: number): string {
  return String(index + 1).padStart(2, "0");
}

export async function synthesizeCampaignNarration(
  input: SynthesizeCampaignNarrationInput,
): Promise<CampaignNarrationSlide[]> {
  const sortedSlides = [...input.slides].sort(
    (left, right) => left.slide_index - right.slide_index,
  );

  const slidesWithScript = sortedSlides.filter((slide) =>
    Boolean(slide.voiceover_script?.trim()),
  );

  if (slidesWithScript.length === 0) {
    throw new Error("No voiceover scripts found for campaign slides");
  }

  const voiceId =
    input.voiceId ??
    getVoiceIdForPersona(input.persona ?? "warm");
  const modelId =
    input.modelId ?? resolveTtsModelId(input.voiceQuality ?? "standard");
  const provider = getTtsProvider();
  const userId = input.usage.userId;
  const campaignId = input.usage.campaignId;

  const results = await Promise.all(
    slidesWithScript.map(async (slide) => {
      const normalizedText = normalizeVoiceoverScript(slide.voiceover_script!);

      if (!normalizedText) {
        throw new Error(
          `Slide ${slide.slide_index + 1} has an empty voiceover script after normalization`,
        );
      }

      const cacheKey = buildNarrationCacheKey(voiceId, normalizedText, modelId);
      const cachePath =
        campaignId && slide.id
          ? buildNarrationCachePath(userId, campaignId, slide.id, cacheKey)
          : null;
      const timingsCachePath =
        cachePath && campaignId && slide.id
          ? buildNarrationTimingsCachePath(
              userId,
              campaignId,
              slide.id,
              cacheKey,
            )
          : null;

      if (cachePath) {
        const cachedAudio = await getCachedNarrationAudio(cachePath);

        if (cachedAudio) {
          const cachedTimings = timingsCachePath
            ? await getCachedNarrationTimings(timingsCachePath)
            : null;

          return {
            slideIndex: slide.slide_index,
            filename: `slide-${padSlideIndex(slide.slide_index)}.mp3`,
            audio: cachedAudio,
            charCount: normalizedText.length,
            wordTimings: cachedTimings?.words,
            timingSource: cachedTimings?.source,
          };
        }
      }

      const result = await provider.synthesize({
        text: slide.voiceover_script!,
        voiceId,
        modelId,
        withTimestamps: input.withTimestamps,
        usage: {
          userId,
          campaignId,
          slideId: slide.id,
        },
      });

      if (cachePath) {
        await setCachedNarrationAudio(cachePath, result.audio);
      }

      if (timingsCachePath && result.wordTimings?.length) {
        await setCachedNarrationTimings(timingsCachePath, {
          source: result.timingSource ?? "elevenlabs",
          words: result.wordTimings,
        });
      }

      return {
        slideIndex: slide.slide_index,
        filename: `slide-${padSlideIndex(slide.slide_index)}.mp3`,
        audio: result.audio,
        charCount: result.charCount,
        wordTimings: result.wordTimings,
        timingSource: result.timingSource,
      };
    }),
  );

  return results;
}

export async function buildNarrationZip(
  slides: CampaignNarrationSlide[],
): Promise<Uint8Array> {
  const zip = new JSZip();

  for (const slide of slides) {
    zip.file(slide.filename, slide.audio);
  }

  const buffers = slides.map((slide) => slide.audio);
  if (buffers.length > 0) {
    zip.file("full-narration.mp3", Buffer.concat(buffers));
  }

  return zip.generateAsync({ type: "uint8array" });
}

export function getNarrationZipFilename(campaignTitle: string | null, campaignId: string): string {
  const base =
    campaignTitle
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || `campaign-${campaignId.slice(0, 8)}`;

  return `${base}-narration.zip`;
}
