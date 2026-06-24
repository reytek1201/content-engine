import { createClient } from "@/utils/supabase/server";
import type { Campaign } from "@/types/campaign";
import {
  indexSlideImages,
  otherAspectRatio,
  slidesCompleteForAspect,
} from "@/utils/slide-aspect-images";
import { loadSlideImagesForCampaign } from "@/utils/slide-image-persistence";
import { maybeAutoGenerateCampaignCaptions } from "@/utils/run-campaign-caption-generation";
import { maybeSendCampaignDraftReadyPush } from "@/utils/send-campaign-push";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function markCampaignFailed(
  supabase: SupabaseServerClient,
  campaignId: string,
  message: string,
) {
  await supabase
    .from("campaigns")
    .update({
      status: "failed",
      error_message: message,
      image_generation_aspect: null,
    })
    .eq("id", campaignId);
}

export async function refreshCampaignImageStatus(
  supabase: SupabaseServerClient,
  campaignId: string,
) {
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (campaignError || !campaign) {
    return;
  }

  const typedCampaign = campaign as Campaign;
  const targetAspect =
    typedCampaign.image_generation_aspect ?? typedCampaign.aspect_ratio;

  const { data: slides, error: slidesError } = await supabase
    .from("slides")
    .select("*")
    .eq("campaign_id", campaignId);

  if (slidesError || !slides || slides.length === 0) {
    return;
  }

  const slideImages = await loadSlideImagesForCampaign(supabase, campaignId);
  const imageIndex = indexSlideImages(slideImages as never);
  const allComplete = slidesCompleteForAspect(
    slides as never,
    targetAspect,
    typedCampaign,
    imageIndex,
  );

  await supabase
    .from("campaigns")
    .update({
      status: allComplete ? "completed" : "generating_images",
      error_message: null,
      ...(allComplete ? { image_generation_aspect: null } : {}),
    })
    .eq("id", campaignId);

  if (allComplete) {
    void maybeAutoGenerateCampaignCaptions(
      supabase,
      campaignId,
      typedCampaign.user_id,
    ).finally(() => {
      void maybeSendCampaignDraftReadyPush(campaignId);
    });

    void maybeSendCampaignDraftReadyPush(campaignId);
  }
}

export async function primaryImagesComplete(
  supabase: SupabaseServerClient,
  campaign: Campaign,
): Promise<boolean> {
  const { data: slides, error } = await supabase
    .from("slides")
    .select("*")
    .eq("campaign_id", campaign.id);

  if (error || !slides || slides.length === 0) {
    return false;
  }

  const slideImages = await loadSlideImagesForCampaign(supabase, campaign.id);
  const imageIndex = indexSlideImages(slideImages as never);

  return slidesCompleteForAspect(
    slides as never,
    campaign.aspect_ratio,
    campaign,
    imageIndex,
  );
}

export function secondaryAspectForCampaign(
  campaign: Pick<Campaign, "aspect_ratio" | "secondary_aspect_ratio">,
) {
  return campaign.secondary_aspect_ratio ?? otherAspectRatio(campaign.aspect_ratio);
}
