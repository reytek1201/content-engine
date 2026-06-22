import type { PlatformConnectionPlatform } from "@/types/platform-connection";
import { getPlanLimits } from "@/utils/plan-limits";
import { revokeAndDeleteInstagramConnection } from "@/utils/instagram/connection-store";
import { revokeAndDeleteTikTokConnection } from "@/utils/tiktok/connection-store";
import { revokeAndDeleteYouTubeConnection } from "@/utils/youtube/connection-store";
import { createAdminClient } from "@/utils/supabase/admin";

export const PLATFORM_CONNECTION_GRACE_DAYS = 7;

export interface PlatformConnectionGraceStatus {
  until: string | null;
  inGracePeriod: boolean;
  expiredPendingEnforcement: boolean;
  primaryPlatform: PlatformConnectionPlatform | null;
}

interface ConnectionRow {
  platform: PlatformConnectionPlatform;
  created_at: string;
}

async function fetchConnectionRows(userId: string): Promise<ConnectionRow[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("platform_connections")
    .select("platform, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("Failed to load platform connections");
  }

  return (data as ConnectionRow[]) ?? [];
}

async function fetchGraceUntil(userId: string): Promise<string | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("usage_balances")
    .select("platform_connection_grace_until")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load platform connection grace");
  }

  return data?.platform_connection_grace_until ?? null;
}

async function revokePlatformConnection(
  userId: string,
  platform: PlatformConnectionPlatform,
): Promise<void> {
  switch (platform) {
    case "youtube":
      await revokeAndDeleteYouTubeConnection(userId);
      break;
    case "tiktok":
      await revokeAndDeleteTikTokConnection(userId);
      break;
    case "instagram":
      await revokeAndDeleteInstagramConnection(userId);
      break;
  }
}

export async function clearPlatformConnectionGrace(userId: string): Promise<void> {
  const admin = createAdminClient();

  await admin
    .from("usage_balances")
    .update({ platform_connection_grace_until: null })
    .eq("user_id", userId);
}

/**
 * Starts a 7-day grace window when a user downgrades to free with more than one
 * connected platform. Publish on extras stays blocked during grace.
 */
export async function startPlatformConnectionGraceIfNeeded(
  userId: string,
): Promise<void> {
  const connections = await fetchConnectionRows(userId);
  const freeLimit = getPlanLimits("free").maxPlatformConnections;

  if (connections.length <= freeLimit) {
    await clearPlatformConnectionGrace(userId);
    return;
  }

  const graceUntil = new Date();
  graceUntil.setUTCDate(graceUntil.getUTCDate() + PLATFORM_CONNECTION_GRACE_DAYS);

  const admin = createAdminClient();
  await admin
    .from("usage_balances")
    .update({
      platform_connection_grace_until: graceUntil.toISOString(),
    })
    .eq("user_id", userId);
}

/**
 * After grace expires, revoke every connection except the earliest-connected platform.
 */
export async function enforceExpiredPlatformConnectionGrace(
  userId: string,
): Promise<void> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("usage_balances")
    .select("tier, platform_connection_grace_until")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data || data.tier !== "free" || !data.platform_connection_grace_until) {
    return;
  }

  if (new Date(data.platform_connection_grace_until) > new Date()) {
    return;
  }

  const connections = await fetchConnectionRows(userId);
  const freeLimit = getPlanLimits("free").maxPlatformConnections;

  if (connections.length <= freeLimit) {
    await clearPlatformConnectionGrace(userId);
    return;
  }

  const extras = connections.slice(freeLimit);

  for (const row of extras) {
    await revokePlatformConnection(userId, row.platform);
  }

  await clearPlatformConnectionGrace(userId);
}

export async function getPlatformConnectionGraceStatus(
  userId: string,
): Promise<PlatformConnectionGraceStatus> {
  await enforceExpiredPlatformConnectionGrace(userId);

  const [graceUntil, connections] = await Promise.all([
    fetchGraceUntil(userId),
    fetchConnectionRows(userId),
  ]);

  const freeLimit = getPlanLimits("free").maxPlatformConnections;
  const overLimit = connections.length > freeLimit;
  const primaryPlatform = overLimit ? (connections[0]?.platform ?? null) : null;
  const now = Date.now();
  const graceMs = graceUntil ? new Date(graceUntil).getTime() : null;
  const inGracePeriod = Boolean(
    overLimit && graceMs !== null && graceMs > now,
  );
  const expiredPendingEnforcement = Boolean(
    overLimit && graceMs !== null && graceMs <= now,
  );

  if (!overLimit && graceUntil) {
    await clearPlatformConnectionGrace(userId);
  }

  return {
    until: inGracePeriod ? graceUntil : null,
    inGracePeriod,
    expiredPendingEnforcement,
    primaryPlatform,
  };
}

/** Clear grace once the user is back within their connection cap. */
export async function maybeClearPlatformConnectionGrace(
  userId: string,
): Promise<void> {
  const connections = await fetchConnectionRows(userId);
  const graceUntil = await fetchGraceUntil(userId);

  if (!graceUntil) {
    return;
  }

  const tier = await (async () => {
    const admin = createAdminClient();
    const { data } = await admin
      .from("usage_balances")
      .select("tier")
      .eq("user_id", userId)
      .maybeSingle();
    return data?.tier ?? "free";
  })();

  const limit = getPlanLimits(
    tier === "creator" || tier === "agency" ? tier : "free",
  ).maxPlatformConnections;

  if (connections.length <= limit) {
    await clearPlatformConnectionGrace(userId);
  }
}
