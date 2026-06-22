import {
  createPlatformPost,
  getPlatformPostForCampaignExport,
  isPlatformPostInFlight,
  updatePlatformPost,
} from "@/utils/youtube/platform-post-store";
import {
  ensureFreshYouTubeAccessToken,
  getYouTubeConnectionRow,
} from "@/utils/youtube/connection-store";
import { resolveYouTubeVideoExport } from "@/utils/youtube/resolve-video-export";
import {
  uploadYouTubeShort,
  YouTubeUploadScopeError,
} from "@/utils/youtube/upload-short";
import {
  buildYouTubeShortsUrl,
  buildYouTubeVideoMetadata,
  buildYouTubeWatchUrl,
  getYouTubePublishPrivacyStatus,
} from "@/utils/youtube/video-metadata";
import type { PlatformCaption } from "@/types/captions";
import { assertPlatformPublishAllowed } from "@/utils/platform-connection-limits";
import { isUsageLimitError } from "@/utils/usage-limits";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 300;

const RequestSchema = z.object({
  campaignId: z.string().uuid(),
  exportId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  let postId: string | null = null;

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

    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 },
      );
    }

    const { campaignId, exportId } = parsed.data;

    await assertPlatformPublishAllowed(user.id, "youtube");

    const connection = await getYouTubeConnectionRow(user.id);

    if (!connection) {
      return NextResponse.json(
        {
          success: false,
          error: "Connect YouTube in Settings before publishing",
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
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("platform", "youtube_shorts")
      .maybeSingle();

    if (captionError || !caption) {
      return NextResponse.json(
        {
          success: false,
          error: "Generate YouTube Shorts captions before publishing",
        },
        { status: 422 },
      );
    }

    const videoExport = await resolveYouTubeVideoExport(
      supabase,
      campaignId,
      exportId,
    );

    const existingPost = await getPlatformPostForCampaignExport(
      user.id,
      campaignId,
      videoExport.id,
      "youtube",
    );

    if (existingPost?.status === "published") {
      return NextResponse.json({
        success: true,
        alreadyPublished: true,
        post: existingPost,
        video: existingPost.externalId
          ? {
              id: existingPost.externalId,
              watchUrl: buildYouTubeWatchUrl(existingPost.externalId),
              shortsUrl:
                existingPost.externalUrl ??
                buildYouTubeShortsUrl(existingPost.externalId),
              privacyStatus: getYouTubePublishPrivacyStatus(),
            }
          : undefined,
      });
    }

    if (existingPost && isPlatformPostInFlight(existingPost.status)) {
      return NextResponse.json(
        {
          success: false,
          error: "This export is already being published to YouTube",
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
        platform: "youtube",
        exportId: videoExport.id,
        status: "uploading",
      });
    } catch (createError) {
      const racedPost = await getPlatformPostForCampaignExport(
        user.id,
        campaignId,
        videoExport.id,
        "youtube",
      );

      if (racedPost?.status === "published") {
        return NextResponse.json({
          success: true,
          alreadyPublished: true,
          post: racedPost,
          video: racedPost.externalId
            ? {
                id: racedPost.externalId,
                watchUrl: buildYouTubeWatchUrl(racedPost.externalId),
                shortsUrl:
                  racedPost.externalUrl ??
                  buildYouTubeShortsUrl(racedPost.externalId),
                privacyStatus: getYouTubePublishPrivacyStatus(),
              }
            : undefined,
        });
      }

      if (racedPost && isPlatformPostInFlight(racedPost.status)) {
        return NextResponse.json(
          {
            success: false,
            error: "This export is already being published to YouTube",
            code: "PUBLISH_IN_PROGRESS",
            post: racedPost,
          },
          { status: 409 },
        );
      }

      throw createError;
    }

    postId = post.id;

    const freshConnection = await ensureFreshYouTubeAccessToken(connection);
    const metadata = buildYouTubeVideoMetadata(caption as PlatformCaption);
    const privacyStatus = getYouTubePublishPrivacyStatus();

    const uploaded = await uploadYouTubeShort({
      accessToken: freshConnection.access_token,
      videoUrl: videoExport.outputUrl,
      metadata,
      privacyStatus,
    });

    const published = await updatePlatformPost(post.id, {
      status: "published",
      external_id: uploaded.videoId,
      external_url: uploaded.shortsUrl,
      error_message: null,
    });

    return NextResponse.json({
      success: true,
      post: published,
      video: {
        id: uploaded.videoId,
        watchUrl: buildYouTubeWatchUrl(uploaded.videoId),
        shortsUrl: buildYouTubeShortsUrl(uploaded.videoId),
        privacyStatus,
      },
    });
  } catch (error) {
    if (postId) {
      try {
        await updatePlatformPost(postId, {
          status: "failed",
          error_message:
            error instanceof Error ? error.message : "YouTube publish failed",
        });
      } catch (updateError) {
        console.error("Failed to mark platform post as failed:", updateError);
      }
    }

    if (error instanceof YouTubeUploadScopeError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: "UPLOAD_SCOPE_REQUIRED",
          authorizeUrl: "/api/platforms/youtube/upload-authorize",
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
