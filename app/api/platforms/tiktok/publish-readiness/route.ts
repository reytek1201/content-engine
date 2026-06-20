import {
  ensureFreshTikTokAccessToken,
  getTikTokConnectionPublic,
  getTikTokConnectionRow,
  clearTikTokPublishScope,
} from "@/utils/tiktok/connection-store";
import { hasTikTokPublishScope } from "@/utils/platforms/scopes";
import { verifyTikTokPublishScopeLive } from "@/utils/tiktok/publish-scope";
import { queryTikTokCreatorInfo } from "@/utils/tiktok/publish-video";
import { toPublicCreatorInfo } from "@/utils/tiktok/publish-settings";
import { resolveVerticalVideoExport } from "@/utils/platforms/resolve-video-export";
import {
  getPlatformPostForCampaignExport,
  isPlatformPostInFlight,
} from "@/utils/platform-post-store";
import {
  buildTikTokPostTitle,
  estimateExportDurationSeconds,
} from "@/utils/tiktok/video-metadata";
import type { PlatformCaption } from "@/types/captions";
import { parseVideoExportMetadata } from "@/utils/fal-video";
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

    const { data: captionRow } = await supabase
      .from("platform_captions")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("platform", "tiktok")
      .maybeSingle();

    let hasVideoExport = false;
    let currentExportId: string | null = null;
    let postForCurrentExport = null;
    let alreadyPublished = false;
    let isUploading = false;
    let profileUrl: string | null = null;
    let videoPreviewUrl: string | null = null;
    let videoDurationSec: number | null = null;
    let defaultTitle: string | null = null;
    let creatorInfo = null;
    let creatorInfoError: string | null = null;

    if (captionRow) {
      defaultTitle = buildTikTokPostTitle(captionRow as PlatformCaption);
    }

    try {
      const videoExport = await resolveVerticalVideoExport(supabase, campaignId);
      hasVideoExport = true;
      currentExportId = videoExport.id;
      videoPreviewUrl = videoExport.outputUrl;

      const { data: exportRow } = await supabase
        .from("exports")
        .select("metadata")
        .eq("id", videoExport.id)
        .maybeSingle();

      videoDurationSec = estimateExportDurationSeconds(
        parseVideoExportMetadata(exportRow?.metadata),
      );

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

    if (connectionRow && hasPublishScope && hasVideoExport) {
      try {
        const freshConnection = await ensureFreshTikTokAccessToken(connectionRow);
        const creator = await queryTikTokCreatorInfo(freshConnection.access_token);
        creatorInfo = toPublicCreatorInfo(creator);
      } catch (error) {
        creatorInfoError =
          error instanceof Error
            ? error.message
            : "Could not load TikTok posting options";
      }
    }

    return NextResponse.json({
      success: true,
      connected: Boolean(connection),
      connection,
      hasPublishScope,
      hasTiktokCaption: Boolean(captionRow),
      hasVideoExport,
      currentExportId,
      alreadyPublished,
      isUploading,
      profileUrl,
      videoPreviewUrl,
      videoDurationSec,
      defaultTitle,
      creatorInfo,
      creatorInfoError,
      canPublish:
        Boolean(connection) &&
        hasPublishScope &&
        Boolean(captionRow) &&
        hasVideoExport &&
        Boolean(creatorInfo) &&
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
