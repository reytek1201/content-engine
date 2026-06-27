/**
 * Core publish logic extracted for use by both the cron job and (optionally) route handlers.
 * All four platforms are handled here, calling the exact same upload APIs as the route handlers.
 * No new platform API logic is written — every upload call delegates to existing utils.
 */

import type { TikTokPublishFormSettings } from "@/utils/tiktok/publish-settings";
import {
  toTikTokApiPostSettings,
} from "@/utils/tiktok/publish-settings";
import type { PlatformPostPlatform } from "@/types/platform-post";
import { updatePlatformPost } from "@/utils/platform-post-store";
import { createAdminClient } from "@/utils/supabase/admin";

import {
  getYouTubeConnectionRow,
  ensureFreshYouTubeAccessToken,
} from "@/utils/youtube/connection-store";
import {
  uploadYouTubeShort,
  YouTubeUploadScopeError,
} from "@/utils/youtube/upload-short";
import {
  buildYouTubeVideoMetadata,
  buildYouTubeShortsUrl,
  buildYouTubeWatchUrl,
  getYouTubePublishPrivacyStatus,
} from "@/utils/youtube/video-metadata";
import { resolveYouTubeVideoExport } from "@/utils/youtube/resolve-video-export";

import {
  getTikTokConnectionRow,
  ensureFreshTikTokAccessToken,
} from "@/utils/tiktok/connection-store";
import {
  publishTikTokVideo,
  queryTikTokCreatorInfo,
  TikTokPublishScopeError,
} from "@/utils/tiktok/publish-video";
import { resolveVerticalVideoExport } from "@/utils/platforms/resolve-video-export";
import { parseVideoExportMetadata } from "@/utils/fal-video";
import { estimateExportDurationSeconds } from "@/utils/tiktok/video-metadata";
import { validateTikTokPublishSettings } from "@/utils/tiktok/publish-settings";

import {
  getInstagramConnectionRow,
  ensureFreshInstagramAccessToken,
} from "@/utils/instagram/connection-store";
import {
  publishInstagramReel,
  InstagramPublishScopeError,
} from "@/utils/instagram/publish-reel";
import { publishInstagramCarousel } from "@/utils/instagram/publish-carousel";
import { fetchInstagramBusinessAccount } from "@/utils/instagram/oauth";
import {
  buildInstagramCaption,
  buildInstagramReelCaption,
} from "@/utils/instagram/video-metadata";
import { resolveCarouselSlidesForCampaign } from "@/utils/platforms/resolve-carousel-slides";
import { hasInstagramPublishScope } from "@/utils/platforms/scopes";
import type { PlatformCaption } from "@/types/captions";

export interface ExecutePublishResult {
  externalId: string | null;
  externalUrl: string | null;
}

/**
 * Executes a platform publish for an existing platform_posts row.
 * The row must be in 'scheduled' or a freshly-created 'pending'/'uploading' state.
 * On success, transitions status to 'published'.
 * Throws on any error — caller is responsible for marking the row 'failed'.
 */
export async function executePlatformPublish(
  postId: string,
  userId: string,
  campaignId: string,
  platform: PlatformPostPlatform,
  exportId: string | null,
  publishSettings: Record<string, unknown> | null,
): Promise<ExecutePublishResult> {
  const admin = createAdminClient();

  await updatePlatformPost(postId, { status: "uploading" });

  if (platform === "youtube") {
    return executeYouTubePublish(admin, postId, userId, campaignId, exportId);
  }

  if (platform === "tiktok") {
    return executeTikTokPublish(
      admin,
      postId,
      userId,
      campaignId,
      exportId,
      publishSettings,
    );
  }

  if (platform === "instagram" && exportId !== null) {
    return executeInstagramReelPublish(admin, postId, userId, campaignId, exportId);
  }

  if (platform === "instagram" && exportId === null) {
    return executeInstagramCarouselPublish(admin, postId, userId, campaignId);
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

async function executeYouTubePublish(
  admin: ReturnType<typeof createAdminClient>,
  postId: string,
  userId: string,
  campaignId: string,
  exportId: string | null,
): Promise<ExecutePublishResult> {
  const connection = await getYouTubeConnectionRow(userId);

  if (!connection) {
    throw new Error(
      "YouTube is no longer connected. Reconnect your account in Settings.",
    );
  }

  const { data: captionRow } = await admin
    .from("platform_captions")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("platform", "youtube_shorts")
    .maybeSingle();

  if (!captionRow) {
    throw new Error("YouTube Shorts captions are missing.");
  }

  const videoExport = await resolveYouTubeVideoExport(
    admin as any, // admin client is compatible; type alias difference only
    campaignId,
    exportId ?? undefined,
  );

  const freshConnection = await ensureFreshYouTubeAccessToken(connection);
  const metadata = buildYouTubeVideoMetadata(captionRow as PlatformCaption);
  const privacyStatus = getYouTubePublishPrivacyStatus();

  const uploaded = await uploadYouTubeShort({
    accessToken: freshConnection.access_token,
    videoUrl: videoExport.outputUrl,
    metadata,
    privacyStatus,
  });

  await updatePlatformPost(postId, {
    status: "published",
    external_id: uploaded.videoId,
    external_url: uploaded.shortsUrl,
    error_message: null,
  });

  return {
    externalId: uploaded.videoId,
    externalUrl: buildYouTubeShortsUrl(uploaded.videoId),
  };
}

async function executeTikTokPublish(
  admin: ReturnType<typeof createAdminClient>,
  postId: string,
  userId: string,
  campaignId: string,
  exportId: string | null,
  rawSettings: Record<string, unknown> | null,
): Promise<ExecutePublishResult> {
  const connection = await getTikTokConnectionRow(userId);

  if (!connection) {
    throw new Error(
      "TikTok is no longer connected. Reconnect your account in Settings.",
    );
  }

  const { data: captionRow } = await admin
    .from("platform_captions")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("platform", "tiktok")
    .maybeSingle();

  if (!captionRow) {
    throw new Error("TikTok captions are missing.");
  }

  const videoExport = await resolveVerticalVideoExport(
    admin as any,
    campaignId,
    exportId ?? undefined,
  );

  const { data: exportRow } = await admin
    .from("exports")
    .select("metadata")
    .eq("id", videoExport.id)
    .maybeSingle();

  const videoDurationSec = estimateExportDurationSeconds(
    parseVideoExportMetadata(exportRow?.metadata),
  );

  const freshConnection = await ensureFreshTikTokAccessToken(connection);
  const creator = await queryTikTokCreatorInfo(freshConnection.access_token);

  const formSettings = rawSettings as TikTokPublishFormSettings | null;

  if (!formSettings) {
    throw new Error("TikTok publish settings are missing from scheduled post.");
  }

  const validationError = validateTikTokPublishSettings(
    creator,
    formSettings,
    videoDurationSec,
  );

  if (validationError) {
    throw new Error(`TikTok settings are no longer valid: ${validationError}`);
  }

  await updatePlatformPost(postId, { status: "processing" });

  const apiSettings = toTikTokApiPostSettings(creator, formSettings);

  const published = await publishTikTokVideo({
    accessToken: freshConnection.access_token,
    videoUrl: videoExport.outputUrl,
    postSettings: apiSettings,
  });

  await updatePlatformPost(postId, {
    status: "published",
    external_id: published.postId ?? published.publishId,
    external_url: published.videoUrl ?? published.profileUrl,
    error_message: null,
  });

  return {
    externalId: published.postId ?? published.publishId,
    externalUrl: published.videoUrl ?? published.profileUrl,
  };
}

async function executeInstagramReelPublish(
  admin: ReturnType<typeof createAdminClient>,
  postId: string,
  userId: string,
  campaignId: string,
  exportId: string,
): Promise<ExecutePublishResult> {
  const connection = await getInstagramConnectionRow(userId);

  if (!connection) {
    throw new Error(
      "Instagram is no longer connected. Reconnect your account in Settings.",
    );
  }

  if (!hasInstagramPublishScope(connection.scopes)) {
    throw new Error(
      "Instagram publishing permission was revoked. Re-grant access in Settings → Connected accounts.",
    );
  }

  const { data: captionRow } = await admin
    .from("platform_captions")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("platform", "instagram")
    .maybeSingle();

  if (!captionRow) {
    throw new Error("Instagram captions are missing.");
  }

  const videoExport = await resolveVerticalVideoExport(
    admin as any,
    campaignId,
    exportId,
  );

  await updatePlatformPost(postId, { status: "processing" });

  const freshConnection = await ensureFreshInstagramAccessToken(connection);
  const account = await fetchInstagramBusinessAccount(
    freshConnection.access_token,
  );
  const reelCaption = buildInstagramReelCaption(captionRow as PlatformCaption);

  const published = await publishInstagramReel({
    userAccessToken: freshConnection.access_token,
    instagramUserId: account.instagramUserId,
    pageId: account.pageId,
    videoUrl: videoExport.outputUrl,
    caption: reelCaption,
  });

  await updatePlatformPost(postId, {
    status: "published",
    external_id: published.mediaId,
    external_url: published.permalink,
    error_message: null,
  });

  return {
    externalId: published.mediaId,
    externalUrl: published.permalink,
  };
}

async function executeInstagramCarouselPublish(
  admin: ReturnType<typeof createAdminClient>,
  postId: string,
  userId: string,
  campaignId: string,
): Promise<ExecutePublishResult> {
  const connection = await getInstagramConnectionRow(userId);

  if (!connection) {
    throw new Error(
      "Instagram is no longer connected. Reconnect your account in Settings.",
    );
  }

  if (!hasInstagramPublishScope(connection.scopes)) {
    throw new Error(
      "Instagram publishing permission was revoked. Re-grant access in Settings → Connected accounts.",
    );
  }

  const { data: captionRow } = await admin
    .from("platform_captions")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("platform", "instagram")
    .maybeSingle();

  if (!captionRow) {
    throw new Error("Instagram captions are missing.");
  }

  const carouselSlides = await resolveCarouselSlidesForCampaign(
    admin as any,
    campaignId,
  );

  await updatePlatformPost(postId, { status: "processing" });

  const freshConnection = await ensureFreshInstagramAccessToken(connection);
  const account = await fetchInstagramBusinessAccount(
    freshConnection.access_token,
  );
  const carouselCaption = buildInstagramCaption(captionRow as PlatformCaption);

  const published = await publishInstagramCarousel({
    userAccessToken: freshConnection.access_token,
    instagramUserId: account.instagramUserId,
    pageId: account.pageId,
    imageUrls: carouselSlides.imageUrls,
    caption: carouselCaption,
  });

  await updatePlatformPost(postId, {
    status: "published",
    external_id: published.mediaId,
    external_url: published.permalink,
    error_message: null,
  });

  return {
    externalId: published.mediaId,
    externalUrl: published.permalink,
  };
}

/**
 * Converts a raw publish error into a user-facing failure_reason string,
 * distinguishing connection/scope errors from rate limits and generic API errors.
 */
export function classifyPublishFailureReason(
  error: unknown,
  platform: PlatformPostPlatform,
): string {
  if (!(error instanceof Error)) {
    return `${platform} publish failed. Try again or post now from the campaign.`;
  }

  const msg = error.message;

  if (
    error instanceof YouTubeUploadScopeError ||
    error instanceof TikTokPublishScopeError ||
    error instanceof InstagramPublishScopeError ||
    msg.includes("Reconnect your account") ||
    msg.includes("no longer connected")
  ) {
    const name =
      platform === "youtube"
        ? "YouTube"
        : platform === "tiktok"
          ? "TikTok"
          : "Instagram";
    return `${name} is no longer connected or permission was revoked. Go to Settings → Connected accounts to reconnect, then reschedule or post now.`;
  }

  if (
    msg.includes("daily upload limit") ||
    msg.includes("daily post limit") ||
    msg.includes("rate limit") ||
    msg.includes("spam_risk")
  ) {
    return `${msg} Reschedule for a later time.`;
  }

  return msg;
}
