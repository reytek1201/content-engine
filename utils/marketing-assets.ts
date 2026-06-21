const MARKETING_BASE = "/marketing";

function marketingAsset(filename: string): string {
  return `${MARKETING_BASE}/${filename}`;
}

function envOrDefault(envValue: string | undefined, filename: string): string {
  const url = envValue?.trim();
  return url && url.length > 0 ? url : marketingAsset(filename);
}

/** Hero demo video in the phone mockup. */
export function getMarketingHeroVideoUrl(): string {
  return envOrDefault(
    process.env.NEXT_PUBLIC_MARKETING_HERO_VIDEO_URL,
    "slidepress-hero.mp4",
  );
}

/** Hero poster / screenshot fallback before video loads. */
export function getMarketingHeroPosterUrl(): string {
  return envOrDefault(
    process.env.NEXT_PUBLIC_MARKETING_HERO_POSTER_URL,
    "hero-poster.webp",
  );
}

export function getMarketingFanSlideLeftUrl(): string {
  return marketingAsset("fan-slide-left.webp");
}

export function getMarketingFanSlideRightUrl(): string {
  return marketingAsset("fan-slide-right.webp");
}

export function getMarketingFeatureImageUrl(
  type: "topic" | "slides" | "export",
): string {
  const filenames = {
    topic: "feature-topic.webp",
    slides: "feature-slides.webp",
    export: "feature-export.webp",
  } as const;

  return marketingAsset(filenames[type]);
}

export function getMarketingAppsPhoneUrl(): string {
  return marketingAsset("apps-phone.webp");
}
