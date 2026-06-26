import type { BillingSource, UsageRemaining } from "@/types/usage";
import type { Tier } from "@/utils/plan-limits";
import { getPlanLimits } from "@/utils/plan-limits";

/** Stripe web vs RevenueCat IAP — used for manage-subscription UI. */
export function resolveBillingSource(
  tier: Tier,
  stripeCustomerId: string | null | undefined,
  revenuecatAppUserId: string | null | undefined,
): BillingSource | null {
  if (tier === "free") return null;
  if (stripeCustomerId) return "stripe";
  if (revenuecatAppUserId) return "iap";
  return null;
}

/** Cap displayed credits when DB still has legacy v1 balances above v2 tier caps. */
export function clampUsageRemainingForDisplay(
  remaining: UsageRemaining,
  tier: Tier,
): UsageRemaining {
  const limits = getPlanLimits(tier);
  return {
    campaigns: Math.min(remaining.campaigns, limits.campaigns),
    regenerations: Math.min(remaining.regenerations, limits.regenerations),
    videos: Math.min(remaining.videos, limits.videos),
    ttsPreviews: Math.min(remaining.ttsPreviews, limits.ttsPreviews),
    audioExports: Math.min(remaining.audioExports, limits.audioExports),
  };
}
