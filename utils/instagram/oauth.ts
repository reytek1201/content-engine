import { getAppUrl } from "@/utils/stripe";

const GRAPH_API_VERSION = "v22.0";

/** Scopes requested when connecting an account (Settings). */
export const INSTAGRAM_CONNECT_SCOPES = [
  "instagram_basic",
  "pages_show_list",
] as const;

/** Added at publish time — requires Meta app review for public use. */
export const INSTAGRAM_PUBLISH_SCOPE = "instagram_content_publish";

const INSTAGRAM_PUBLISH_EXTRA_SCOPES = ["pages_read_engagement"] as const;

function instagramConnectScopeString(): string {
  return INSTAGRAM_CONNECT_SCOPES.join(",");
}

function instagramPublishScopeString(): string {
  return [
    ...INSTAGRAM_CONNECT_SCOPES,
    INSTAGRAM_PUBLISH_SCOPE,
    ...INSTAGRAM_PUBLISH_EXTRA_SCOPES,
  ].join(",");
}

export function getInstagramRedirectUri(): string {
  return (
    process.env.META_REDIRECT_URI?.replace(/\/$/, "") ??
    `${getAppUrl()}/api/platforms/instagram/callback`
  );
}

export function getInstagramOAuthConfig(): {
  appId: string;
  appSecret: string;
  redirectUri: string;
} {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("Instagram OAuth is not configured");
  }

  return {
    appId,
    appSecret,
    redirectUri: getInstagramRedirectUri(),
  };
}

export function buildInstagramAuthUrl(state: string): string {
  const { appId, redirectUri } = getInstagramOAuthConfig();

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: instagramConnectScopeString(),
    state,
  });

  return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`;
}

export function buildInstagramPublishAuthUrl(state: string): string {
  const { appId, redirectUri } = getInstagramOAuthConfig();

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: instagramPublishScopeString(),
    state,
  });

  return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`;
}

export interface InstagramTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface InstagramAccountInfo {
  instagramUserId: string;
  username: string;
  displayName: string;
  pageId: string;
  pageName: string;
}

async function parseInstagramTokenResponse(
  response: Response,
): Promise<InstagramTokenResponse> {
  const data = (await response.json().catch(() => null)) as
    | (InstagramTokenResponse & {
        error?: { message?: string; type?: string };
      })
    | null;

  if (!response.ok || !data?.access_token) {
    const message =
      data?.error?.message ?? "Failed to exchange OAuth code";
    throw new Error(message);
  }

  return data;
}

export async function exchangeInstagramCode(
  code: string,
): Promise<InstagramTokenResponse> {
  const { appId, appSecret, redirectUri } = getInstagramOAuthConfig();

  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token?${params.toString()}`,
  );

  const shortLived = await parseInstagramTokenResponse(response);
  return exchangeForLongLivedInstagramToken(shortLived.access_token);
}

export async function exchangeForLongLivedInstagramToken(
  shortLivedToken: string,
): Promise<InstagramTokenResponse> {
  const { appId, appSecret } = getInstagramOAuthConfig();

  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token?${params.toString()}`,
  );

  return parseInstagramTokenResponse(response);
}

export async function fetchGrantedInstagramScopes(
  accessToken: string,
): Promise<string | null> {
  const { appId, appSecret } = getInstagramOAuthConfig();

  const params = new URLSearchParams({
    input_token: accessToken,
    access_token: `${appId}|${appSecret}`,
  });

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/debug_token?${params.toString()}`,
  );

  const data = (await response.json().catch(() => null)) as {
    data?: {
      scopes?: string[];
    };
    error?: { message?: string };
  } | null;

  if (!response.ok || !data?.data?.scopes?.length) {
    return null;
  }

  return data.data.scopes.join(",");
}

export async function fetchInstagramBusinessAccount(
  accessToken: string,
): Promise<InstagramAccountInfo> {
  const params = new URLSearchParams({
    fields: "id,name,instagram_business_account{id,username,name}",
    access_token: accessToken,
  });

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/me/accounts?${params.toString()}`,
  );

  const data = (await response.json().catch(() => null)) as {
    data?: Array<{
      id?: string;
      name?: string;
      instagram_business_account?: {
        id?: string;
        username?: string;
        name?: string;
      };
    }>;
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(
      data?.error?.message ?? "Failed to load Facebook Pages for this account",
    );
  }

  const page = data?.data?.find((entry) => entry.instagram_business_account?.id);

  const instagramAccount = page?.instagram_business_account;

  if (!page?.id || !instagramAccount?.id) {
    throw new Error(
      "No Instagram Professional account linked to a Facebook Page. Link one in Meta Business Suite, then try again.",
    );
  }

  const username = instagramAccount.username?.trim();
  const displayName =
    instagramAccount.name?.trim() ||
    (username ? `@${username}` : "Instagram account");

  return {
    instagramUserId: instagramAccount.id,
    username: username ?? "",
    displayName,
    pageId: page.id,
    pageName: page.name?.trim() || "Facebook Page",
  };
}

export async function revokeInstagramPermissions(
  accessToken: string,
): Promise<void> {
  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/me/permissions`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(
      data?.error?.message ?? "Failed to revoke Instagram permissions",
    );
  }
}
