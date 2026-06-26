import {
  clearPlatformConnectionGrace,
  startPlatformConnectionGraceIfNeeded,
} from "@/utils/platform-connection-grace";
import { getFreeTierPeriodEndIso } from "@/utils/free-tier-period";
import { createAdminClient } from "@/utils/supabase/admin";

export async function applyTierEntitlement(
  userId: string,
  tier: string,
  periodEndIso: string | null,
): Promise<void> {
  const admin = createAdminClient();
  const resolvedPeriodEnd =
    tier === "free" && !periodEndIso ? getFreeTierPeriodEndIso() : periodEndIso;

  const { error } = await admin.rpc("apply_tier_entitlement", {
    p_user_id: userId,
    p_tier: tier,
    p_period_end: resolvedPeriodEnd,
  });

  if (error) {
    throw new Error(`apply_tier_entitlement failed: ${error.message}`);
  }

  if (tier === "free") {
    await startPlatformConnectionGraceIfNeeded(userId);
  } else {
    await clearPlatformConnectionGrace(userId);
  }
}
