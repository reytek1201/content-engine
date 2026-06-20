import type { createClient } from "@/utils/supabase/server";
import {
  getCampaignListStatus,
  type CampaignListStatus,
} from "@/utils/campaign-list-status";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface CampaignListStatusInput {
  id: string;
  status: string;
  slide_count: number | null;
  slides: Array<{ slide_index: number; image_url: string | null }>;
}

export async function loadCampaignListStatuses(
  supabase: SupabaseServerClient,
  campaigns: CampaignListStatusInput[],
): Promise<Record<string, CampaignListStatus>> {
  if (campaigns.length === 0) {
    return {};
  }

  const campaignIds = campaigns.map((campaign) => campaign.id);

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
      .in("platform", ["youtube", "tiktok"]),
  ]);

  const captionsByCampaign = new Set(
    (captionsResult.data ?? []).map((row) => row.campaign_id as string),
  );

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

  for (const row of postsResult.data ?? []) {
    const campaignId = row.campaign_id as string;

    if (row.platform === "youtube") {
      youtubePublishedByCampaign.add(campaignId);
    }

    if (row.platform === "tiktok") {
      tiktokPublishedByCampaign.add(campaignId);
    }
  }

  const statuses: Record<string, CampaignListStatus> = {};

  for (const campaign of campaigns) {
    const slideCount = campaign.slide_count ?? campaign.slides.length;
    const imagesReadyCount = campaign.slides.filter(
      (slide) => slide.image_url,
    ).length;

    statuses[campaign.id] = getCampaignListStatus({
      campaignStatus: campaign.status,
      slideCount,
      imagesReadyCount,
      hasCaptions: captionsByCampaign.has(campaign.id),
      hasVideoExport: videoExportByCampaign.has(campaign.id),
      youtubePublished: youtubePublishedByCampaign.has(campaign.id),
      tiktokPublished: tiktokPublishedByCampaign.has(campaign.id),
    });
  }

  return statuses;
}
