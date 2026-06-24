import {
  markCampaignFailed,
} from "@/utils/campaign-image-status";
import { maybeSendCampaignDraftReadyPush } from "@/utils/send-campaign-push";
import {
  buildFalWebhookUrl,
  getAppBaseUrl,
  isLocalAppUrl,
  runNanoBananaSync,
  submitNanoBananaToQueue,
} from "@/utils/fal";
import { buildSlideImagePrompt } from "@/utils/slide-image-prompt";
import { refreshCampaignImageStatus } from "@/utils/campaign-image-status";
import { maybeAutoGenerateCampaignCaptions } from "@/utils/run-campaign-caption-generation";
import { upsertSlideImageRecord } from "@/utils/slide-image-persistence";
import type { AspectRatio, Campaign, Slide } from "@/types/campaign";
import type { SupabaseClient } from "@supabase/supabase-js";

type SupabaseServerClient = SupabaseClient;

export interface QueueSlideImagesInput {
  supabase: SupabaseServerClient;
  campaign: Campaign;
  slidesToGenerate: Slide[];
  aspectRatio: AspectRatio;
  referenceUrls: string[];
  request: Request;
}

export async function queueSlideImagesForAspect(
  input: QueueSlideImagesInput,
): Promise<{ mode: "sync" | "queue"; queued?: number }> {
  const {
    supabase,
    campaign,
    slidesToGenerate,
    aspectRatio,
    referenceUrls,
    request,
  } = input;

  if (slidesToGenerate.length === 0) {
    return { mode: "sync" };
  }

  const { error: statusError } = await supabase
    .from("campaigns")
    .update({
      status: "generating_images",
      error_message: null,
      image_generation_aspect: aspectRatio,
    })
    .eq("id", campaign.id);

  if (statusError) {
    throw new Error(statusError.message);
  }

  const autoCaptionsPromise = maybeAutoGenerateCampaignCaptions(
    supabase,
    campaign.id,
    campaign.user_id,
  );

  const appBaseUrl = getAppBaseUrl(request);
  const useLocalSync = isLocalAppUrl(appBaseUrl);

  if (useLocalSync) {
    for (const slide of slidesToGenerate) {
      const prompt = buildSlideImagePrompt(slide, {
        ...campaign,
        aspect_ratio: aspectRatio,
      });

      if (!prompt) {
        await markCampaignFailed(
          supabase,
          campaign.id,
          `Slide ${slide.slide_index + 1} is missing overlay or image prompt`,
        );
        throw new Error("Slide missing required content");
      }

      const imageUrl = await runNanoBananaSync(
        prompt,
        aspectRatio,
        referenceUrls,
      );

      await upsertSlideImageRecord(supabase, {
        slideId: slide.id,
        aspectRatio,
        imageUrl,
        falRequestId: null,
        campaign,
      });
    }

    await refreshCampaignImageStatus(supabase, campaign.id);
    await autoCaptionsPromise;
    await maybeSendCampaignDraftReadyPush(campaign.id);

    return { mode: "sync" };
  }

  const webhookUrl = buildFalWebhookUrl(appBaseUrl);
  let queued = 0;

  for (const slide of slidesToGenerate) {
    const prompt = buildSlideImagePrompt(slide, {
      ...campaign,
      aspect_ratio: aspectRatio,
    });

    if (!prompt) {
      await markCampaignFailed(
        supabase,
        campaign.id,
        `Slide ${slide.slide_index + 1} is missing overlay or image prompt`,
      );
      throw new Error("Slide missing required content");
    }

    const requestId = await submitNanoBananaToQueue(
      prompt,
      aspectRatio,
      webhookUrl,
      referenceUrls,
    );

    await upsertSlideImageRecord(supabase, {
      slideId: slide.id,
      aspectRatio,
      imageUrl: null,
      falRequestId: requestId,
      campaign,
    });

    queued += 1;
  }

  return { mode: "queue", queued };
}

export async function filterSlidesMissingAspectImage(
  supabase: SupabaseServerClient,
  slides: Slide[],
  aspectRatio: AspectRatio,
  campaign: Campaign,
): Promise<Slide[]> {
  const { data: existingImages, error } = await supabase
    .from("slide_images")
    .select("slide_id, image_url")
    .in(
      "slide_id",
      slides.map((slide) => slide.id),
    )
    .eq("aspect_ratio", aspectRatio);

  if (error) {
    throw new Error(error.message);
  }

  const imageBySlideId = new Map(
    (existingImages ?? []).map((row) => [row.slide_id, row.image_url]),
  );

  return slides.filter((slide) => {
    const indexedUrl = imageBySlideId.get(slide.id);

    if (indexedUrl) {
      return false;
    }

    if (aspectRatio === campaign.aspect_ratio && slide.image_url) {
      return false;
    }

    return true;
  });
}
