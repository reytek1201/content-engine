import type { PlatformConnectionPlatform } from "@/types/platform-connection";
import type { PlatformConnectionGraceStatus } from "@/utils/platform-connection-grace";
import { getPlatformConnectionGraceStatus } from "@/utils/platform-connection-grace";
import { getPlanLabel, getPlanLimits, type Tier } from "@/utils/plan-limits";
import { UsageLimitError } from "@/utils/usage-limits";
import { createAdminClient } from "@/utils/supabase/admin";

interface ConnectionRow {
  platform: PlatformConnectionPlatform;
  created_at: string;
}

const PLATFORM_KEYS: PlatformConnectionPlatform[] = [
  "youtube",
  "tiktok",
  "instagram",
];

const PLATFORM_NAMES: Record<PlatformConnectionPlatform, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
};

export interface PlatformConnectionSummary {
  count: number;
  limit: number;
  canConnectMore: boolean;
  canConnect: Record<PlatformConnectionPlatform, boolean>;
  canPublish: Record<PlatformConnectionPlatform, boolean>;
  grace: PlatformConnectionGraceStatus;
}

async function fetchUserTier(userId: string): Promise<Tier> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("usage_balances")
    .select("tier")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return "free";
  }

  const tier = data.tier;
  if (tier === "creator" || tier === "agency" || tier === "free") {
    return tier;
  }

  return "free";
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

export async function getPlatformConnectionSummary(
  userId: string,
): Promise<PlatformConnectionSummary> {
  const grace = await getPlatformConnectionGraceStatus(userId);
  const connections = await fetchConnectionRows(userId);
  const tier = await fetchUserTier(userId);
  const limit = getPlanLimits(tier).maxPlatformConnections;
  const count = connections.length;
  const connectedPlatforms = new Set(connections.map((row) => row.platform));
  const primaryPublishPlatform =
    count > limit ? (connections[0]?.platform ?? null) : null;

  const canConnect = {} as Record<PlatformConnectionPlatform, boolean>;
  const canPublish = {} as Record<PlatformConnectionPlatform, boolean>;

  for (const platform of PLATFORM_KEYS) {
    canConnect[platform] =
      connectedPlatforms.has(platform) || count < limit;
    canPublish[platform] =
      connectedPlatforms.has(platform) &&
      (count <= limit || primaryPublishPlatform === platform);
  }

  return {
    count,
    limit,
    canConnectMore: count < limit,
    canConnect,
    canPublish,
    grace,
  };
}

/**
 * Blocks a new OAuth connection when the user is at their tier cap.
 * Reconnecting the same platform (refresh / scope upgrade) is always allowed.
 */
export async function assertPlatformConnectAllowed(
  userId: string,
  platform: PlatformConnectionPlatform,
): Promise<void> {
  const summary = await getPlatformConnectionSummary(userId);

  if (!summary.canConnect[platform]) {
    const tier = await fetchUserTier(userId);
    const planLabel = getPlanLabel(tier);

    throw new UsageLimitError(
      summary.limit === 1
        ? `Your ${planLabel} plan includes one platform connection. Disconnect your current account in Settings to switch, or upgrade to connect YouTube, TikTok, and Instagram.`
        : `Platform connection limit reached for your ${planLabel} plan (${summary.limit} max).`,
      tier,
    );
  }
}

/**
 * Blocks publish when a downgraded user still has more connections than their tier allows.
 * Only the earliest-connected platform may publish until extras are disconnected.
 */
export async function assertPlatformPublishAllowed(
  userId: string,
  platform: PlatformConnectionPlatform,
): Promise<void> {
  const summary = await getPlatformConnectionSummary(userId);

  if (!summary.canPublish[platform]) {
    const connections = await fetchConnectionRows(userId);
    const connected = connections.some((row) => row.platform === platform);

    if (!connected) {
      return;
    }

    const tier = await fetchUserTier(userId);

    throw new UsageLimitError(
      summary.grace.inGracePeriod && summary.grace.until
        ? `Your ${getPlanLabel(tier)} plan allows publishing from one platform until ${new Date(summary.grace.until).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}. Disconnect other accounts in Settings or upgrade to publish to ${PLATFORM_NAMES[platform]}.`
        : `Your ${getPlanLabel(tier)} plan allows publishing from one platform. Disconnect other accounts in Settings or upgrade to publish to ${PLATFORM_NAMES[platform]}.`,
      tier,
    );
  }
}
