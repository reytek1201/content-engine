import type { Campaign } from "@/types/campaign";

export const STATUS_LABELS: Record<Campaign["status"], string> = {
  idle: "Ready",
  generating_text: "Generating text",
  generating_images: "Generating images",
  completed: "Completed",
  failed: "Failed",
};

export const STATUS_STYLES: Record<Campaign["status"], string> = {
  idle: "border-border bg-secondary/60 text-secondary-foreground",
  generating_text: "border-amber-900/60 bg-amber-950/40 text-amber-200",
  generating_images: "border-amber-900/60 bg-amber-950/40 text-amber-200",
  completed: "border-emerald-900/60 bg-emerald-950/40 text-emerald-200",
  failed: "border-red-900/60 bg-red-950/40 text-red-200",
};

export function formatAspectRatio(ratio: Campaign["aspect_ratio"]): string {
  return ratio === "4:5" ? "4:5 Portrait" : "9:16 Vertical";
}

export function formatCampaignDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(isoDate));
}

export function getCampaignPreviewImage(
  slides: Array<{ slide_index: number; image_url: string | null }> | null
): string | null {
  if (!slides || slides.length === 0) {
    return null;
  }

  const sortedSlides = [...slides].sort(
    (left, right) => left.slide_index - right.slide_index
  );

  return (
    sortedSlides.find((slide) => slide.image_url)?.image_url ??
    sortedSlides[0]?.image_url ??
    null
  );
}
