import {
  normalizePublicWebsiteUrl,
  PublicUrlFetchError,
} from "@/utils/fetch-public-url";
import {
  ALLOWED_REFERENCE_MIME_TYPES,
  MAX_REFERENCE_FILE_BYTES,
  REFERENCE_BUCKET,
} from "@/utils/upload-reference";
import type { SupabaseClient } from "@supabase/supabase-js";

const IMAGE_FETCH_TIMEOUT_MS = 10_000;

function extensionForMimeType(mimeType: string): string {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }

  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return "jpg";
}

async function readImageWithLimit(
  response: Response,
  maxBytes: number,
): Promise<Buffer> {
  const contentLength = response.headers.get("content-length");

  if (contentLength && Number(contentLength) > maxBytes) {
    throw new PublicUrlFetchError("Product image is too large");
  }

  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.byteLength > maxBytes) {
      throw new PublicUrlFetchError("Product image is too large");
    }

    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    totalBytes += value.byteLength;

    if (totalBytes > maxBytes) {
      throw new PublicUrlFetchError("Product image is too large");
    }

    chunks.push(value);
  }

  return Buffer.concat(chunks);
}

export async function uploadIngestedProductImage(
  supabase: SupabaseClient,
  userId: string,
  imageUrl: string,
): Promise<string | null> {
  try {
    const normalizedUrl = normalizePublicWebsiteUrl(imageUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(normalizedUrl, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          "User-Agent":
            "SlidePressBot/1.0 (+https://www.slidepress.co; website campaign ingest)",
        },
      });

      if (!response.ok) {
        return null;
      }

      const mimeType = (response.headers.get("content-type") ?? "")
        .split(";")[0]
        .trim()
        .toLowerCase();

      if (
        !ALLOWED_REFERENCE_MIME_TYPES.includes(
          mimeType as (typeof ALLOWED_REFERENCE_MIME_TYPES)[number],
        )
      ) {
        return null;
      }

      const buffer = await readImageWithLimit(
        response,
        MAX_REFERENCE_FILE_BYTES,
      );

      if (buffer.byteLength === 0) {
        return null;
      }

      const extension = extensionForMimeType(mimeType);
      const path = `${userId}/${crypto.randomUUID()}/product-ingest.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(REFERENCE_BUCKET)
        .upload(path, buffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        return null;
      }

      const { data } = supabase.storage
        .from(REFERENCE_BUCKET)
        .getPublicUrl(path);

      return data.publicUrl;
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return null;
  }
}
