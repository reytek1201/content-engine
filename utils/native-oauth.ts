export const NATIVE_OAUTH_SCHEME = "co.slidepress.app";
export const NATIVE_OAUTH_CALLBACK_PATH = "/auth/callback";

export type NativeAuthCallback =
  | { kind: "code"; code: string; next: string }
  | {
      kind: "tokens";
      accessToken: string;
      refreshToken: string;
      next: string;
      authType: string | null;
    };

function resolveNextPath(next: string | null): string {
  if (next?.startsWith("/") && !next.startsWith("//")) {
    return next;
  }

  return "/campaigns";
}

function parseAuthParams(url: string): URLSearchParams {
  const queryIndex = url.indexOf("?");
  const hashIndex = url.indexOf("#");
  const parts: string[] = [];

  if (queryIndex >= 0) {
    const queryEnd = hashIndex >= 0 ? hashIndex : url.length;
    parts.push(url.slice(queryIndex + 1, queryEnd));
  }

  if (hashIndex >= 0) {
    parts.push(url.slice(hashIndex + 1));
  }

  return new URLSearchParams(parts.join("&"));
}

export function buildNativeOAuthRedirectUrl(nextPath?: string): string {
  const base = `${NATIVE_OAUTH_SCHEME}://${NATIVE_OAUTH_CALLBACK_PATH.slice(1)}`;

  if (nextPath && nextPath !== "/campaigns" && nextPath.startsWith("/")) {
    return `${base}?next=${encodeURIComponent(nextPath)}`;
  }

  return base;
}

export function parseNativeAuthCallback(url: string): NativeAuthCallback | null {
  if (!isNativeAuthCallbackUrl(url)) {
    return null;
  }

  const params = parseAuthParams(url);
  const code = params.get("code");

  if (code) {
    return {
      kind: "code",
      code,
      next: resolveNextPath(params.get("next")),
    };
  }

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (accessToken && refreshToken) {
    const authType = params.get("type");
    const defaultNext =
      authType === "recovery" ? "/settings?reset=1" : "/campaigns";

    return {
      kind: "tokens",
      accessToken,
      refreshToken,
      next: resolveNextPath(params.get("next") ?? defaultNext),
      authType,
    };
  }

  return null;
}

/** @deprecated Use parseNativeAuthCallback */
export function parseNativeOAuthCallback(
  url: string,
): { code: string; next: string } | null {
  const callback = parseNativeAuthCallback(url);
  if (!callback || callback.kind !== "code") {
    return null;
  }

  return { code: callback.code, next: callback.next };
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

export function isNativeAuthCallbackUrl(url: string): boolean {
  if (!url.startsWith(`${NATIVE_OAUTH_SCHEME}://`)) {
    return false;
  }

  const remainder = url.slice(`${NATIVE_OAUTH_SCHEME}://`.length);
  const pathPart = remainder.split("?")[0]?.split("#")[0] ?? "";
  const path = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;

  return path.startsWith(NATIVE_OAUTH_CALLBACK_PATH);
}

/** @deprecated Use isNativeAuthCallbackUrl */
export function isNativeOAuthCallbackUrl(url: string): boolean {
  return isNativeAuthCallbackUrl(url);
}

export function getNativeAuthCallbackKey(callback: NativeAuthCallback): string {
  if (callback.kind === "code") {
    return `code:${callback.code}`;
  }

  return `tokens:${callback.accessToken.slice(0, 24)}`;
}
