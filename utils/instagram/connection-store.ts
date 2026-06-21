import type {
  PlatformConnectionPublic,
  PlatformConnectionRow,
} from "@/types/platform-connection";
import {
  mergeScopeStrings,
  resolveScopesAfterRefresh,
  withoutInstagramPublishScope,
} from "@/utils/platforms/scopes";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  exchangeForLongLivedInstagramToken,
  fetchGrantedInstagramScopes,
  type InstagramAccountInfo,
} from "@/utils/instagram/oauth";

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

export async function getInstagramConnectionRow(
  userId: string,
): Promise<PlatformConnectionRow | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("platform_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("platform", "instagram")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as PlatformConnectionRow | null) ?? null;
}

export async function getInstagramConnectionPublic(
  userId: string,
): Promise<PlatformConnectionPublic | null> {
  const row = await getInstagramConnectionRow(userId);
  return row ? toPublicConnection(row) : null;
}

export async function upsertInstagramConnection(input: {
  userId: string;
  accessToken: string;
  expiresInSeconds: number;
  account: InstagramAccountInfo;
  scopes?: string | null;
  existingScopes?: string | null;
}): Promise<PlatformConnectionPublic> {
  const admin = createAdminClient();
  const expiresAt = new Date(
    Date.now() + input.expiresInSeconds * 1000,
  ).toISOString();

  const scopes = input.scopes?.trim()
    ? input.scopes.trim()
    : mergeScopeStrings(input.existingScopes) || null;

  const accountLabel = input.account.username
    ? `@${input.account.username}`
    : input.account.displayName;

  const { data, error } = await admin
    .from("platform_connections")
    .upsert(
      {
        user_id: input.userId,
        platform: "instagram",
        access_token: input.accessToken,
        refresh_token: null,
        scopes: scopes || null,
        expires_at: expiresAt,
        account_external_id: input.account.instagramUserId,
        account_label: accountLabel,
      },
      { onConflict: "user_id,platform" },
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save Instagram connection");
  }

  return toPublicConnection(data as PlatformConnectionRow);
}

export async function deleteInstagramConnection(userId: string): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("platform_connections")
    .delete()
    .eq("user_id", userId)
    .eq("platform", "instagram");

  if (error) {
    throw new Error(error.message);
  }
}

export async function ensureFreshInstagramAccessToken(
  row: PlatformConnectionRow,
): Promise<PlatformConnectionRow> {
  const expiresAtMs = new Date(row.expires_at).getTime();

  if (expiresAtMs - Date.now() > REFRESH_BUFFER_MS) {
    return row;
  }

  const refreshed = await exchangeForLongLivedInstagramToken(row.access_token);
  const scopes =
    (await fetchGrantedInstagramScopes(refreshed.access_token)) ??
    resolveScopesAfterRefresh(row.scopes, null);
  const admin = createAdminClient();
  const expiresAt = new Date(
    Date.now() + refreshed.expires_in * 1000,
  ).toISOString();

  const { data, error } = await admin
    .from("platform_connections")
    .update({
      access_token: refreshed.access_token,
      scopes,
      expires_at: expiresAt,
    })
    .eq("id", row.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to refresh Instagram connection");
  }

  return data as PlatformConnectionRow;
}

export async function clearInstagramPublishScope(userId: string): Promise<void> {
  const row = await getInstagramConnectionRow(userId);

  if (!row) {
    return;
  }

  const scopes = withoutInstagramPublishScope(row.scopes);

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

export async function revokeAndDeleteInstagramConnection(
  userId: string,
): Promise<void> {
  const row = await getInstagramConnectionRow(userId);

  if (!row) {
    return;
  }

  try {
    const { revokeInstagramPermissions } = await import("@/utils/instagram/oauth");
    await revokeInstagramPermissions(row.access_token);
  } catch (error) {
    console.error("Failed to revoke Instagram token during disconnect:", error);
  }

  await deleteInstagramConnection(userId);
}
