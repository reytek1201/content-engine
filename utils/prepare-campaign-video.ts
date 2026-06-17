import type { Slide } from "@/types/campaign";
import {
  buildCaptionSegmentsFromDurations,
  estimateSlideDurationSeconds,
  type CaptionSegment,
} from "@/utils/build-caption-srt";
import {
  framesForAudioDuration,
  uploadFalMedia,
  type FalVideoImageFrame,
} from "@/utils/fal-video";
import { concatMp3Buffers, getMp3DurationSeconds } from "@/utils/merge-mp3-buffers";
import { synthesizeCampaignNarration } from "@/utils/tts/synthesize-campaign-narration";
import { resolveTtsModelId, type VoiceQuality } from "@/utils/tts/types";
import type { VoicePersona } from "@/utils/tts/voice-catalog";
import type { TtsUsageContext } from "@/utils/tts/types";
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
}

export interface PrepareCampaignVideoResult {
  imageFrames: FalVideoImageFrame[];
  audioUrl?: string;
  captionSegments: CaptionSegment[];
  slideCount: number;
  totalChars: number;
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

  const imageFrames: FalVideoImageFrame[] = [];
  let totalChars = 0;

  if (includeNarration) {
    const narrationSlides = await synthesizeCampaignNarration({
      slides: sortedSlides,
      persona: input.persona,
      modelId,
      usage: input.usage,
    });

    const narrationByIndex = new Map(
      narrationSlides.map((slide) => [slide.slideIndex, slide]),
    );

    const audioBuffers: Buffer[] = [];
    const durationsSeconds: number[] = [];

    for (const slide of sortedSlides) {
      const narration = narrationByIndex.get(slide.slide_index);

      if (!narration) {
        throw new Error(`Missing narration for slide ${slide.slide_index + 1}`);
      }

      const durationSeconds = await getMp3DurationSeconds(narration.audio);
      durationsSeconds.push(durationSeconds);
      imageFrames.push({
        url: slide.image_url!,
        frames: framesForAudioDuration(durationSeconds),
      });
      audioBuffers.push(narration.audio);
      totalChars += narration.charCount;
    }

    const mergedAudio = await concatMp3Buffers(audioBuffers);
    const audioUrl = await uploadFalMedia(
      mergedAudio,
      "audio/mpeg",
      "campaign-narration.mp3",
    );

    return {
      imageFrames,
      audioUrl,
      captionSegments: buildCaptionSegmentsFromDurations(
        scripts,
        durationsSeconds,
      ),
      slideCount: sortedSlides.length,
      totalChars,
    };
  }

  const durationsSeconds = scripts.map((script) =>
    estimateSlideDurationSeconds(script),
  );

  for (let index = 0; index < sortedSlides.length; index++) {
    const slide = sortedSlides[index]!;
    const durationSeconds = durationsSeconds[index]!;
    imageFrames.push({
      url: slide.image_url!,
      frames: framesForAudioDuration(durationSeconds),
    });
    totalChars += scripts[index]!.length;
  }

  return {
    imageFrames,
    captionSegments: buildCaptionSegmentsFromDurations(
      scripts,
      durationsSeconds,
    ),
    slideCount: sortedSlides.length,
    totalChars,
  };
}
