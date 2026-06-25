import { fal } from "@fal-ai/client";

/** Legacy Fal pipeline — only used to poll in-flight exports from older builds. */
export const FAL_IMAGES_TO_VIDEO_MODEL = "fal-ai/ffmpeg-api/images-to-video";
export const FAL_MERGE_AUDIO_VIDEO_MODEL =
  "fal-ai/ffmpeg-api/merge-audio-video";

export const VIDEO_EXPORT_FPS = 24;

import type { AspectRatio } from "@/types/campaign";
import type { VoiceQuality } from "@/utils/tts/types";
import type { VideoExportPreset } from "@/utils/video-export-presets";
import type { SlideExportFingerprint } from "@/utils/video-export-fingerprint";

export type VideoExportPipelineStage =
  | "compose_slides"
  | "images_to_video"
  | "merge_audio"
  | "burn_captions";

export interface StoredSlideClip {
  imageUrl: string;
  durationSeconds: number;
}

export interface VideoExportMetadata {
  stage: VideoExportPipelineStage;
  preset?: VideoExportPreset;
  voiceQuality?: VoiceQuality;
  persona?: string;
  aspectRatio?: AspectRatio;
  audioUrl?: string;
  silentVideoUrl?: string;
  pendingVideoUrl?: string;
  slideClips?: StoredSlideClip[];
  composeStarted?: boolean;
  narrationFingerprint?: string;
  slideFingerprints?: SlideExportFingerprint[];
  reusedNarration?: boolean;
  burnCaptions?: boolean;
  assStoragePath?: string;
  assContent?: string;
  timingMs?: {
    alignment?: number;
    assGeneration?: number;
    ffmpegBurn?: number;
  };
}

interface FalQueueResponse {
  request_id: string;
}

interface FalFilePayload {
  url?: string;
}

export interface FalVideoWebhookPayload {
  request_id: string;
  status: "OK" | "ERROR";
  error?: string;
  payload?: {
    video?: FalFilePayload;
  };
}

function getFalKey(): string {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    throw new Error("FAL_KEY is not configured");
  }
  return falKey;
}

function configureFalClient(): void {
  fal.config({
    credentials: getFalKey(),
  });
}

export async function uploadFalMedia(
  buffer: Buffer,
  contentType: string,
  fileName: string,
): Promise<string> {
  configureFalClient();

  const blob = new Blob([new Uint8Array(buffer)], { type: contentType });
  const file = new File([blob], fileName, { type: contentType });
  const url = await fal.storage.upload(file);

  if (!url) {
    throw new Error("Fal storage upload did not return a URL");
  }

  return url;
}

export async function submitFalVideoQueue(
  model: string,
  input: Record<string, unknown>,
  webhookUrl: string,
): Promise<string> {
  const endpoint = `https://queue.fal.run/${model}?fal_webhook=${encodeURIComponent(webhookUrl)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Key ${getFalKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Fal video queue submission failed: ${errorBody}`);
  }

  const data = (await response.json()) as FalQueueResponse;

  if (!data.request_id) {
    throw new Error("Fal video queue response did not include request_id");
  }

  return data.request_id;
}

export async function submitMergeAudioVideoQueue(
  videoUrl: string,
  audioUrl: string,
  webhookUrl: string,
): Promise<string> {
  return submitFalVideoQueue(
    FAL_MERGE_AUDIO_VIDEO_MODEL,
    {
      video_url: videoUrl,
      audio_url: audioUrl,
    },
    webhookUrl,
  );
}

export function extractVideoUrlFromWebhook(
  body: FalVideoWebhookPayload,
): string | null {
  return body.payload?.video?.url ?? null;
}

interface FalQueueStatusResponse {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
}

interface FalVideoResultResponse {
  video?: { url?: string };
}

export async function isFalQueueCompleted(
  model: string,
  requestId: string,
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://queue.fal.run/${model}/requests/${requestId}/status`,
      { headers: { Authorization: `Key ${getFalKey()}` } },
    );
    if (!response.ok) return false;
    const data = (await response.json()) as FalQueueStatusResponse;
    return data.status === "COMPLETED";
  } catch {
    return false;
  }
}

export async function fetchFalVideoUrl(
  model: string,
  requestId: string,
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://queue.fal.run/${model}/requests/${requestId}`,
      { headers: { Authorization: `Key ${getFalKey()}` } },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as FalVideoResultResponse;
    return data.video?.url ?? null;
  } catch {
    return null;
  }
}

export function parseVideoExportMetadata(
  value: unknown,
): VideoExportMetadata | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const stage = record.stage;

  if (
    stage !== "compose_slides" &&
    stage !== "images_to_video" &&
    stage !== "merge_audio" &&
    stage !== "burn_captions"
  ) {
    return null;
  }

  const preset = record.preset;
  const voiceQuality = record.voiceQuality;

  return {
    stage,
    preset:
      preset === "quick_reel" || preset === "silent_captions"
        ? preset
        : undefined,
    voiceQuality:
      voiceQuality === "standard" || voiceQuality === "studio"
        ? voiceQuality
        : undefined,
    persona: typeof record.persona === "string" ? record.persona : undefined,
    audioUrl: typeof record.audioUrl === "string" ? record.audioUrl : undefined,
    silentVideoUrl:
      typeof record.silentVideoUrl === "string"
        ? record.silentVideoUrl
        : undefined,
    pendingVideoUrl:
      typeof record.pendingVideoUrl === "string"
        ? record.pendingVideoUrl
        : undefined,
    aspectRatio:
      record.aspectRatio === "4:5" || record.aspectRatio === "9:16"
        ? record.aspectRatio
        : undefined,
    slideClips: parseStoredSlideClips(record.slideClips),
    composeStarted:
      typeof record.composeStarted === "boolean"
        ? record.composeStarted
        : undefined,
    narrationFingerprint:
      typeof record.narrationFingerprint === "string"
        ? record.narrationFingerprint
        : undefined,
    slideFingerprints: parseStoredSlideFingerprints(record.slideFingerprints),
    reusedNarration:
      typeof record.reusedNarration === "boolean"
        ? record.reusedNarration
        : undefined,
    burnCaptions:
      typeof record.burnCaptions === "boolean"
        ? record.burnCaptions
        : undefined,
    assStoragePath:
      typeof record.assStoragePath === "string"
        ? record.assStoragePath
        : undefined,
    assContent:
      typeof record.assContent === "string" ? record.assContent : undefined,
    timingMs: parseTimingMs(record.timingMs),
  };
}

function parseTimingMs(
  value: unknown,
): VideoExportMetadata["timingMs"] | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;

  return {
    alignment:
      typeof record.alignment === "number" ? record.alignment : undefined,
    assGeneration:
      typeof record.assGeneration === "number"
        ? record.assGeneration
        : undefined,
    ffmpegBurn:
      typeof record.ffmpegBurn === "number" ? record.ffmpegBurn : undefined,
  };
}

function parseStoredSlideFingerprints(
  value: unknown,
): SlideExportFingerprint[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const fingerprints = value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const slideId =
        typeof record.slideId === "string" ? record.slideId : null;
      const slideIndex =
        typeof record.slideIndex === "number" ? record.slideIndex : null;
      const imageFingerprint =
        typeof record.imageFingerprint === "string"
          ? record.imageFingerprint
          : null;
      const scriptFingerprint =
        typeof record.scriptFingerprint === "string"
          ? record.scriptFingerprint
          : null;

      if (
        !slideId ||
        slideIndex === null ||
        !imageFingerprint ||
        !scriptFingerprint
      ) {
        return null;
      }

      return {
        slideId,
        slideIndex,
        imageFingerprint,
        scriptFingerprint,
      };
    })
    .filter((entry): entry is SlideExportFingerprint => entry !== null);

  return fingerprints.length > 0 ? fingerprints : undefined;
}

function parseStoredSlideClips(value: unknown): StoredSlideClip[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const clips = value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const imageUrl =
        typeof record.imageUrl === "string" ? record.imageUrl : null;
      const durationSeconds =
        typeof record.durationSeconds === "number"
          ? record.durationSeconds
          : null;

      if (!imageUrl || durationSeconds === null) {
        return null;
      }

      return {
        imageUrl,
        durationSeconds,
      } satisfies StoredSlideClip;
    })
    .filter((entry): entry is StoredSlideClip => entry !== null);

  return clips.length > 0 ? clips : undefined;
}
