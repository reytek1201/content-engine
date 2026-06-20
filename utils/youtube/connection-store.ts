import type {
  PlatformConnectionPublic,
  PlatformConnectionRow,
} from "@/types/platform-connection";
import { mergeScopeStrings, resolveScopesAfterRefresh, withoutYouTubeUploadScope } from "@/utils/platforms/scopes";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  refreshYouTubeAccessToken,
  type YouTubeChannelInfo,
} from "@/utils/youtube/oauth";

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

function toPublicConnection(
  row: PlatformConnectionRow,
): PlatformConnectionPublic {
  return {
    platform: row.platform,
    accountLabel: row.account_label,
    accountExternalId: row.account_external_id,
    connectedAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export async function getYouTubeConnectionRow(
  userId: string,
): Promise<PlatformConnectionRow | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("platform_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("platform", "youtube")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as PlatformConnectionRow | null) ?? null;
}

export async function getYouTubeConnectionPublic(
  userId: string,
): Promise<PlatformConnectionPublic | null> {
  const row = await getYouTubeConnectionRow(userId);
  return row ? toPublicConnection(row) : null;
}

export async function upsertYouTubeConnection(input: {
  userId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresInSeconds: number;
  channel: YouTubeChannelInfo;
  scopes?: string | null;
  existingRefreshToken?: string | null;
  existingScopes?: string | null;
}): Promise<PlatformConnectionPublic> {
  const admin = createAdminClient();
  const expiresAt = new Date(
    Date.now() + input.expiresInSeconds * 1000,
  ).toISOString();

  const refreshToken =
    input.refreshToken ?? input.existingRefreshToken ?? null;
  const scopes = input.scopes?.trim()
    ? input.scopes.trim()
    : mergeScopeStrings(input.existingScopes) || null;

  const { data, error } = await admin
    .from("platform_connections")
    .upsert(
      {
        user_id: input.userId,
        platform: "youtube",
        access_token: input.accessToken,
        refresh_token: refreshToken,
        scopes: scopes || null,
        expires_at: expiresAt,
        account_external_id: input.channel.channelId,
        account_label: input.channel.title,
      },
      { onConflict: "user_id,platform" },
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save YouTube connection");
  }

  return toPublicConnection(data as PlatformConnectionRow);
}

export async function deleteYouTubeConnection(userId: string): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("platform_connections")
    .delete()
    .eq("user_id", userId)
    .eq("platform", "youtube");

  if (error) {
    throw new Error(error.message);
  }
}

export async function ensureFreshYouTubeAccessToken(
  row: PlatformConnectionRow,
): Promise<PlatformConnectionRow> {
  const expiresAtMs = new Date(row.expires_at).getTime();

  if (expiresAtMs - Date.now() > REFRESH_BUFFER_MS) {
    return row;
  }

  if (!row.refresh_token) {
    throw new Error("YouTube connection expired. Reconnect your account.");
  }

  const refreshed = await refreshYouTubeAccessToken(row.refresh_token);
  const admin = createAdminClient();
  const expiresAt = new Date(
    Date.now() + refreshed.expires_in * 1000,
  ).toISOString();

  const { data, error } = await admin
    .from("platform_connections")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token ?? row.refresh_token,
      scopes: resolveScopesAfterRefresh(row.scopes, refreshed.scope),
      expires_at: expiresAt,
    })
    .eq("id", row.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to refresh YouTube connection");
  }

  return data as PlatformConnectionRow;
}

export async function clearYouTubeUploadScope(userId: string): Promise<void> {
  const row = await getYouTubeConnectionRow(userId);

  if (!row) {
    return;
  }

  const scopes = withoutYouTubeUploadScope(row.scopes);

  if (scopes === row.scopes) {
    return;
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("platform_connections")
    .update({ scopes })
    .eq("id", row.id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function revokeAndDeleteYouTubeConnection(
  userId: string,
): Promise<void> {
  const row = await getYouTubeConnectionRow(userId);

  if (!row) {
    return;
  }

  const tokenToRevoke = row.refresh_token ?? row.access_token;

  try {
    const { revokeYouTubeToken } = await import("@/utils/youtube/oauth");
    await revokeYouTubeToken(tokenToRevoke);
  } catch (error) {
    console.error("Failed to revoke YouTube token during disconnect:", error);
  }

  await deleteYouTubeConnection(userId);
}
