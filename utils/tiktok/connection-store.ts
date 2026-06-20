import type {
  PlatformConnectionPublic,
  PlatformConnectionRow,
} from "@/types/platform-connection";
import { mergeScopeStrings, resolveScopesAfterRefresh, withoutTikTokPublishScope } from "@/utils/platforms/scopes";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  refreshTikTokAccessToken,
  type TikTokUserInfo,
} from "@/utils/tiktok/oauth";

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

export async function getTikTokConnectionRow(
  userId: string,
): Promise<PlatformConnectionRow | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("platform_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("platform", "tiktok")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as PlatformConnectionRow | null) ?? null;
}

export async function getTikTokConnectionPublic(
  userId: string,
): Promise<PlatformConnectionPublic | null> {
  const row = await getTikTokConnectionRow(userId);
  return row ? toPublicConnection(row) : null;
}

export async function upsertTikTokConnection(input: {
  userId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresInSeconds: number;
  user: TikTokUserInfo;
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
        platform: "tiktok",
        access_token: input.accessToken,
        refresh_token: refreshToken,
        scopes: scopes || null,
        expires_at: expiresAt,
        account_external_id: input.user.openId,
        account_label: input.user.displayName,
      },
      { onConflict: "user_id,platform" },
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save TikTok connection");
  }

  return toPublicConnection(data as PlatformConnectionRow);
}

export async function deleteTikTokConnection(userId: string): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("platform_connections")
    .delete()
    .eq("user_id", userId)
    .eq("platform", "tiktok");

  if (error) {
    throw new Error(error.message);
  }
}

export async function ensureFreshTikTokAccessToken(
  row: PlatformConnectionRow,
): Promise<PlatformConnectionRow> {
  const expiresAtMs = new Date(row.expires_at).getTime();

  if (expiresAtMs - Date.now() > REFRESH_BUFFER_MS) {
    return row;
  }

  if (!row.refresh_token) {
    throw new Error("TikTok connection expired. Reconnect your account.");
  }

  const refreshed = await refreshTikTokAccessToken(row.refresh_token);
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
    throw new Error(error?.message ?? "Failed to refresh TikTok connection");
  }

  return data as PlatformConnectionRow;
}

export async function clearTikTokPublishScope(userId: string): Promise<void> {
  const row = await getTikTokConnectionRow(userId);

  if (!row) {
    return;
  }

  const scopes = withoutTikTokPublishScope(row.scopes);

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

export async function revokeAndDeleteTikTokConnection(
  userId: string,
): Promise<void> {
  const row = await getTikTokConnectionRow(userId);

  if (!row) {
    return;
  }

  try {
    const { revokeTikTokToken } = await import("@/utils/tiktok/oauth");
    await revokeTikTokToken(row.access_token);
  } catch (error) {
    console.error("Failed to revoke TikTok token during disconnect:", error);
  }

  await deleteTikTokConnection(userId);
}
