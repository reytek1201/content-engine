import { createAdminClient } from "@/utils/supabase/admin";

export const TTS_CACHE_BUCKET = "tts-cache";

export async function getCachedNarrationAudio(
  storagePath: string,
): Promise<Buffer | null> {
  const admin = createAdminClient();

  const { data, error } = await admin.storage
    .from(TTS_CACHE_BUCKET)
    .download(storagePath);

  if (error || !data) {
    return null;
  }

  return Buffer.from(await data.arrayBuffer());
}

export async function setCachedNarrationAudio(
  storagePath: string,
  audio: Buffer,
): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin.storage.from(TTS_CACHE_BUCKET).upload(
    storagePath,
    audio,
    {
      contentType: "audio/mpeg",
      upsert: true,
    },
  );

  if (error) {
    console.warn("Failed to cache TTS narration:", error.message);
  }
}
