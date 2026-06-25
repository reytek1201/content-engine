import { createAdminClient } from "@/utils/supabase/admin";
import { TTS_CACHE_BUCKET } from "@/utils/tts/narration-cache";

export function buildAssStoragePath(
  userId: string,
  campaignId: string,
  cacheKey: string,
): string {
  return `${userId}/${campaignId}/ass/${cacheKey}.ass`;
}

export async function getCachedAssTrack(
  storagePath: string,
): Promise<string | null> {
  const admin = createAdminClient();

  const { data, error } = await admin.storage
    .from(TTS_CACHE_BUCKET)
    .download(storagePath);

  if (error || !data) {
    return null;
  }

  return await data.text();
}

export async function setCachedAssTrack(
  storagePath: string,
  assContent: string,
): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin.storage.from(TTS_CACHE_BUCKET).upload(
    storagePath,
    assContent,
    {
      contentType: "text/plain",
      upsert: true,
    },
  );

  if (error) {
    throw new Error(`Failed to cache ASS track: ${error.message}`);
  }
}
