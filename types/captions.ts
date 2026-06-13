export type PlatformType = "tiktok" | "instagram" | "youtube_shorts";

export interface PlatformCaption {
  id: string;
  campaign_id: string;
  platform: PlatformType;
  hook: string | null;
  caption: string;
  hashtags: string[];
  title: string | null;
  created_at: string;
  updated_at: string;
}

export const PLATFORM_LABELS: Record<PlatformType, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube_shorts: "YouTube Shorts",
};

export const PLATFORM_ORDER: PlatformType[] = [
  "tiktok",
  "instagram",
  "youtube_shorts",
];

export function normalizeHashtag(tag: string): string {
  const trimmed = tag.trim();
  if (!trimmed) {
    return trimmed;
  }

  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

export function formatHashtagsForDisplay(hashtags: string[]): string {
  return hashtags.map(normalizeHashtag).join(" ");
}

export function formatCaptionForCopy(caption: PlatformCaption): string {
  const hashtags = caption.hashtags.map(normalizeHashtag).join(" ");

  if (caption.platform === "youtube_shorts") {
    const title = caption.title ?? caption.hook ?? "Short";
    return [title, "", caption.caption, "", hashtags].join("\n").trim();
  }

  const lines = [caption.hook, caption.caption, hashtags].filter(Boolean);
  return lines.join("\n\n").trim();
}

export function sortCaptionsByPlatform(
  captions: PlatformCaption[]
): PlatformCaption[] {
  return [...captions].sort(
    (left, right) =>
      PLATFORM_ORDER.indexOf(left.platform) -
      PLATFORM_ORDER.indexOf(right.platform)
  );
}

export function formatAllCaptionsForCopy(captions: PlatformCaption[]): string {
  return sortCaptionsByPlatform(captions)
    .map((caption) => {
      const header = `=== ${PLATFORM_LABELS[caption.platform]} ===`;
      return `${header}\n\n${formatCaptionForCopy(caption)}`;
    })
    .join("\n\n\n");
}
