import type { PlatformCaption } from "@/types/captions";
import {
  formatHashtagsOnlyForCopy,
  formatPostCaptionForCopy,
} from "@/types/captions";
import type { VideoExportMetadata } from "@/utils/fal-video";

const TIKTOK_TITLE_MAX = 2200;

export function buildTikTokPostTitle(caption: PlatformCaption): string {
  const parts = [
    formatPostCaptionForCopy(caption),
    formatHashtagsOnlyForCopy(caption),
  ].filter(Boolean);

  return parts.join("\n\n").slice(0, TIKTOK_TITLE_MAX);
}

export function buildTikTokProfileUrl(username: string): string {
  const handle = username.replace(/^@/, "").trim();
  return `https://www.tiktok.com/@${encodeURIComponent(handle)}`;
}

export function buildTikTokVideoUrl(postId: string): string {
  return `https://www.tiktok.com/video/${postId}`;
}

export function estimateExportDurationSeconds(
  metadata: VideoExportMetadata | null,
): number | null {
  if (!metadata?.slideClips?.length) {
    return null;
  }

  const total = metadata.slideClips.reduce(
    (sum, clip) => sum + clip.durationSeconds,
    0,
  );

  return total > 0 ? total : null;
}
