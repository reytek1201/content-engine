import {
  createPlatformPost,
  getPlatformPostForCampaignCarousel,
  isPlatformPostInFlight,
  updatePlatformPost,
} from "@/utils/platform-post-store";
import {
  ensureFreshInstagramAccessToken,
  getInstagramConnectionRow,
  clearInstagramPublishScope,
} from "@/utils/instagram/connection-store";
import { fetchInstagramBusinessAccount } from "@/utils/instagram/oauth";
import { InstagramPublishScopeError } from "@/utils/instagram/graph-api";
import { publishInstagramCarousel } from "@/utils/instagram/publish-carousel";
import { buildInstagramCaption } from "@/utils/instagram/video-metadata";
import { resolveCarouselSlidesForCampaign } from "@/utils/platforms/resolve-carousel-slides";
import { hasInstagramPublishScope } from "@/utils/platforms/scopes";
import type { PlatformCaption } from "@/types/captions";
import { assertPlatformPublishAllowed } from "@/utils/platform-connection-limits";
import { isUsageLimitError } from "@/utils/usage-limits";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 300;

const RequestSchema = z.object({
  campaignId: z.string().uuid(),
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

    const { campaignId } = parsed.data;

    await assertPlatformPublishAllowed(user.id, "instagram");

    const connection = await getInstagramConnectionRow(user.id);

    if (!connection) {
      return NextResponse.json(
        {
          success: false,
          error: "Connect Instagram in Settings before publishing",
          code: "NOT_CONNECTED",
        },
        { status: 422 },
      );
    }

    if (!hasInstagramPublishScope(connection.scopes)) {
      return NextResponse.json(
        {
          success: false,
          error: "Instagram publishing permission is required",
          code: "PUBLISH_SCOPE_REQUIRED",
          authorizeUrl: "/api/platforms/instagram/publish-authorize",
        },
        { status: 403 },
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
      .eq("platform", "instagram")
      .maybeSingle();

    if (captionError || !caption) {
      return NextResponse.json(
        {
          success: false,
          error: "Generate Instagram captions before publishing",
        },
        { status: 422 },
      );
    }

    const carouselSlides = await resolveCarouselSlidesForCampaign(
      supabase,
      campaignId,
    );

    const existingPost = await getPlatformPostForCampaignCarousel(
      user.id,
      campaignId,
    );

    if (existingPost?.status === "published") {
      return NextResponse.json({
        success: true,
        alreadyPublished: true,
        post: existingPost,
        carousel: existingPost.externalUrl
          ? { permalink: existingPost.externalUrl }
          : undefined,
      });
    }

    if (existingPost && isPlatformPostInFlight(existingPost.status)) {
      return NextResponse.json(
        {
          success: false,
          error: "This carousel is already being published to Instagram",
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
        platform: "instagram",
        exportId: null,
        status: "uploading",
      });
    } catch (createError) {
      const racedPost = await getPlatformPostForCampaignCarousel(
        user.id,
        campaignId,
      );

      if (racedPost?.status === "published") {
        return NextResponse.json({
          success: true,
          alreadyPublished: true,
          post: racedPost,
          carousel: racedPost.externalUrl
            ? { permalink: racedPost.externalUrl }
            : undefined,
        });
      }

      if (racedPost && isPlatformPostInFlight(racedPost.status)) {
        return NextResponse.json(
          {
            success: false,
            error: "This carousel is already being published to Instagram",
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

    const freshConnection = await ensureFreshInstagramAccessToken(connection);
    const account = await fetchInstagramBusinessAccount(
      freshConnection.access_token,
    );
    const carouselCaption = buildInstagramCaption(caption as PlatformCaption);

    const published = await publishInstagramCarousel({
      userAccessToken: freshConnection.access_token,
      instagramUserId: account.instagramUserId,
      pageId: account.pageId,
      imageUrls: carouselSlides.imageUrls,
      caption: carouselCaption,
    });

    const stored = await updatePlatformPost(post.id, {
      status: "published",
      external_id: published.mediaId,
      external_url: published.permalink,
      error_message: null,
    });

    return NextResponse.json({
      success: true,
      post: stored,
      carousel: {
        permalink: published.permalink,
      },
    });
  } catch (error) {
    if (postId) {
      try {
        await updatePlatformPost(postId, {
          status: "failed",
          error_message:
            error instanceof Error
              ? error.message
              : "Instagram carousel publish failed",
        });
      } catch (updateError) {
        console.error("Failed to mark platform post as failed:", updateError);
      }
    }

    if (error instanceof InstagramPublishScopeError) {
      if (userId) {
        try {
          await clearInstagramPublishScope(userId);
        } catch (clearError) {
          console.error("Failed to clear Instagram publish scope:", clearError);
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: "PUBLISH_SCOPE_REQUIRED",
          authorizeUrl: "/api/platforms/instagram/publish-authorize",
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
