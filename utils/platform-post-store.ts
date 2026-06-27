import type {
  PlatformPostPublic,
  PlatformPostRow,
  PlatformPostStatus,
  PlatformPostScheduleStatus,
  PlatformPostPlatform,
} from "@/types/platform-post";
import { toPlatformPostPublic } from "@/types/platform-post";
import { createAdminClient } from "@/utils/supabase/admin";
import { maybeSendPlatformPublishPush } from "@/utils/send-campaign-push";

export async function createPlatformPost(input: {
  userId: string;
  campaignId: string;
  platform: PlatformPostPlatform;
  exportId?: string | null;
  status?: PlatformPostStatus;
}): Promise<PlatformPostPublic> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("platform_posts")
    .insert({
      user_id: input.userId,
      campaign_id: input.campaignId,
      platform: input.platform,
      export_id: input.exportId ?? null,
      status: input.status ?? "pending",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create platform post");
  }

  return toPlatformPostPublic(data as PlatformPostRow);
}

export async function createScheduledPlatformPost(input: {
  userId: string;
  campaignId: string;
  platform: PlatformPostPlatform;
  exportId?: string | null;
  scheduledFor: string;
  publishSettings?: Record<string, unknown> | null;
}): Promise<PlatformPostPublic> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("platform_posts")
    .insert({
      user_id: input.userId,
      campaign_id: input.campaignId,
      platform: input.platform,
      export_id: input.exportId ?? null,
      status: "scheduled",
      scheduled_for: input.scheduledFor,
      schedule_status: "pending",
      publish_settings: input.publishSettings ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create scheduled platform post");
  }

  return toPlatformPostPublic(data as PlatformPostRow);
}

export async function cancelScheduledPlatformPost(
  postId: string,
  userId: string,
): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("platform_posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", userId)
    .eq("status", "scheduled")
    .eq("schedule_status", "pending");

  if (error) {
    throw new Error(error.message ?? "Failed to cancel scheduled post");
  }
}

export async function updatePlatformPost(
  postId: string,
  patch: Partial<
    Pick<
      PlatformPostRow,
      | "status"
      | "external_id"
      | "external_url"
      | "error_message"
      | "schedule_status"
      | "failure_reason"
    >
  >,
): Promise<PlatformPostPublic> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("platform_posts")
    .update(patch)
    .eq("id", postId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update platform post");
  }

  const post = toPlatformPostPublic(data as PlatformPostRow);

  if (patch.status === "published" || patch.status === "failed") {
    await maybeSendPlatformPublishPush(post.id);
  }

  return post;
}

export async function getPlatformPostForUser(
  postId: string,
  userId: string,
): Promise<PlatformPostPublic | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("platform_posts")
    .select("*")
    .eq("id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toPlatformPostPublic(data as PlatformPostRow) : null;
}

export async function getLatestPlatformPostForCampaign(
  userId: string,
  campaignId: string,
  platform: PlatformPostPlatform,
): Promise<PlatformPostPublic | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("platform_posts")
    .select("*")
    .eq("user_id", userId)
    .eq("campaign_id", campaignId)
    .eq("platform", platform)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toPlatformPostPublic(data as PlatformPostRow) : null;
}

export async function getPlatformPostForCampaignExport(
  userId: string,
  campaignId: string,
  exportId: string,
  platform: PlatformPostPlatform,
): Promise<PlatformPostPublic | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("platform_posts")
    .select("*")
    .eq("user_id", userId)
    .eq("campaign_id", campaignId)
    .eq("export_id", exportId)
    .eq("platform", platform)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toPlatformPostPublic(data as PlatformPostRow) : null;
}

export async function getPlatformPostForCampaignCarousel(
  userId: string,
  campaignId: string,
  platform: PlatformPostPlatform = "instagram",
): Promise<PlatformPostPublic | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("platform_posts")
    .select("*")
    .eq("user_id", userId)
    .eq("campaign_id", campaignId)
    .eq("platform", platform)
    .is("export_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toPlatformPostPublic(data as PlatformPostRow) : null;
}

/**
 * Returns any pending scheduled post for a campaign+platform+export combination.
 * Used by readiness routes to surface "Scheduled for [time]" state in the UI.
 */
export async function getScheduledPlatformPostForExport(
  userId: string,
  campaignId: string,
  exportId: string,
  platform: PlatformPostPlatform,
): Promise<PlatformPostPublic | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("platform_posts")
    .select("*")
    .eq("user_id", userId)
    .eq("campaign_id", campaignId)
    .eq("export_id", exportId)
    .eq("platform", platform)
    .eq("status", "scheduled")
    .eq("schedule_status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toPlatformPostPublic(data as PlatformPostRow) : null;
}

/**
 * Returns any pending scheduled carousel post for a campaign.
 */
export async function getScheduledPlatformPostForCarousel(
  userId: string,
  campaignId: string,
): Promise<PlatformPostPublic | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("platform_posts")
    .select("*")
    .eq("user_id", userId)
    .eq("campaign_id", campaignId)
    .eq("platform", "instagram")
    .is("export_id", null)
    .eq("status", "scheduled")
    .eq("schedule_status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toPlatformPostPublic(data as PlatformPostRow) : null;
}

// 'scheduled' is intentionally excluded — it's a future-intent state, not an
// active upload. Routes handle it with a separate explicit check.
const IN_FLIGHT_POST_STATUSES: PlatformPostStatus[] = [
  "pending",
  "uploading",
  "processing",
];

export function isPlatformPostInFlight(status: PlatformPostStatus): boolean {
  return IN_FLIGHT_POST_STATUSES.includes(status);
}

export function isPlatformPostScheduled(status: PlatformPostStatus): boolean {
  return status === "scheduled";
}

/** @deprecated Use getLatestPlatformPostForCampaign(userId, campaignId, "youtube") */
export async function getLatestYouTubePostForCampaign(
  userId: string,
  campaignId: string,
): Promise<PlatformPostPublic | null> {
  return getLatestPlatformPostForCampaign(userId, campaignId, "youtube");
}
