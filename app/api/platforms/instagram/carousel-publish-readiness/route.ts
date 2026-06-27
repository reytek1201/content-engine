import {
  ensureFreshInstagramAccessToken,
  getInstagramConnectionPublic,
  getInstagramConnectionRow,
} from "@/utils/instagram/connection-store";
import {
  INSTAGRAM_CAROUSEL_MAX_SLIDES,
  INSTAGRAM_CAROUSEL_MIN_SLIDES,
} from "@/utils/instagram/publish-carousel";
import { hasInstagramPublishScope } from "@/utils/platforms/scopes";
import {
  getPlatformPostForCampaignCarousel,
  getScheduledPlatformPostForCarousel,
  isPlatformPostInFlight,
} from "@/utils/platform-post-store";
import { resolveCarouselSlidesForCampaign } from "@/utils/platforms/resolve-carousel-slides";
import { getPlatformConnectionSummary } from "@/utils/platform-connection-limits";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");

    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: "campaignId is required" },
        { status: 400 },
      );
    }

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

    const connection = await getInstagramConnectionPublic(user.id);
    const connectionRow = await getInstagramConnectionRow(user.id);
    const hasPublishScope = hasInstagramPublishScope(connectionRow?.scopes);
    const platformConnections = await getPlatformConnectionSummary(user.id);
    const tierAllowed = platformConnections.canPublish.instagram;
    const canConnectPlatform = platformConnections.canConnect.instagram;

    const { data: captionRow } = await supabase
      .from("platform_captions")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("platform", "instagram")
      .maybeSingle();

    let hasCarouselSlides = false;
    let slideCount = 0;
    let slidePreviewUrl: string | null = null;

    try {
      const carouselSlides = await resolveCarouselSlidesForCampaign(
        supabase,
        campaignId,
      );
      hasCarouselSlides = true;
      slideCount = carouselSlides.slideCount;
      slidePreviewUrl = carouselSlides.imageUrls[0] ?? null;
    } catch {
      hasCarouselSlides = false;
    }

    const postForCarousel = await getPlatformPostForCampaignCarousel(
      user.id,
      campaignId,
    );

    const alreadyPublished = postForCarousel?.status === "published";
    const isUploading = postForCarousel
      ? isPlatformPostInFlight(postForCarousel.status)
      : false;

    let profileUrl: string | null = null;

    if (alreadyPublished && postForCarousel?.externalUrl) {
      profileUrl = postForCarousel.externalUrl;
    }

    if (connectionRow) {
      try {
        await ensureFreshInstagramAccessToken(connectionRow);
      } catch {
        // Readiness can still report connection state if refresh fails transiently.
      }
    }

    const slideCountValid =
      slideCount >= INSTAGRAM_CAROUSEL_MIN_SLIDES &&
      slideCount <= INSTAGRAM_CAROUSEL_MAX_SLIDES;

    let scheduledPost = null;

    if (!alreadyPublished && !isUploading) {
      scheduledPost = await getScheduledPlatformPostForCarousel(user.id, campaignId);
    }

    const isScheduled = Boolean(scheduledPost);

    return NextResponse.json({
      success: true,
      connected: Boolean(connection),
      connection,
      hasPublishScope,
      hasInstagramCaption: Boolean(captionRow),
      hasCarouselSlides,
      slideCount,
      slideCountValid,
      alreadyPublished,
      isUploading,
      isScheduled,
      scheduledPost,
      profileUrl,
      slidePreviewUrl,
      canPublish:
        Boolean(connection) &&
        tierAllowed &&
        hasPublishScope &&
        Boolean(captionRow) &&
        hasCarouselSlides &&
        slideCountValid &&
        !alreadyPublished &&
        !isUploading &&
        !isScheduled,
      tierAllowed,
      canConnectPlatform,
      upgradeUrl: "/settings/usage",
      postForCarousel,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
