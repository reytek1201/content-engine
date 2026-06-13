import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReferenceType } from "@/types/references";

export const REFERENCE_BUCKET = "campaign-refs";
export const MAX_REFERENCE_FILE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_REFERENCE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

function getFileExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName === "jpg" || fromName === "jpeg") return "jpg";
  if (fromName === "png") return "png";
  if (fromName === "webp") return "webp";

  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";

  return "png";
}

export function validateReferenceFile(file: File): string | null {
  if (!ALLOWED_REFERENCE_MIME_TYPES.includes(file.type as (typeof ALLOWED_REFERENCE_MIME_TYPES)[number])) {
    return "Use a JPG, PNG, or WebP image";
  }

  if (file.size > MAX_REFERENCE_FILE_BYTES) {
    return "Image must be 5MB or smaller";
  }

  return null;
}

export async function uploadReferenceImage(
  supabase: SupabaseClient,
  file: File,
  userId: string,
  type: ReferenceType
): Promise<string> {
  const validationError = validateReferenceFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const extension = getFileExtension(file);
  const path = `${userId}/${crypto.randomUUID()}/${type}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(REFERENCE_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from(REFERENCE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
