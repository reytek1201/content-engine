import { getTikTokConnectionPublic, getTikTokConnectionRow, clearTikTokPublishScope } from "@/utils/tiktok/connection-store";
import { hasTikTokPublishScope } from "@/utils/platforms/scopes";
import { verifyTikTokPublishScopeLive } from "@/utils/tiktok/publish-scope";
import { resolveVerticalVideoExport } from "@/utils/platforms/resolve-video-export";
import {
  getPlatformPostForCampaignExport,
  isPlatformPostInFlight,
} from "@/utils/platform-post-store";
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

    const connection = await getTikTokConnectionPublic(user.id);
    const connectionRow = await getTikTokConnectionRow(user.id);
    let hasPublishScope = hasTikTokPublishScope(connectionRow?.scopes);

    if (connectionRow && hasPublishScope) {
      try {
        hasPublishScope = await verifyTikTokPublishScopeLive(connectionRow);

        if (!hasPublishScope) {
          await clearTikTokPublishScope(user.id);
        }
      } catch {
        // Keep stored scope on transient TikTok API errors.
      }
    }

    const { data: caption } = await supabase
      .from("platform_captions")
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("platform", "tiktok")
      .maybeSingle();

    let hasVideoExport = false;
    let currentExportId: string | null = null;
    let postForCurrentExport = null;
    let alreadyPublished = false;
    let isUploading = false;
    let profileUrl: string | null = null;

    try {
      const videoExport = await resolveVerticalVideoExport(supabase, campaignId);
      hasVideoExport = true;
      currentExportId = videoExport.id;

      postForCurrentExport = await getPlatformPostForCampaignExport(
        user.id,
        campaignId,
        videoExport.id,
        "tiktok",
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

    return NextResponse.json({
      success: true,
      connected: Boolean(connection),
      connection,
      hasPublishScope,
      hasTiktokCaption: Boolean(caption),
      hasVideoExport,
      currentExportId,
      alreadyPublished,
      isUploading,
      profileUrl,
      canPublish:
        Boolean(connection) &&
        hasPublishScope &&
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
