import { createAdminClient } from "@/utils/supabase/admin";
import { TTS_CACHE_BUCKET } from "@/utils/tts/narration-cache";
import type { CachedWordTimings } from "@/utils/tts/types";

export function buildNarrationTimingsCachePath(
  userId: string,
  campaignId: string,
  slideId: string,
  cacheKey: string,
): string {
  return `${userId}/${campaignId}/${slideId}/${cacheKey}.timings.json`;
}

export async function getCachedNarrationTimings(
  storagePath: string,
): Promise<CachedWordTimings | null> {
  const admin = createAdminClient();

  const { data, error } = await admin.storage
    .from(TTS_CACHE_BUCKET)
    .download(storagePath);

  if (error || !data) {
    return null;
  }

  try {
    const parsed = JSON.parse(await data.text()) as CachedWordTimings;
    if (!parsed?.words || !Array.isArray(parsed.words)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function setCachedNarrationTimings(
  storagePath: string,
  timings: CachedWordTimings,
): Promise<void> {
  const admin = createAdminClient();
  const body = JSON.stringify(timings);

  const { error } = await admin.storage.from(TTS_CACHE_BUCKET).upload(
    storagePath,
    body,
    {
      contentType: "application/json",
      upsert: true,
    },
  );

  if (error) {
    console.warn("Failed to cache TTS word timings:", error.message);
  }
}
