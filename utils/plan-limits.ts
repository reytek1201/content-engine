export type Tier = "free" | "creator" | "agency";

export type PaidTier = Extract<Tier, "creator" | "agency">;

export interface TierLimits {
  campaigns: number;
  regenerations: number;
  videos: number;
  ttsPreviews: number;
  audioExports: number;
  brands: number;
  maxPlatformConnections: number;
}

export interface TierPricing {
  webMonthlyUsd: number;
  iapMonthlyUsd: number;
}

/**
 * Hard credit caps per tier. These must match apply_tier_entitlement() in the SQL migration.
 * All tiers hard-reset to caps on their billing period (calendar month for free; renewal for paid).
 */
export const PLAN_LIMITS: Record<Tier, TierLimits> = {
  free: {
    campaigns: 2,
    regenerations: 4,
    videos: 0,
    ttsPreviews: 4,
    audioExports: 0,
    brands: 1,
    maxPlatformConnections: 1,
  },
  creator: {
    campaigns: 10,
    regenerations: 20,
    videos: 10,
    ttsPreviews: 30,
    audioExports: 5,
    brands: 3,
    maxPlatformConnections: 3,
  },
  agency: {
    campaigns: 30,
    regenerations: 60,
    videos: 20,
    ttsPreviews: 60,
    audioExports: 15,
    brands: 15,
    maxPlatformConnections: 3,
  },
};

/** List prices — Stripe (web) vs App Store / Play (IAP). */
export const PLAN_PRICING: Record<PaidTier, TierPricing> = {
  creator: { webMonthlyUsd: 24, iapMonthlyUsd: 29.99 },
  agency: { webMonthlyUsd: 79, iapMonthlyUsd: 99.99 },
};

export function getPlanLimits(tier: Tier): TierLimits {
  return PLAN_LIMITS[tier];
}

export function getPlanLabel(tier: Tier): string {
  switch (tier) {
    case "free":
      return "Free";
    case "creator":
      return "Creator";
    case "agency":
      return "Agency Pro";
  }
}

export function isPaidTier(tier: Tier): tier is PaidTier {
  return tier !== "free";
}

export function formatPlanPriceLabel(
  tier: PaidTier,
  channel: "web" | "iap",
): string {
  const usd =
    channel === "iap"
      ? PLAN_PRICING[tier].iapMonthlyUsd
      : PLAN_PRICING[tier].webMonthlyUsd;
  const dollars = usd % 1 === 0 ? `$${usd}` : `$${usd.toFixed(2)}`;
  return `${dollars} / mo`;
}

/** Marketing bullets for Settings → Usage plan cards. */
export function getPlanFeatureBullets(tier: Tier): string[] {
  const limits = PLAN_LIMITS[tier];

  const bullets = [
    `${limits.campaigns} campaigns / month`,
    `${limits.regenerations} slide regenerations / month`,
    `${limits.ttsPreviews} voice previews / month`,
    `${limits.brands} brand workspace${limits.brands === 1 ? "" : "s"}`,
  ];

  if (isPaidTier(tier)) {
    bullets.splice(2, 0, `${limits.videos} video exports / month`);
    bullets.push(`${limits.audioExports} narration exports / month`);
  }

  bullets.push(
    limits.maxPlatformConnections === 1
      ? "1 platform connection"
      : "YouTube, TikTok & Instagram",
  );

  return bullets;
}

export function getPlanHighlight(tier: PaidTier): string {
  return tier === "creator" ? "Most popular" : "High volume";
}
