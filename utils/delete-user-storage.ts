import { REFERENCE_BUCKET } from "@/utils/upload-reference";
import { TTS_CACHE_BUCKET } from "@/utils/tts/narration-cache";
import type { SupabaseClient } from "@supabase/supabase-js";

async function collectStoragePaths(
  admin: SupabaseClient,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const { data, error } = await admin.storage
    .from(bucket)
    .list(prefix, { limit: 1000 });

  if (error || !data?.length) {
    return [];
  }

  const paths: string[] = [];

  for (const entry of data) {
    const entryPath = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.id === null) {
      paths.push(...(await collectStoragePaths(admin, bucket, entryPath)));
      continue;
    }

    paths.push(entryPath);
  }

  return paths;
}

export async function deleteUserReferenceStorage(
  admin: SupabaseClient,
  userId: string,
): Promise<void> {
  await deleteStoragePrefix(admin, REFERENCE_BUCKET, userId);
}

export async function deleteUserTtsCacheStorage(
  admin: SupabaseClient,
  userId: string,
): Promise<void> {
  await deleteStoragePrefix(admin, TTS_CACHE_BUCKET, userId);
}

async function deleteStoragePrefix(
  admin: SupabaseClient,
  bucket: string,
  prefix: string,
): Promise<void> {
  const paths = await collectStoragePaths(admin, bucket, prefix);

  if (paths.length === 0) {
    return;
  }

  const batchSize = 100;

  for (let index = 0; index < paths.length; index += batchSize) {
    const batch = paths.slice(index, index + batchSize);
    const { error } = await admin.storage.from(bucket).remove(batch);

    if (error) {
      throw new Error(error.message);
    }
  }
}
