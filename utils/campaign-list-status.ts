export type CampaignListStatusId =
  | "generating"
  | "failed"
  | "needs_images"
  | "needs_captions"
  | "needs_video"
  | "ready_to_post"
  | "on_youtube"
  | "on_tiktok"
  | "published";

export interface CampaignListStatus {
  id: CampaignListStatusId;
  label: string;
  tone: "muted" | "amber" | "primary" | "emerald" | "red";
}

export function getCampaignListStatus(input: {
  campaignStatus: string;
  slideCount: number;
  imagesReadyCount: number;
  hasCaptions: boolean;
  hasVideoExport: boolean;
  youtubePublished: boolean;
  tiktokPublished?: boolean;
}): CampaignListStatus {
  const { campaignStatus, slideCount, imagesReadyCount, hasCaptions } = input;
  const tiktokPublished = input.tiktokPublished ?? false;

  if (campaignStatus === "failed") {
    return { id: "failed", label: "Failed", tone: "red" };
  }

  if (
    campaignStatus === "generating_text" ||
    campaignStatus === "generating_images"
  ) {
    return { id: "generating", label: "Generating", tone: "muted" };
  }

  const imagesComplete =
    slideCount > 0 && imagesReadyCount >= slideCount;

  if (!imagesComplete) {
    return { id: "needs_images", label: "Needs images", tone: "amber" };
  }

  if (!hasCaptions) {
    return { id: "needs_captions", label: "Needs captions", tone: "amber" };
  }

  if (input.youtubePublished && tiktokPublished) {
    return { id: "published", label: "Published", tone: "emerald" };
  }

  if (input.youtubePublished) {
    return { id: "on_youtube", label: "On YouTube", tone: "emerald" };
  }

  if (tiktokPublished) {
    return { id: "on_tiktok", label: "On TikTok", tone: "emerald" };
  }

  if (!input.hasVideoExport) {
    return { id: "needs_video", label: "Needs video", tone: "primary" };
  }

  return { id: "ready_to_post", label: "Ready to post", tone: "emerald" };
}

export function campaignListStatusBadgeClasses(
  tone: CampaignListStatus["tone"],
): string {
  switch (tone) {
    case "emerald":
      return "border-emerald-800/50 bg-emerald-950/30 text-emerald-300";
    case "amber":
      return "border-amber-800/50 bg-amber-950/30 text-amber-200";
    case "primary":
      return "border-primary/30 bg-primary/10 text-primary";
    case "red":
      return "border-red-900/50 bg-red-950/30 text-red-300";
    default:
      return "border-border bg-card/60 text-muted-foreground";
  }
}
