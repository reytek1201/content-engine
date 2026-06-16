import type { Campaign, Slide } from "@/types/campaign";
import type { PlatformCaption } from "@/types/captions";
import { formatAllCaptionsForCopy } from "@/types/captions";
import JSZip from "jszip";
import { safeFetch } from "@/utils/safe-fetch";

function getImageExtension(imageUrl: string, contentType: string | null): string {
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("webp")) return "webp";
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) {
    return "jpg";
  }

  const pathname = new URL(imageUrl).pathname.toLowerCase();
  if (pathname.endsWith(".png")) return "png";
  if (pathname.endsWith(".webp")) return "webp";
  if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) return "jpg";

  return "png";
}

function sanitizeFilename(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function getCampaignZipFilename(campaign: Campaign): string {
  const base =
    sanitizeFilename(campaign.title ?? "campaign") || `campaign-${campaign.id.slice(0, 8)}`;
  return `${base}.zip`;
}

export async function buildCampaignZip(
  slides: Slide[],
  captions: PlatformCaption[] = []
): Promise<Uint8Array> {
  const sortedSlides = [...slides].sort(
    (left, right) => left.slide_index - right.slide_index
  );

  const missingImage = sortedSlides.find((slide) => !slide.image_url);
  if (missingImage) {
    throw new Error("All slides must have images before exporting");
  }

  const zip = new JSZip();

  const imageResults = await Promise.allSettled(
    sortedSlides.map(async (slide) => {
      const imageUrl = slide.image_url!;
      const response = await safeFetch(imageUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch slide ${slide.slide_index + 1} image`);
      }

      const buffer = await response.arrayBuffer();
      const extension = getImageExtension(imageUrl, response.headers.get("content-type"));

      return { slideIndex: slide.slide_index, buffer, extension };
    })
  );

  for (const result of imageResults) {
    if (result.status === "rejected") {
      throw result.reason instanceof Error
        ? result.reason
        : new Error(String(result.reason));
    }

    const { slideIndex, buffer, extension } = result.value;
    zip.file(
      `slides/slide-${String(slideIndex + 1).padStart(2, "0")}.${extension}`,
      buffer
    );
  }

  if (captions.length > 0) {
    zip.file("captions.txt", formatAllCaptionsForCopy(captions));
  }

  return zip.generateAsync({ type: "uint8array" });
}
