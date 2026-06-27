const APP_SCHEME_PREFIX = "co.slidepress.app://";

export function parseNativeAppDeepLink(url: string): string | null {
  if (!url.startsWith(APP_SCHEME_PREFIX)) {
    return null;
  }

  const rest = url.slice(APP_SCHEME_PREFIX.length);

  if (rest === "new" || rest.startsWith("new?")) {
    return "/new";
  }

  if (rest === "login" || rest.startsWith("login?")) {
    return "/login";
  }

  const campaignMatch = rest.match(/^campaign\/([^?]+)(\?.*)?$/);

  if (!campaignMatch) {
    return null;
  }

  const campaignId = campaignMatch[1];
  const query = campaignMatch[2] ?? "";

  return `/campaign/${campaignId}${query}`;
}

export function buildCampaignWidgetDeepLink(
  campaignId: string,
  options?: { tab?: "publish" | "video" },
): string {
  const query =
    options?.tab === "publish"
      ? "?tab=publish"
      : options?.tab === "video"
        ? "?tab=video"
        : "";

  return `${APP_SCHEME_PREFIX}campaign/${campaignId}${query}`;
}

export function buildNewCampaignWidgetDeepLink(): string {
  return `${APP_SCHEME_PREFIX}new`;
}
