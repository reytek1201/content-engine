import {
  ensureFreshInstagramAccessToken,
  getInstagramConnectionPublic,
  getInstagramConnectionRow,
} from "@/utils/instagram/connection-store";
import { hasInstagramPublishScope } from "@/utils/platforms/scopes";
import { resolveVerticalVideoExport } from "@/utils/platforms/resolve-video-export";
import {
  getPlatformPostForCampaignExport,
  getScheduledPlatformPostForExport,
  isPlatformPostInFlight,
} from "@/utils/platform-post-store";
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

    let hasVideoExport = false;
    let currentExportId: string | null = null;
    let postForCurrentExport = null;
    let alreadyPublished = false;
    let isUploading = false;
    let profileUrl: string | null = null;
    let videoPreviewUrl: string | null = null;

    try {
      const videoExport = await resolveVerticalVideoExport(supabase, campaignId);
      hasVideoExport = true;
      currentExportId = videoExport.id;
      videoPreviewUrl = videoExport.outputUrl;

      postForCurrentExport = await getPlatformPostForCampaignExport(
        user.id,
        campaignId,
        videoExport.id,
        "instagram",
      );

      alreadyPublished = postForCurrentExport?.status === "published";
      isUploading = postForCurrentExport
        ? isPlatformPostInFlight(postForCurrentExport.status)
        : false;

      if (alreadyPublished && postForCurrentExport?.externalUrl) {
        profileUrl = postForCurrentExport.externalUrl;
      }
    } catch {
      hasVideoExport = false;
    }

    if (connectionRow) {
      try {
        await ensureFreshInstagramAccessToken(connectionRow);
      } catch {
        // Readiness can still report connection state if refresh fails transiently.
      }
    }

    let scheduledPost = null;

    if (currentExportId && !alreadyPublished && !isUploading) {
      scheduledPost = await getScheduledPlatformPostForExport(
        user.id,
        campaignId,
        currentExportId,
        "instagram",
      );
    }

    const isScheduled = Boolean(scheduledPost);

    return NextResponse.json({
      success: true,
      connected: Boolean(connection),
      connection,
      hasPublishScope,
      hasInstagramCaption: Boolean(captionRow),
      hasVideoExport,
      currentExportId,
      alreadyPublished,
      isUploading,
      isScheduled,
      scheduledPost,
      profileUrl,
      videoPreviewUrl,
      canPublish:
        Boolean(connection) &&
        tierAllowed &&
        hasPublishScope &&
        Boolean(captionRow) &&
        hasVideoExport &&
        !alreadyPublished &&
        !isUploading &&
        !isScheduled,
      tierAllowed,
      canConnectPlatform,
      upgradeUrl: "/settings/usage",
      postForCurrentExport,
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
