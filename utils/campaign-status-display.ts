import type { CampaignStatus } from "@/types/campaign";

export function formatCampaignGenerationStatus(status: CampaignStatus): string {
  switch (status) {
    case "generating_text":
      return "Writing slide copy";
    case "generating_images":
      return "Generating images";
    case "completed":
      return "Ready";
    case "failed":
      return "Failed";
    default:
      return "In progress";
  }
}

export function formatCampaignDetailsProgress(input: {
  slideCount: number;
  imagesReadyCount: number;
  imagesComplete: boolean;
  captionsCount: number;
  hasVideoExport: boolean;
  youtubeAlreadyPublished: boolean;
  tiktokAlreadyPublished?: boolean;
}): string {
  const parts: string[] = [];

  if (input.slideCount > 0) {
    parts.push(
      input.imagesComplete
        ? `${input.slideCount}/${input.slideCount} images`
        : `${input.imagesReadyCount}/${input.slideCount} images`,
    );
  }

  if (input.captionsCount > 0) {
    parts.push("Captions ready");
  }

  if (input.hasVideoExport) {
    parts.push("Video exported");
  }

  const tiktokAlreadyPublished = input.tiktokAlreadyPublished ?? false;

  if (input.youtubeAlreadyPublished && tiktokAlreadyPublished) {
    parts.push("Published");
  } else if (input.youtubeAlreadyPublished) {
    parts.push("On YouTube");
  } else if (tiktokAlreadyPublished) {
    parts.push("On TikTok");
  }

  return parts.length > 0 ? parts.join(" · ") : "Getting started";
}
