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
  const ttsPreviewsPerMonth = parseInt(
    process.env.BETA_TTS_PREVIEWS_PER_MONTH ?? "30",
    10
  );
  const audioExportsPerMonth = parseInt(
    process.env.BETA_AUDIO_EXPORTS_PER_MONTH ?? "5",
    10
  );

  return {
    campaignsPerMonth: Number.isFinite(campaignsPerMonth)
      ? campaignsPerMonth
      : 10,
    slideRegenerationsPerMonth: Number.isFinite(slideRegenerationsPerMonth)
      ? slideRegenerationsPerMonth
      : 30,
    ttsPreviewsPerMonth: Number.isFinite(ttsPreviewsPerMonth)
      ? ttsPreviewsPerMonth
      : 30,
    audioExportsPerMonth: Number.isFinite(audioExportsPerMonth)
      ? audioExportsPerMonth
      : 5,
  };
}

export function campaignLimitMessage(limit: number): string {
  return `Beta limit: ${limit} campaigns per month. Resets on the 1st.`;
}

export function regenerationLimitMessage(limit: number): string {
  return `Beta limit: ${limit} slide regenerations per month. Resets on the 1st.`;
}

export function ttsPreviewLimitMessage(limit: number): string {
  return `Beta limit: ${limit} voice previews per month. Resets on the 1st.`;
}

export function audioExportLimitMessage(limit: number): string {
  return `Beta limit: ${limit} narration exports per month. Resets on the 1st.`;
}

export async function getUsageSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<UsageSummary> {
  const limits = getBetaLimits();
  const startOfMonth = getStartOfMonth();

  const { count: campaignsThisMonth, error: campaignCountError } = await supabase
    .from("usage_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", "campaign_created")
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

  const { count: ttsPreviewsThisMonth, error: ttsPreviewError } = await supabase
    .from("usage_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", "tts_preview")
    .gte("created_at", startOfMonth.toISOString());

  if (ttsPreviewError) {
    throw new Error("Failed to load TTS preview usage");
  }

  const { count: audioExportsThisMonth, error: audioExportError } = await supabase
    .from("usage_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", "tts_export")
    .gte("created_at", startOfMonth.toISOString());

  if (audioExportError) {
    throw new Error("Failed to load audio export usage");
  }

  const campaignsUsed = campaignsThisMonth ?? 0;
  const regenerationsUsed = slideRegenerationsThisMonth ?? 0;
  const ttsPreviewsUsed = ttsPreviewsThisMonth ?? 0;
  const audioExportsUsed = audioExportsThisMonth ?? 0;

  const remainingCampaigns = Math.max(
    0,
    limits.campaignsPerMonth - campaignsUsed
  );
  const remainingRegenerations = Math.max(
    0,
    limits.slideRegenerationsPerMonth - regenerationsUsed
  );
  const remainingTtsPreviews = Math.max(
    0,
    limits.ttsPreviewsPerMonth - ttsPreviewsUsed
  );
  const remainingAudioExports = Math.max(
    0,
    limits.audioExportsPerMonth - audioExportsUsed
  );

  return {
    campaignsThisMonth: campaignsUsed,
    totalCampaigns: totalCampaigns ?? 0,
    slideRegenerationsThisMonth: regenerationsUsed,
    ttsPreviewsThisMonth: ttsPreviewsUsed,
    audioExportsThisMonth: audioExportsUsed,
    limits,
    remaining: {
      campaigns: remainingCampaigns,
      slideRegenerations: remainingRegenerations,
      ttsPreviews: remainingTtsPreviews,
      audioExports: remainingAudioExports,
    },
    canCreateCampaign: remainingCampaigns > 0,
    canRegenerateSlide: remainingRegenerations > 0,
    canPreviewTts: remainingTtsPreviews > 0,
    canExportAudio: remainingAudioExports > 0,
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

export async function assertTtsPreviewLimit(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const usage = await getUsageSummary(supabase, userId);

  if (!usage.canPreviewTts) {
    throw new UsageLimitError(
      ttsPreviewLimitMessage(usage.limits.ttsPreviewsPerMonth),
    );
  }
}

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
  const supabase = createAdminClient();
  const { error } = await supabase.from("usage_events").insert({
    user_id: userId,
    event_type: "tts_preview",
    metadata,
  });

  if (error) {
    throw new Error("Failed to record TTS preview");
  }
}

export async function assertTtsAudioExportLimit(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const usage = await getUsageSummary(supabase, userId);

  if (!usage.canExportAudio) {
    throw new UsageLimitError(
      audioExportLimitMessage(usage.limits.audioExportsPerMonth),
    );
  }
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
  const supabase = createAdminClient();
  const { error } = await supabase.from("usage_events").insert({
    user_id: userId,
    event_type: "tts_export",
    metadata,
  });

  if (error) {
    throw new Error("Failed to record audio export");
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

export async function recordCampaignCreation(userId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("usage_events").insert({
    user_id: userId,
    event_type: "campaign_created",
  });

  if (error) {
    throw new Error("Failed to record campaign creation");
  }
}
