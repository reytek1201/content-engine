import { createHash } from "node:crypto";

const DEFAULT_TTS_MODEL_ID = "eleven_flash_v2_5";

export function buildNarrationCacheKey(
  voiceId: string,
  normalizedText: string,
  modelId: string = DEFAULT_TTS_MODEL_ID,
): string {
  return createHash("sha256")
    .update(`${modelId}:${voiceId}:${normalizedText}`)
    .digest("hex");
}

export function buildNarrationCachePath(
  userId: string,
  campaignId: string,
  slideId: string,
  cacheKey: string,
): string {
  return `${userId}/${campaignId}/${slideId}/${cacheKey}.mp3`;
}
