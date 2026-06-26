import type { AspectRatio, Slide } from "@/types/campaign";
import { estimateSlideDurationSeconds } from "@/utils/build-caption-srt";
import { prepareBurnCaptionsAss } from "@/utils/captions/prepare-burn-captions";
import { uploadFalMedia } from "@/utils/fal-video";
import { concatMp3Buffers, getMp3DurationSeconds } from "@/utils/merge-mp3-buffers";
import { loadCampaignNarrationFromCache } from "@/utils/tts/load-campaign-narration-from-cache";
import { synthesizeCampaignNarration } from "@/utils/tts/synthesize-campaign-narration";
import { resolveTtsModelId, type VoiceQuality, type TtsUsageContext } from "@/utils/tts/types";
import type { VoicePersona } from "@/utils/tts/voice-catalog";
import {
  presetIncludesNarration,
  type VideoExportPreset,
} from "@/utils/video-export-presets";

export interface PrepareCampaignVideoInput {
  slides: Slide[];
  persona: VoicePersona;
  preset: VideoExportPreset;
  voiceQuality?: VoiceQuality;
  usage: TtsUsageContext;
  aspectRatio?: AspectRatio;
  burnCaptions?: boolean;
  narrationFingerprint?: string;
  /** Skip TTS synthesis and Fal audio upload when narration is unchanged. */
  reusedAudioUrl?: string;
}

export interface PreparedSlideClip {
  imageUrl: string;
  durationSeconds: number;
}

export interface PrepareCampaignVideoResult {
  slideClips: PreparedSlideClip[];
  audioUrl?: string;
  slideCount: number;
  totalChars: number;
  assStoragePath?: string;
  assContent?: string;
  burnCaptionTimingMs?: {
    alignment?: number;
    assGeneration?: number;
  };
}

export function assertVideoExportPreconditions(slides: Slide[]): void {
  const sortedSlides = [...slides].sort(
    (left, right) => left.slide_index - right.slide_index,
  );

  if (sortedSlides.length === 0) {
    throw new Error("No slides found for campaign");
  }

  const missingImages = sortedSlides.filter((slide) => !slide.image_url);
  if (missingImages.length > 0) {
    throw new Error("Generate all slide images before exporting video");
  }

  const missingScripts = sortedSlides.filter(
    (slide) => !slide.voiceover_script?.trim(),
  );
  if (missingScripts.length > 0) {
    throw new Error("Every slide needs a voiceover script before exporting video");
  }
}

export async function prepareCampaignVideo(
  input: PrepareCampaignVideoInput,
): Promise<PrepareCampaignVideoResult> {
  const sortedSlides = [...input.slides].sort(
    (left, right) => left.slide_index - right.slide_index,
  );

  assertVideoExportPreconditions(sortedSlides);

  const scripts = sortedSlides.map((slide) => slide.voiceover_script!.trim());
  const includeNarration = presetIncludesNarration(input.preset);
  const modelId = resolveTtsModelId(input.voiceQuality);

  const slideClips: PreparedSlideClip[] = [];
  let totalChars = 0;

  if (includeNarration) {
    let useReusedAudio = Boolean(input.reusedAudioUrl);
    let narrationSlides;
    const withTimestamps = Boolean(input.burnCaptions);

    if (useReusedAudio) {
      try {
        narrationSlides = await loadCampaignNarrationFromCache({
          slides: sortedSlides,
          persona: input.persona,
          modelId,
          usage: input.usage,
        });

        if (
          withTimestamps &&
          narrationSlides.some(
            (slide) => !slide.wordTimings || slide.wordTimings.length === 0,
          )
        ) {
          narrationSlides = await synthesizeCampaignNarration({
            slides: sortedSlides,
            persona: input.persona,
            modelId,
            withTimestamps: true,
            usage: input.usage,
          });
        }
      } catch (error) {
        console.warn(
          "Cached narration reuse failed; falling back to synthesis:",
          error instanceof Error ? error.message : error,
        );
        useReusedAudio = false;
        narrationSlides = await synthesizeCampaignNarration({
          slides: sortedSlides,
          persona: input.persona,
          modelId,
          withTimestamps,
          usage: input.usage,
        });
      }
    } else {
      narrationSlides = await synthesizeCampaignNarration({
        slides: sortedSlides,
        persona: input.persona,
        modelId,
        withTimestamps,
        usage: input.usage,
      });
    }

    const narrationByIndex = new Map(
      narrationSlides.map((slide) => [slide.slideIndex, slide]),
    );

    const audioBuffers: Buffer[] = [];
    let preparedAss:
      | Awaited<ReturnType<typeof prepareBurnCaptionsAss>>
      | undefined;

    if (
      input.burnCaptions &&
      input.narrationFingerprint &&
      input.aspectRatio &&
      input.usage.campaignId
    ) {
      preparedAss = await prepareBurnCaptionsAss({
        userId: input.usage.userId,
        campaignId: input.usage.campaignId,
        narrationFingerprint: input.narrationFingerprint,
        aspectRatio: input.aspectRatio,
        slides: sortedSlides.map((slide) => {
          const narration = narrationByIndex.get(slide.slide_index)!;
          return {
            slideIndex: slide.slide_index,
            script: slide.voiceover_script!.trim(),
            audio: narration.audio,
            wordTimings: narration.wordTimings,
            timingSource: narration.timingSource,
          };
        }),
      });
    }

    for (const slide of sortedSlides) {
      const narration = narrationByIndex.get(slide.slide_index);

      if (!narration) {
        throw new Error(`Missing narration for slide ${slide.slide_index + 1}`);
      }

      const durationSeconds = await getMp3DurationSeconds(narration.audio);
      slideClips.push({
        imageUrl: slide.image_url!,
        durationSeconds,
      });
      audioBuffers.push(narration.audio);
      totalChars += narration.charCount;
    }

    if (useReusedAudio && input.reusedAudioUrl) {
      return {
        slideClips,
        audioUrl: input.reusedAudioUrl,
        slideCount: sortedSlides.length,
        totalChars,
        assStoragePath: preparedAss?.assStoragePath,
        assContent: preparedAss?.assContent,
        burnCaptionTimingMs: preparedAss
          ? {
              alignment: preparedAss.alignmentMs,
              assGeneration: preparedAss.assGenerationMs,
            }
          : undefined,
      };
    }

    const mergedAudio = await concatMp3Buffers(audioBuffers);
    const audioUrl = await uploadFalMedia(
      mergedAudio,
      "audio/mpeg",
      "campaign-narration.mp3",
    );

    return {
      slideClips,
      audioUrl,
      slideCount: sortedSlides.length,
      totalChars,
      assStoragePath: preparedAss?.assStoragePath,
      assContent: preparedAss?.assContent,
      burnCaptionTimingMs: preparedAss
        ? {
            alignment: preparedAss.alignmentMs,
            assGeneration: preparedAss.assGenerationMs,
          }
        : undefined,
    };
  }

  for (let index = 0; index < sortedSlides.length; index++) {
    const slide = sortedSlides[index]!;
    const durationSeconds = estimateSlideDurationSeconds(scripts[index]!);
    slideClips.push({
      imageUrl: slide.image_url!,
      durationSeconds,
    });
    totalChars += scripts[index]!.length;
  }

  return {
    slideClips,
    slideCount: sortedSlides.length,
    totalChars,
  };
}
