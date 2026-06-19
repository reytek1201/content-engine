import type {
  PlatformPostPublic,
  PlatformPostRow,
  PlatformPostStatus,
} from "@/types/platform-post";
import { toPlatformPostPublic } from "@/types/platform-post";
import { createAdminClient } from "@/utils/supabase/admin";

export async function createPlatformPost(input: {
  userId: string;
  campaignId: string;
  platform: "youtube";
  exportId: string;
  status?: PlatformPostStatus;
}): Promise<PlatformPostPublic> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("platform_posts")
    .insert({
      user_id: input.userId,
      campaign_id: input.campaignId,
      platform: input.platform,
      export_id: input.exportId,
      status: input.status ?? "pending",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create platform post");
  }

  return toPlatformPostPublic(data as PlatformPostRow);
}

export async function updatePlatformPost(
  postId: string,
  patch: Partial<
    Pick<
      PlatformPostRow,
      "status" | "external_id" | "external_url" | "error_message"
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

  return toPlatformPostPublic(data as PlatformPostRow);
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

export async function getLatestYouTubePostForCampaign(
  userId: string,
  campaignId: string,
): Promise<PlatformPostPublic | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("platform_posts")
    .select("*")
    .eq("user_id", userId)
    .eq("campaign_id", campaignId)
    .eq("platform", "youtube")
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
): Promise<PlatformPostPublic | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("platform_posts")
    .select("*")
    .eq("user_id", userId)
    .eq("campaign_id", campaignId)
    .eq("export_id", exportId)
    .eq("platform", "youtube")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toPlatformPostPublic(data as PlatformPostRow) : null;
}

const IN_FLIGHT_POST_STATUSES: PlatformPostStatus[] = [
  "pending",
  "uploading",
  "processing",
];

export function isPlatformPostInFlight(status: PlatformPostStatus): boolean {
  return IN_FLIGHT_POST_STATUSES.includes(status);
}
