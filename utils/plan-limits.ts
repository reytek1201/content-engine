export type Tier = "free" | "creator" | "agency";

export interface TierLimits {
  campaigns: number;
  regenerations: number;
  videos: number;
  ttsPreviews: number;
  audioExports: number;
  brands: number;
}

/**
 * Hard credit caps per tier. These must match apply_tier_entitlement() in the SQL migration.
 * Free tier = lifetime credits (never refill). Paid tiers reset monthly on renewal.
 */
export const PLAN_LIMITS: Record<Tier, TierLimits> = {
  free: {
    campaigns: 3,
    regenerations: 10,
    videos: 0,
    ttsPreviews: 5,
    audioExports: 0,
    brands: 1,
  },
  creator: {
    campaigns: 15,
    regenerations: 30,
    videos: 5,
    ttsPreviews: 30,
    audioExports: 5,
    brands: 3,
  },
  agency: {
    campaigns: 50,
    regenerations: 100,
    videos: 15,
    ttsPreviews: 60,
    audioExports: 15,
    brands: 15,
  },
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

export function isLifetimeTier(tier: Tier): boolean {
  return tier === "free";
}
