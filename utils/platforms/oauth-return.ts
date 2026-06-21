import { getAppUrl } from "@/utils/stripe";

export type PlatformOAuthIntent = "connect" | "publish";

export function resolveSafeReturnPath(returnTo: string | null | undefined): string | undefined {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }

  return undefined;
}

export function buildOAuthSuccessRedirect(input: {
  platform: "instagram" | "tiktok" | "youtube";
  intent: PlatformOAuthIntent;
  returnTo?: string;
}): string {
  const safeReturnTo = resolveSafeReturnPath(input.returnTo);

  if (!safeReturnTo) {
    return `${getAppUrl()}/settings/connected-accounts?${input.platform}=connected`;
  }

  const url = new URL(safeReturnTo, getAppUrl());

  if (input.intent === "publish") {
    url.searchParams.set(`${input.platform}_scope`, "granted");
  } else {
    url.searchParams.set(input.platform, "connected");
  }

  return url.toString();
}

export function buildOAuthErrorRedirect(input: {
  platform: "instagram" | "tiktok" | "youtube";
  reason: string;
  returnTo?: string;
}): string {
  const safeReturnTo = resolveSafeReturnPath(input.returnTo);

  if (!safeReturnTo) {
    return `${getAppUrl()}/settings/connected-accounts?${input.platform}=error&reason=${encodeURIComponent(input.reason)}`;
  }

  const url = new URL(safeReturnTo, getAppUrl());
  url.searchParams.set(`${input.platform}_error`, input.reason);
  return url.toString();
}

export function buildPlatformAuthorizeUrl(
  authorizePath: string,
  returnTo: string,
): string {
  return `${authorizePath}?returnTo=${encodeURIComponent(returnTo)}`;
}
