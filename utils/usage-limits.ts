import type { UsageSummary } from "@/types/usage";
import { resolveBillingSource } from "@/utils/billing-rail";
import { HIDDEN_CAMPAIGN_STATUSES } from "@/utils/campaign-visibility";
import { getPlanLabel, getPlanLimits } from "@/utils/plan-limits";
import type { Tier } from "@/utils/plan-limits";
import { getPlatformConnectionSummary } from "@/utils/platform-connection-limits";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";

// ─── Date helpers (re-exported for COGS tracking in utils/tts/record-usage.ts) ─

export function getStartOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// ─── Error class ──────────────────────────────────────────────────────────────

export class UsageLimitError extends Error {
  readonly code = "LIMIT_EXCEEDED" as const;
  readonly tier: string;
  readonly upgradeUrl = "/settings/usage";

  constructor(message: string, tier: string = "free") {
    super(message);
    this.name = "UsageLimitError";
    this.tier = tier;
  }

  toJSON() {
    return {
      success: false,
      error: this.message,
      code: this.code,
      tier: this.tier,
      upgradeUrl: this.upgradeUrl,
    };
  }
}

export function isUsageLimitError(error: unknown): error is UsageLimitError {
  return error instanceof UsageLimitError;
}

// ─── Internal helper ─────────────────────────────────────────────────────────
// Fetches the usage_balances row for a user. Callers pass the user's authenticated
// client so RLS select-own policy is satisfied.

interface BalanceRow {
  tier: string;
  campaign_credits_remaining: number;
  regeneration_credits_remaining: number;
  video_credits_remaining: number;
  tts_preview_credits_remaining: number;
  audio_export_credits_remaining: number;
  current_period_end: string | null;
  stripe_customer_id: string | null;
  revenuecat_app_user_id: string | null;
}

async function fetchBalance(
  supabase: SupabaseClient,
  userId: string,
): Promise<BalanceRow> {
  const { data, error } = await supabase
    .from("usage_balances")
    .select(
      "tier, campaign_credits_remaining, regeneration_credits_remaining, video_credits_remaining, tts_preview_credits_remaining, audio_export_credits_remaining, current_period_end, stripe_customer_id, revenuecat_app_user_id",
    )
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error("Failed to load usage balance");
  }

  return data as BalanceRow;
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export async function getUsageSummary(
  supabase: SupabaseClient,
  userId: string,
): Promise<UsageSummary> {
  const [balance, campaignResult, brandResult, platformConnections] =
    await Promise.all([
    fetchBalance(supabase, userId),
    (async () => {
      let query = supabase
        .from("campaigns")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      for (const hiddenStatus of HIDDEN_CAMPAIGN_STATUSES) {
        query = query.neq("status", hiddenStatus);
      }

      return query;
    })(),
    supabase
      .from("brands")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    getPlatformConnectionSummary(userId),
  ]);

  const tier = balance.tier as Tier;
  const planLimits = getPlanLimits(tier);
  const brandCount = brandResult.count ?? 0;
  const brandLimit = planLimits.brands;

  const remaining = {
    campaigns: balance.campaign_credits_remaining,
    regenerations: balance.regeneration_credits_remaining,
    videos: balance.video_credits_remaining,
    ttsPreviews: balance.tts_preview_credits_remaining,
    audioExports: balance.audio_export_credits_remaining,
  };

  return {
    tier,
    planLabel: getPlanLabel(tier),
    remaining,
    limits: {
      campaigns: planLimits.campaigns,
      regenerations: planLimits.regenerations,
      videos: planLimits.videos,
      ttsPreviews: planLimits.ttsPreviews,
      audioExports: planLimits.audioExports,
      brands: brandLimit,
    },
    canCreateCampaign: remaining.campaigns > 0,
    canRegenerateSlide: remaining.regenerations > 0,
    canExportVideo: remaining.videos > 0,
    canPreviewTts: remaining.ttsPreviews > 0,
    canExportAudio: remaining.audioExports > 0,
    canCreateBrand: brandCount < brandLimit,
    brands: {
      count: brandCount,
      limit: brandLimit,
      canCreate: brandCount < brandLimit,
    },
    platformConnections,
    resetsAt: balance.current_period_end ?? null,
    billingSource: resolveBillingSource(
      tier,
      balance.stripe_customer_id,
      balance.revenuecat_app_user_id,
    ),
    totalCampaigns: campaignResult.count ?? 0,
  };
}

// ─── Assert helpers ───────────────────────────────────────────────────────────
// Each assert does a single targeted read from usage_balances. Throws UsageLimitError
// (with tier info) if the balance is exhausted.

export async function assertCampaignLimit(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const balance = await fetchBalance(supabase, userId);

  if (balance.campaign_credits_remaining <= 0) {
    throw new UsageLimitError(
      `Campaign limit reached for your ${getPlanLabel(balance.tier as Tier)} plan.`,
      balance.tier,
    );
  }
}

export async function assertRegenerationLimit(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const balance = await fetchBalance(supabase, userId);

  if (balance.regeneration_credits_remaining <= 0) {
    throw new UsageLimitError(
      `Slide regeneration limit reached for your ${getPlanLabel(balance.tier as Tier)} plan.`,
      balance.tier,
    );
  }
}

export async function assertVideoExportLimit(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const balance = await fetchBalance(supabase, userId);

  if (balance.video_credits_remaining <= 0) {
    throw new UsageLimitError(
      `Video export limit reached for your ${getPlanLabel(balance.tier as Tier)} plan.`,
      balance.tier,
    );
  }
}

export async function assertTtsPreviewLimit(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const balance = await fetchBalance(supabase, userId);

  if (balance.tts_preview_credits_remaining <= 0) {
    throw new UsageLimitError(
      `Voice preview limit reached for your ${getPlanLabel(balance.tier as Tier)} plan.`,
      balance.tier,
    );
  }
}

export async function assertTtsAudioExportLimit(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const balance = await fetchBalance(supabase, userId);

  if (balance.audio_export_credits_remaining <= 0) {
    throw new UsageLimitError(
      `Narration export limit reached for your ${getPlanLabel(balance.tier as Tier)} plan.`,
      balance.tier,
    );
  }
}

export async function assertBrandLimit(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const balance = await fetchBalance(supabase, userId);
  const tier = balance.tier as Tier;
  const brandLimit = getPlanLimits(tier).brands;

  const { count, error } = await supabase
    .from("brands")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    throw new Error("Failed to load brand count");
  }

  if ((count ?? 0) >= brandLimit) {
    throw new UsageLimitError(
      `Brand limit reached for your ${getPlanLabel(tier)} plan (${brandLimit} max).`,
      balance.tier,
    );
  }
}

// ─── Credit consumption ───────────────────────────────────────────────────────
// All record* functions call consume_credit() atomically via the admin client,
// then insert an audit row into usage_events.

async function consumeCredit(
  userId: string,
  creditType: "campaign" | "regeneration" | "video" | "tts_preview" | "audio_export",
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("consume_credit", {
    p_user_id: userId,
    p_credit: creditType,
  });

  if (error) {
    if (error.message.includes("credit_exhausted")) {
      throw new UsageLimitError(
        `${creditType} credit exhausted (concurrent request).`,
        "free",
      );
    }
    throw new Error(`Failed to consume ${creditType} credit: ${error.message}`);
  }
}

export async function recordCampaignCreation(userId: string): Promise<void> {
  await consumeCredit(userId, "campaign");

  const admin = createAdminClient();
  await admin.from("usage_events").insert({
    user_id: userId,
    event_type: "campaign_created",
  });
}

/** Refund a reserved campaign credit when text generation fails before slides exist. */
export async function refundCampaignCreationOnFailure(
  userId: string,
  campaignId: string,
): Promise<boolean> {
  const admin = createAdminClient();

  const { data: marked, error: markError } = await admin
    .from("campaigns")
    .update({ creation_credit_refunded: true })
    .eq("id", campaignId)
    .eq("user_id", userId)
    .eq("creation_credit_refunded", false)
    .select("id")
    .maybeSingle();

  if (markError) {
    throw new Error(
      `Failed to mark campaign credit refund: ${markError.message}`,
    );
  }

  if (!marked) {
    return false;
  }

  try {
    const { error: restoreError } = await admin.rpc("restore_credit", {
      p_user_id: userId,
      p_credit: "campaign",
    });

    if (restoreError) {
      throw new Error(
        `Failed to restore campaign credit: ${restoreError.message}`,
      );
    }

    await admin.from("usage_events").insert({
      user_id: userId,
      event_type: "campaign_refunded",
      metadata: { campaign_id: campaignId },
    });

    return true;
  } catch (error) {
    await admin
      .from("campaigns")
      .update({ creation_credit_refunded: false })
      .eq("id", campaignId)
      .eq("user_id", userId);

    throw error;
  }
}

export async function recordSlideRegeneration(userId: string): Promise<void> {
  await consumeCredit(userId, "regeneration");

  const admin = createAdminClient();
  await admin.from("usage_events").insert({
    user_id: userId,
    event_type: "slide_regenerated",
  });
}

export async function recordVideoExport(
  userId: string,
  metadata: RecordVideoExportMetadata,
): Promise<void> {
  await consumeCredit(userId, "video");

  const admin = createAdminClient();
  await admin.from("usage_events").insert({
    user_id: userId,
    event_type: "video_export",
    metadata,
  });
}

// ─── TTS record functions ──────────────────────────────────────────────────────

export interface RecordTtsPreviewMetadata {
  campaignId: string;
  slideId: string;
  persona: string;
  charCount: number;
  cached: boolean;
}

export async function recordTtsPreview(
  userId: string,
  metadata: RecordTtsPreviewMetadata,
): Promise<void> {
  await consumeCredit(userId, "tts_preview");

  const admin = createAdminClient();
  await admin.from("usage_events").insert({
    user_id: userId,
    event_type: "tts_preview",
    metadata,
  });
}

export interface RecordTtsAudioExportMetadata {
  campaignId: string;
  persona: string;
  slideCount: number;
  charCount: number;
}

export async function recordTtsAudioExport(
  userId: string,
  metadata: RecordTtsAudioExportMetadata,
): Promise<void> {
  await consumeCredit(userId, "audio_export");

  const admin = createAdminClient();
  await admin.from("usage_events").insert({
    user_id: userId,
    event_type: "tts_export",
    metadata,
  });
}

// ─── Video export metadata type ───────────────────────────────────────────────

export interface RecordVideoExportMetadata {
  campaignId: string;
  exportId: string;
  persona: string;
  slideCount: number;
  charCount: number;
}
