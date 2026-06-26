import {
  buildAssCacheKey,
  buildAssTrack,
  BURN_CAPTION_STYLE_V1,
} from "@/utils/captions/build-ass-track";
import {
  buildAssStoragePath,
  getCachedAssTrack,
  setCachedAssTrack,
} from "@/utils/captions/ass-cache";
import {
  burnCaptionsIntoVideo,
  logBurnCaptionsStage,
} from "@/utils/burn-captions-video";
import { uploadFalMedia } from "@/utils/fal-video";
import { getMp3DurationSeconds } from "@/utils/merge-mp3-buffers";
import { captionOffsetForVideoCompose } from "@/utils/captions/caption-video-sync";
import { VIDEO_CROSSFADE_SECONDS } from "@/utils/compose-slide-video";
import {
  estimateWordTimingsForScript,
  offsetWordTimings,
} from "@/utils/tts/estimate-word-timings";
import type { WordTiming } from "@/utils/tts/types";
import { getVideoDimensions } from "@/utils/video-dimensions";

export interface SlideNarrationTimingInput {
  slideIndex: number;
  script: string;
  audio: Buffer;
  wordTimings?: WordTiming[];
  timingSource?: "elevenlabs" | "estimated";
}

export interface PrepareBurnCaptionsInput {
  userId: string;
  campaignId: string;
  narrationFingerprint: string;
  aspectRatio: "4:5" | "9:16";
  slides: SlideNarrationTimingInput[];
}

export interface PreparedBurnCaptions {
  assCacheKey: string;
  assStoragePath: string;
  assContent: string;
  timingSource: "elevenlabs" | "estimated" | "mixed";
  alignmentMs: number;
  assGenerationMs: number;
}

async function resolveGlobalWordTimings(
  slides: SlideNarrationTimingInput[],
): Promise<{ words: WordTiming[]; source: PreparedBurnCaptions["timingSource"] }> {
  const startedAt = Date.now();
  const globalWords: WordTiming[] = [];
  let offsetSeconds = 0;
  let hasElevenLabs = false;
  let hasEstimated = false;

  for (const slide of slides) {
    const durationSeconds = await getMp3DurationSeconds(slide.audio);
    const videoOffsetSeconds = captionOffsetForVideoCompose(
      offsetSeconds,
      slide.slideIndex,
      VIDEO_CROSSFADE_SECONDS,
    );
    let slideWords: WordTiming[];

    if (slide.wordTimings && slide.wordTimings.length > 0) {
      slideWords = offsetWordTimings(slide.wordTimings, videoOffsetSeconds);
      if (slide.timingSource === "elevenlabs") {
        hasElevenLabs = true;
      } else {
        hasEstimated = true;
      }
    } else {
      slideWords = estimateWordTimingsForScript(
        slide.script,
        durationSeconds,
        videoOffsetSeconds,
      );
      hasEstimated = true;
    }

    globalWords.push(...slideWords);
    offsetSeconds += durationSeconds;
  }

  logBurnCaptionsStage("prepare", "alignment", {
    durationMs: Date.now() - startedAt,
    slideCount: slides.length,
    wordCount: globalWords.length,
    source: hasElevenLabs && hasEstimated
      ? "mixed"
      : hasElevenLabs
        ? "elevenlabs"
        : "estimated",
  });

  return {
    words: globalWords,
    source:
      hasElevenLabs && hasEstimated
        ? "mixed"
        : hasElevenLabs
          ? "elevenlabs"
          : "estimated",
  };
}

export async function prepareBurnCaptionsAss(
  input: PrepareBurnCaptionsInput,
): Promise<PreparedBurnCaptions> {
  const assCacheKey = buildAssCacheKey(
    input.narrationFingerprint,
    input.aspectRatio,
    BURN_CAPTION_STYLE_V1.version,
  );
  const assStoragePath = buildAssStoragePath(
    input.userId,
    input.campaignId,
    assCacheKey,
  );

  const cachedAss = await getCachedAssTrack(assStoragePath);
  if (cachedAss) {
    logBurnCaptionsStage("prepare", "ass_generation", {
      durationMs: 0,
      cached: true,
    });

    return {
      assCacheKey,
      assStoragePath,
      assContent: cachedAss,
      timingSource: "estimated",
      alignmentMs: 0,
      assGenerationMs: 0,
    };
  }

  const alignmentStartedAt = Date.now();
  const { words, source } = await resolveGlobalWordTimings(input.slides);
  const alignmentMs = Date.now() - alignmentStartedAt;

  const assStartedAt = Date.now();
  const { width, height } = getVideoDimensions(input.aspectRatio);
  const assContent = buildAssTrack({ words, width, height });
  await setCachedAssTrack(assStoragePath, assContent);
  const assGenerationMs = Date.now() - assStartedAt;

  logBurnCaptionsStage("prepare", "ass_generation", {
    durationMs: assGenerationMs,
    cached: false,
    wordCount: words.length,
  });

  return {
    assCacheKey,
    assStoragePath,
    assContent,
    timingSource: source,
    alignmentMs,
    assGenerationMs,
  };
}

export async function burnCaptionsOnMergedVideo(input: {
  exportId: string;
  videoUrl: string;
  assStoragePath?: string;
  assContent?: string;
}): Promise<string> {
  const assContent =
    input.assContent ??
    (input.assStoragePath
      ? await getCachedAssTrack(input.assStoragePath)
      : null);
  if (!assContent) {
    throw new Error("Cached ASS track missing for burned captions export");
  }

  const downloadStartedAt = Date.now();
  const videoResponse = await fetch(input.videoUrl);
  if (!videoResponse.ok) {
    throw new Error("Failed to download merged video for caption burn");
  }

  const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
  logBurnCaptionsStage(input.exportId, "ffmpeg_burn", {
    durationMs: Date.now() - downloadStartedAt,
    phase: "download",
    bytesIn: videoBuffer.length,
  });

  const burnStartedAt = Date.now();
  const burnedBuffer = await burnCaptionsIntoVideo(videoBuffer, assContent);
  logBurnCaptionsStage(input.exportId, "ffmpeg_burn", {
    durationMs: Date.now() - burnStartedAt,
    phase: "ffmpeg",
    bytesOut: burnedBuffer.length,
  });

  const uploadStartedAt = Date.now();
  const burnedUrl = await uploadFalMedia(
    burnedBuffer,
    "video/mp4",
    "campaign-video-burned-captions.mp4",
  );
  logBurnCaptionsStage(input.exportId, "ffmpeg_burn", {
    durationMs: Date.now() - uploadStartedAt,
    phase: "upload",
  });

  return burnedUrl;
}
