import type { VideoExportPreset } from "@/utils/video-export-presets";

export function getVideoExportFilename(
  campaignTitle: string | null,
  campaignId: string,
  preset: VideoExportPreset = "quick_reel",
): string {
  const base =
    campaignTitle
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || `campaign-${campaignId.slice(0, 8)}`;

  const suffix = preset === "silent_captions" ? "silent-video" : "video";

  return `${base}-${suffix}.mp4`;
}
