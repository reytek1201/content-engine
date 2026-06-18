/** Public App Store / Play Store URLs — set in Vercel when listings go live. */
export function getAppStoreUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_APP_STORE_URL?.trim();
  return url && url.length > 0 ? url : null;
}

export function getPlayStoreUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_PLAY_STORE_URL?.trim();
  return url && url.length > 0 ? url : null;
}

export function hasAnyStoreLink(): boolean {
  return Boolean(getAppStoreUrl() || getPlayStoreUrl());
}
