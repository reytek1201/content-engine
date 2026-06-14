import type { UsageSummary } from "@/types/usage";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";

export class UsageLimitError extends Error {
  readonly code = "LIMIT_EXCEEDED" as const;

  constructor(message: string) {
    super(message);
    this.name = "UsageLimitError";
  }
}

export function isUsageLimitError(error: unknown): error is UsageLimitError {
  return error instanceof UsageLimitError;
}

export function getStartOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getNextMonthStart(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

export function getBetaLimits() {
  const campaignsPerMonth = parseInt(
    process.env.BETA_CAMPAIGNS_PER_MONTH ?? "10",
    10
  );
  const slideRegenerationsPerMonth = parseInt(
    process.env.BETA_REGENERATIONS_PER_MONTH ?? "30",
    10
  );

  return {
    campaignsPerMonth: Number.isFinite(campaignsPerMonth)
      ? campaignsPerMonth
      : 10,
    slideRegenerationsPerMonth: Number.isFinite(slideRegenerationsPerMonth)
      ? slideRegenerationsPerMonth
      : 30,
  };
}

export function campaignLimitMessage(limit: number): string {
  return `Beta limit: ${limit} campaigns per month. Resets on the 1st.`;
}

export function regenerationLimitMessage(limit: number): string {
  return `Beta limit: ${limit} slide regenerations per month. Resets on the 1st.`;
}

export async function getUsageSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<UsageSummary> {
  const limits = getBetaLimits();
  const startOfMonth = getStartOfMonth();

  const { count: campaignsThisMonth, error: campaignCountError } = await supabase
    .from("campaigns")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfMonth.toISOString());

  if (campaignCountError) {
    throw new Error("Failed to load campaign usage");
  }

  const { count: totalCampaigns, error: totalError } = await supabase
    .from("campaigns")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (totalError) {
    throw new Error("Failed to load campaign usage");
  }

  const { count: slideRegenerationsThisMonth, error: regenError } =
    await supabase
      .from("usage_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "slide_regenerated")
      .gte("created_at", startOfMonth.toISOString());

  if (regenError) {
    throw new Error("Failed to load regeneration usage");
  }

  const campaignsUsed = campaignsThisMonth ?? 0;
  const regenerationsUsed = slideRegenerationsThisMonth ?? 0;

  const remainingCampaigns = Math.max(
    0,
    limits.campaignsPerMonth - campaignsUsed
  );
  const remainingRegenerations = Math.max(
    0,
    limits.slideRegenerationsPerMonth - regenerationsUsed
  );

  return {
    campaignsThisMonth: campaignsUsed,
    totalCampaigns: totalCampaigns ?? 0,
    slideRegenerationsThisMonth: regenerationsUsed,
    limits,
    remaining: {
      campaigns: remainingCampaigns,
      slideRegenerations: remainingRegenerations,
    },
    canCreateCampaign: remainingCampaigns > 0,
    canRegenerateSlide: remainingRegenerations > 0,
    planLabel: "Early access",
    resetsAt: getNextMonthStart().toISOString(),
  };
}

export async function assertCampaignLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const usage = await getUsageSummary(supabase, userId);

  if (!usage.canCreateCampaign) {
    throw new UsageLimitError(campaignLimitMessage(usage.limits.campaignsPerMonth));
  }
}

export async function assertRegenerationLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const usage = await getUsageSummary(supabase, userId);

  if (!usage.canRegenerateSlide) {
    throw new UsageLimitError(
      regenerationLimitMessage(usage.limits.slideRegenerationsPerMonth)
    );
  }
}

export async function recordSlideRegeneration(userId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("usage_events").insert({
    user_id: userId,
    event_type: "slide_regenerated",
  });

  if (error) {
    throw new Error("Failed to record slide regeneration");
  }
}
