import { HIDDEN_CAMPAIGN_STATUSES } from "@/utils/campaign-visibility";
import { loadCampaignListStatuses } from "@/utils/campaign-list-status-server";
import {
  buildSignedOutWidgetSnapshot,
  buildWidgetSnapshotForCandidate,
  pickCampaignForWidget,
  type WidgetCampaignCandidate,
} from "@/utils/widget-snapshot";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

interface CampaignRow {
  id: string;
  title: string | null;
  topic: string;
  status: string;
  slide_count: number | null;
  slides: Array<{ slide_index: number; image_url: string | null }>;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(buildSignedOutWidgetSnapshot(), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const preferredCampaignId = searchParams.get("campaignId");

    let campaignsQuery = supabase
      .from("campaigns")
      .select(
        "id, title, topic, status, slide_count, slides(slide_index, image_url)",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    for (const hiddenStatus of HIDDEN_CAMPAIGN_STATUSES) {
      campaignsQuery = campaignsQuery.neq("status", hiddenStatus);
    }

    const { data: campaigns, error } = await campaignsQuery;

    if (error) {
      throw new Error(error.message);
    }

    const typedCampaigns = (campaigns ?? []) as CampaignRow[];

    if (typedCampaigns.length === 0) {
      return NextResponse.json(buildWidgetSnapshotForCandidate(null));
    }

    const campaignIds = typedCampaigns.map((campaign) => campaign.id);
    const statuses = await loadCampaignListStatuses(supabase, typedCampaigns);

    const [captionsResult, exportsResult, postsResult] = await Promise.all([
      supabase
        .from("platform_captions")
        .select("campaign_id")
        .in("campaign_id", campaignIds),
      supabase
        .from("exports")
        .select("campaign_id, metadata")
        .in("campaign_id", campaignIds)
        .eq("export_type", "video")
        .eq("status", "completed")
        .not("output_url", "is", null),
      supabase
        .from("platform_posts")
        .select("campaign_id, platform")
        .in("campaign_id", campaignIds)
        .eq("status", "published")
        .in("platform", ["youtube", "tiktok", "instagram"]),
    ]);

    const captionsCountByCampaign = new Map<string, number>();

    for (const row of captionsResult.data ?? []) {
      const campaignId = row.campaign_id as string;
      captionsCountByCampaign.set(
        campaignId,
        (captionsCountByCampaign.get(campaignId) ?? 0) + 1,
      );
    }

    const videoExportByCampaign = new Set(
      (exportsResult.data ?? [])
        .filter((row) => {
          const metadata = row.metadata as { aspectRatio?: string } | null;
          return !metadata?.aspectRatio || metadata.aspectRatio === "9:16";
        })
        .map((row) => row.campaign_id as string),
    );

    const youtubePublishedByCampaign = new Set<string>();
    const tiktokPublishedByCampaign = new Set<string>();
    const instagramPublishedByCampaign = new Set<string>();

    for (const row of postsResult.data ?? []) {
      const campaignId = row.campaign_id as string;

      if (row.platform === "youtube") {
        youtubePublishedByCampaign.add(campaignId);
      }

      if (row.platform === "tiktok") {
        tiktokPublishedByCampaign.add(campaignId);
      }

      if (row.platform === "instagram") {
        instagramPublishedByCampaign.add(campaignId);
      }
    }

    const candidates: WidgetCampaignCandidate[] = typedCampaigns.map(
      (campaign) => ({
        id: campaign.id,
        title: campaign.title,
        topic: campaign.topic,
        status: campaign.status,
        slide_count: campaign.slide_count,
        slides: campaign.slides,
        listStatusId: statuses[campaign.id]?.id ?? "needs_images",
        captionsCount: captionsCountByCampaign.get(campaign.id) ?? 0,
        hasVideoExport: videoExportByCampaign.has(campaign.id),
        youtubePublished: youtubePublishedByCampaign.has(campaign.id),
        tiktokPublished: tiktokPublishedByCampaign.has(campaign.id),
        instagramPublished: instagramPublishedByCampaign.has(campaign.id),
      }),
    );

    const selected = pickCampaignForWidget(
      candidates,
      preferredCampaignId,
    );

    return NextResponse.json(buildWidgetSnapshotForCandidate(selected));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
