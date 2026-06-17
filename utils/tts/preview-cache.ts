import { createHash } from "node:crypto";

const PREVIEW_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface PreviewCacheEntry {
  audio: Buffer;
  expiresAt: number;
}

const previewCache = new Map<string, PreviewCacheEntry>();

export function buildPreviewCacheKey(text: string, voiceId: string): string {
  return createHash("sha256")
    .update(`${voiceId}:${text}`)
    .digest("hex");
}

export function getCachedPreviewAudio(key: string): Buffer | null {
  const entry = previewCache.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    previewCache.delete(key);
    return null;
  }

  return entry.audio;
}

export function setCachedPreviewAudio(key: string, audio: Buffer): void {
  previewCache.set(key, {
    audio,
    expiresAt: Date.now() + PREVIEW_CACHE_TTL_MS,
  });
}

export function resetPreviewCache(): void {
  previewCache.clear();
}
