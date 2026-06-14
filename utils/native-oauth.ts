export const NATIVE_OAUTH_SCHEME = "co.slidepress.app";
export const NATIVE_OAUTH_CALLBACK_PATH = "/auth/callback";

export function buildNativeOAuthRedirectUrl(nextPath?: string): string {
  const base = `${NATIVE_OAUTH_SCHEME}://${NATIVE_OAUTH_CALLBACK_PATH.slice(1)}`;

  if (nextPath && nextPath !== "/campaigns" && nextPath.startsWith("/")) {
    return `${base}?next=${encodeURIComponent(nextPath)}`;
  }

  return base;
}

export function parseNativeOAuthCallback(
  url: string,
): { code: string; next: string } | null {
  if (!isNativeOAuthCallbackUrl(url)) {
    return null;
  }

  const remainder = url.slice(`${NATIVE_OAUTH_SCHEME}://`.length);
  const query = remainder.includes("?")
    ? remainder.slice(remainder.indexOf("?") + 1)
    : "";
  const params = new URLSearchParams(query);
  const code = params.get("code");

  if (!code) {
    return null;
  }

  const next = params.get("next");
  const nextPath =
    next?.startsWith("/") && !next.startsWith("//") ? next : "/campaigns";

  return { code, next: nextPath };
}

export function nativeDeepLinkToWebCallback(
  deepLink: string,
  webOrigin: string,
): string | null {
  if (!deepLink.startsWith(`${NATIVE_OAUTH_SCHEME}://`)) {
    return null;
  }

  const remainder = deepLink.slice(`${NATIVE_OAUTH_SCHEME}://`.length);
  const [pathPart, ...queryParts] = remainder.split("?");
  const search = queryParts.length > 0 ? `?${queryParts.join("?")}` : "";
  const path = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;

  if (!path.startsWith(NATIVE_OAUTH_CALLBACK_PATH)) {
    return null;
  }

  return `${webOrigin}${path}${search}`;
}

export function isNativeOAuthCallbackUrl(url: string): boolean {
  if (!url.startsWith(`${NATIVE_OAUTH_SCHEME}://`)) {
    return false;
  }

  const remainder = url.slice(`${NATIVE_OAUTH_SCHEME}://`.length);
  const pathPart = remainder.split("?")[0] ?? "";
  const path = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;

  return path.startsWith(NATIVE_OAUTH_CALLBACK_PATH);
}
