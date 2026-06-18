/** Optional hero demo video — set when marketing assets are ready. */
export function getMarketingHeroVideoUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_MARKETING_HERO_VIDEO_URL?.trim();
  return url && url.length > 0 ? url : null;
}

/** Optional hero poster / screenshot fallback. */
export function getMarketingHeroPosterUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_MARKETING_HERO_POSTER_URL?.trim();
  return url && url.length > 0 ? url : null;
}
