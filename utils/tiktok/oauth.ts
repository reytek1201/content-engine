import { getAppUrl } from "@/utils/stripe";

/** Scopes requested when connecting an account (Settings). */
export const TIKTOK_CONNECT_SCOPES = ["user.info.basic"] as const;

export function getTikTokRedirectUri(): string {
  return (
    process.env.TIKTOK_REDIRECT_URI?.replace(/\/$/, "") ??
    `${getAppUrl()}/api/platforms/tiktok/callback`
  );
}

export function getTikTokOAuthConfig(): {
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
} {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  if (!clientKey || !clientSecret) {
    throw new Error("TikTok OAuth is not configured");
  }

  return {
    clientKey,
    clientSecret,
    redirectUri: getTikTokRedirectUri(),
  };
}

export function buildTikTokAuthUrl(state: string): string {
  const { clientKey, redirectUri } = getTikTokOAuthConfig();

  const params = new URLSearchParams({
    client_key: clientKey,
    response_type: "code",
    scope: TIKTOK_CONNECT_SCOPES.join(","),
    redirect_uri: redirectUri,
    state,
  });

  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}

export interface TikTokTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  refresh_expires_in?: number;
  open_id: string;
  scope?: string;
  token_type: string;
}

export interface TikTokUserInfo {
  openId: string;
  displayName: string;
}

async function parseTikTokTokenResponse(
  response: Response,
): Promise<TikTokTokenResponse> {
  const data = (await response.json().catch(() => null)) as
    | (TikTokTokenResponse & { error?: string; error_description?: string })
    | null;

  if (!response.ok || !data?.access_token) {
    const message =
      data?.error_description ?? data?.error ?? "Failed to exchange OAuth code";
    throw new Error(message);
  }

  return data;
}

export async function exchangeTikTokCode(
  code: string,
): Promise<TikTokTokenResponse> {
  const { clientKey, clientSecret, redirectUri } = getTikTokOAuthConfig();

  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  return parseTikTokTokenResponse(response);
}

export async function refreshTikTokAccessToken(
  refreshToken: string,
): Promise<TikTokTokenResponse> {
  const { clientKey, clientSecret } = getTikTokOAuthConfig();

  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  return parseTikTokTokenResponse(response);
}

export async function fetchTikTokUserInfo(
  accessToken: string,
): Promise<TikTokUserInfo> {
  const params = new URLSearchParams({
    fields: "open_id,display_name",
  });

  const response = await fetch(
    `https://open.tiktokapis.com/v2/user/info/?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const data = (await response.json().catch(() => null)) as {
    data?: {
      user?: {
        open_id?: string;
        display_name?: string;
      };
    };
    error?: {
      code?: string;
      message?: string;
    };
  } | null;

  if (!response.ok || data?.error?.code !== "ok") {
    throw new Error(
      data?.error?.message ?? "Failed to load TikTok account information",
    );
  }

  const user = data?.data?.user;

  if (!user?.open_id) {
    throw new Error("No TikTok account found for this authorization.");
  }

  return {
    openId: user.open_id,
    displayName: user.display_name?.trim() || "TikTok account",
  };
}

export async function revokeTikTokToken(accessToken: string): Promise<void> {
  const { clientKey, clientSecret } = getTikTokOAuthConfig();

  const response = await fetch("https://open.tiktokapis.com/v2/oauth/revoke/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      token: accessToken,
    }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error_description?: string;
      error?: string;
    } | null;
    const message =
      data?.error_description ?? data?.error ?? "Failed to revoke TikTok token";
    throw new Error(message);
  }
}
