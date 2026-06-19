import {
  getPlatformPostForCampaignExport,
  isPlatformPostInFlight,
} from "@/utils/youtube/platform-post-store";
import { getYouTubeConnectionPublic } from "@/utils/youtube/connection-store";
import { resolveYouTubeVideoExport } from "@/utils/youtube/resolve-video-export";
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

    try {
      const videoExport = await resolveYouTubeVideoExport(supabase, campaignId);
      hasVideoExport = true;
      currentExportId = videoExport.id;

      postForCurrentExport = await getPlatformPostForCampaignExport(
        user.id,
        campaignId,
        videoExport.id,
      );

      alreadyPublished = postForCurrentExport?.status === "published";
      isUploading = postForCurrentExport
        ? isPlatformPostInFlight(postForCurrentExport.status)
        : false;
    } catch {
      hasVideoExport = false;
    }

    return NextResponse.json({
      success: true,
      connected: Boolean(connection),
      connection,
      hasYoutubeCaption: Boolean(caption),
      hasVideoExport,
      currentExportId,
      alreadyPublished,
      isUploading,
      canPublish:
        Boolean(connection) &&
        Boolean(caption) &&
        hasVideoExport &&
        !alreadyPublished &&
        !isUploading,
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
