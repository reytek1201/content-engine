import {
  createPlatformPost,
  getPlatformPostForCampaignExport,
  isPlatformPostInFlight,
  isPlatformPostScheduled,
  updatePlatformPost,
} from "@/utils/platform-post-store";
import { resolveVerticalVideoExport } from "@/utils/platforms/resolve-video-export";
import {
  ensureFreshTikTokAccessToken,
  getTikTokConnectionRow,
  clearTikTokPublishScope,
} from "@/utils/tiktok/connection-store";
import { TikTokPublishScopeError } from "@/utils/tiktok/publish-video";
import { publishTikTokVideo, queryTikTokCreatorInfo } from "@/utils/tiktok/publish-video";
import {
  toTikTokApiPostSettings,
  validateTikTokPublishSettings,
  type TikTokPublishFormSettings,
} from "@/utils/tiktok/publish-settings";
import { estimateExportDurationSeconds } from "@/utils/tiktok/video-metadata";
import { parseVideoExportMetadata } from "@/utils/fal-video";
import { assertPlatformPublishAllowed } from "@/utils/platform-connection-limits";
import { isUsageLimitError } from "@/utils/usage-limits";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 300;

const PublishSettingsSchema = z.object({
  privacyLevel: z.string().min(1),
  title: z.string().min(1).max(2200),
  allowComment: z.boolean(),
  allowDuet: z.boolean(),
  allowStitch: z.boolean(),
  commercialDisclosure: z.boolean(),
  yourBrand: z.boolean(),
  brandedContent: z.boolean(),
});

const RequestSchema = z.object({
  campaignId: z.string().uuid(),
  exportId: z.string().uuid().optional(),
  publishSettings: PublishSettingsSchema,
});

export async function POST(request: Request) {
  let postId: string | null = null;
  let userId: string | null = null;

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    userId = user.id;

    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 },
      );
    }

    const { campaignId, exportId, publishSettings } = parsed.data;

    await assertPlatformPublishAllowed(user.id, "tiktok");

    const connection = await getTikTokConnectionRow(user.id);

    if (!connection) {
      return NextResponse.json(
        {
          success: false,
          error: "Connect TikTok in Settings before publishing",
          code: "NOT_CONNECTED",
        },
        { status: 422 },
      );
    }

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, user_id")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign || campaign.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 },
      );
    }

    const { data: caption, error: captionError } = await supabase
      .from("platform_captions")
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("platform", "tiktok")
      .maybeSingle();

    if (captionError || !caption) {
      return NextResponse.json(
        {
          success: false,
          error: "Generate TikTok captions before publishing",
        },
        { status: 422 },
      );
    }

    const videoExport = await resolveVerticalVideoExport(
      supabase,
      campaignId,
      exportId,
    );

    const { data: exportRow } = await supabase
      .from("exports")
      .select("metadata")
      .eq("id", videoExport.id)
      .maybeSingle();

    const videoDurationSec = estimateExportDurationSeconds(
      parseVideoExportMetadata(exportRow?.metadata),
    );

    const freshConnection = await ensureFreshTikTokAccessToken(connection);
    const creator = await queryTikTokCreatorInfo(freshConnection.access_token);

    const validationError = validateTikTokPublishSettings(
      creator,
      publishSettings as TikTokPublishFormSettings,
      videoDurationSec,
    );

    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 422 },
      );
    }

    const existingPost = await getPlatformPostForCampaignExport(
      user.id,
      campaignId,
      videoExport.id,
      "tiktok",
    );

    if (existingPost?.status === "published") {
      return NextResponse.json({
        success: true,
        alreadyPublished: true,
        post: existingPost,
        video: existingPost.externalUrl
          ? {
              profileUrl: existingPost.externalUrl,
              videoUrl: existingPost.externalUrl,
            }
          : undefined,
      });
    }

    if (existingPost && isPlatformPostScheduled(existingPost.status)) {
      return NextResponse.json(
        {
          success: false,
          error: "This export has a pending scheduled post to TikTok. Cancel it first or wait for it to fire.",
          code: "SCHEDULED_POST_PENDING",
          post: existingPost,
        },
        { status: 409 },
      );
    }

    if (existingPost && isPlatformPostInFlight(existingPost.status)) {
      return NextResponse.json(
        {
          success: false,
          error: "This export is already being published to TikTok",
          code: "PUBLISH_IN_PROGRESS",
          post: existingPost,
        },
        { status: 409 },
      );
    }

    let post;

    try {
      post = await createPlatformPost({
        userId: user.id,
        campaignId,
        platform: "tiktok",
        exportId: videoExport.id,
        status: "uploading",
      });
    } catch (createError) {
      const racedPost = await getPlatformPostForCampaignExport(
        user.id,
        campaignId,
        videoExport.id,
        "tiktok",
      );

      if (racedPost?.status === "published") {
        return NextResponse.json({
          success: true,
          alreadyPublished: true,
          post: racedPost,
          video: racedPost.externalUrl
            ? {
                profileUrl: racedPost.externalUrl,
                videoUrl: racedPost.externalUrl,
              }
            : undefined,
        });
      }

      if (racedPost && isPlatformPostInFlight(racedPost.status)) {
        return NextResponse.json(
          {
            success: false,
            error: "This export is already being published to TikTok",
            code: "PUBLISH_IN_PROGRESS",
            post: racedPost,
          },
          { status: 409 },
        );
      }

      throw createError;
    }

    postId = post.id;

    await updatePlatformPost(post.id, { status: "processing" });

    const apiSettings = toTikTokApiPostSettings(
      creator,
      publishSettings as TikTokPublishFormSettings,
    );

    const published = await publishTikTokVideo({
      accessToken: freshConnection.access_token,
      videoUrl: videoExport.outputUrl,
      postSettings: apiSettings,
    });

    const stored = await updatePlatformPost(post.id, {
      status: "published",
      external_id: published.postId ?? published.publishId,
      external_url: published.videoUrl ?? published.profileUrl,
      error_message: null,
    });

    return NextResponse.json({
      success: true,
      post: stored,
      video: {
        profileUrl: published.profileUrl,
        videoUrl: published.videoUrl,
      },
    });
  } catch (error) {
    if (postId) {
      try {
        await updatePlatformPost(postId, {
          status: "failed",
          error_message:
            error instanceof Error ? error.message : "TikTok publish failed",
        });
      } catch (updateError) {
        console.error("Failed to mark platform post as failed:", updateError);
      }
    }

    if (error instanceof TikTokPublishScopeError) {
      if (userId) {
        try {
          await clearTikTokPublishScope(userId);
        } catch (clearError) {
          console.error("Failed to clear TikTok publish scope:", clearError);
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: "PUBLISH_SCOPE_REQUIRED",
          authorizeUrl: "/api/platforms/tiktok/publish-authorize",
        },
        { status: 403 },
      );
    }

    if (isUsageLimitError(error)) {
      return NextResponse.json(error.toJSON(), { status: 429 });
    }

    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
