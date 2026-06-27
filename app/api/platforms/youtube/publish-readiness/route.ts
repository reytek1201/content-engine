import { buildYouTubeWatchUrl } from "@/utils/youtube/video-metadata";
import {
  getPlatformPostForCampaignExport,
  getScheduledPlatformPostForExport,
  isPlatformPostInFlight,
} from "@/utils/platform-post-store";
import { getYouTubeConnectionPublic, getYouTubeConnectionRow } from "@/utils/youtube/connection-store";
import { hasYouTubeUploadScope } from "@/utils/platforms/scopes";
import { resolveYouTubeVideoExport } from "@/utils/youtube/resolve-video-export";
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

    const connection = await getYouTubeConnectionPublic(user.id);
    const connectionRow = await getYouTubeConnectionRow(user.id);
    const hasUploadScope = hasYouTubeUploadScope(connectionRow?.scopes);
    const platformConnections = await getPlatformConnectionSummary(user.id);
    const tierAllowed = platformConnections.canPublish.youtube;
    const canConnectPlatform = platformConnections.canConnect.youtube;

    const { data: caption } = await supabase
      .from("platform_captions")
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("platform", "youtube_shorts")
      .maybeSingle();

    let hasVideoExport = false;
    let currentExportId: string | null = null;
    let postForCurrentExport = null;
    let alreadyPublished = false;
    let isUploading = false;
    let watchUrl: string | null = null;

    try {
      const videoExport = await resolveYouTubeVideoExport(supabase, campaignId);
      hasVideoExport = true;
      currentExportId = videoExport.id;

      postForCurrentExport = await getPlatformPostForCampaignExport(
        user.id,
        campaignId,
        videoExport.id,
        "youtube",
      );

      alreadyPublished = postForCurrentExport?.status === "published";
      isUploading = postForCurrentExport
        ? isPlatformPostInFlight(postForCurrentExport.status)
        : false;

      if (alreadyPublished && postForCurrentExport?.externalId) {
        watchUrl =
          postForCurrentExport.externalUrl ??
          buildYouTubeWatchUrl(postForCurrentExport.externalId);
      }
    } catch {
      hasVideoExport = false;
    }

    let scheduledPost = null;

    if (currentExportId && !alreadyPublished && !isUploading) {
      scheduledPost = await getScheduledPlatformPostForExport(
        user.id,
        campaignId,
        currentExportId,
        "youtube",
      );
    }

    const isScheduled = Boolean(scheduledPost);

    return NextResponse.json({
      success: true,
      connected: Boolean(connection),
      connection,
      hasUploadScope,
      hasYoutubeCaption: Boolean(caption),
      hasVideoExport,
      currentExportId,
      alreadyPublished,
      isUploading,
      isScheduled,
      scheduledPost,
      watchUrl,
      canPublish:
        Boolean(connection) &&
        tierAllowed &&
        hasUploadScope &&
        Boolean(caption) &&
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
