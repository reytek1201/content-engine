import { generatePlatformCaptions } from "@/utils/gemini-captions";
import {
  formatCaptionsValidationError,
  normalizeCaptionOutput,
} from "@/utils/caption-generation";
import { assertAiRateLimit } from "@/utils/rate-limit";
import { maybeSendCampaignDraftReadyPush } from "@/utils/send-campaign-push";
import type { Campaign, Slide } from "@/types/campaign";
import type { PlatformCaption } from "@/types/captions";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const captionsGenerationInFlight = new Set<string>();

export interface RunCampaignCaptionGenerationOptions {
  force?: boolean;
  skipRateLimit?: boolean;
  userId?: string;
}

export async function runCampaignCaptionGeneration(
  supabase: SupabaseClient,
  campaignId: string,
  options: RunCampaignCaptionGenerationOptions = {},
): Promise<PlatformCaption[]> {
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (campaignError || !campaign) {
    throw new Error("Campaign not found");
  }

  const typedCampaign = campaign as Campaign;

  if (!options.force) {
    const { count, error: countError } = await supabase
      .from("platform_captions")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId);

    if (countError) {
      throw new Error("Failed to check existing captions");
    }

    if ((count ?? 0) > 0) {
      const { data: existingCaptions, error: existingError } = await supabase
        .from("platform_captions")
        .select("*")
        .eq("campaign_id", campaignId);

      if (existingError || !existingCaptions) {
        throw new Error("Failed to load existing captions");
      }

      return existingCaptions as PlatformCaption[];
    }
  }

  if (!options.skipRateLimit) {
    const rateLimitUserId = options.userId ?? typedCampaign.user_id;
    assertAiRateLimit(rateLimitUserId, "generate-captions");
  }

  const { data: slides, error: slidesError } = await supabase
    .from("slides")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("slide_index", { ascending: true });

  if (slidesError || !slides || slides.length === 0) {
    throw new Error("No slides found for campaign");
  }

  const generated = await generatePlatformCaptions(
    typedCampaign,
    slides as Slide[],
  );

  await supabase.from("platform_captions").delete().eq("campaign_id", campaignId);

  const captionsPayload = generated.platforms.map((platformCaption) => {
    const normalized = normalizeCaptionOutput(platformCaption);

    return {
      campaign_id: campaignId,
      platform: normalized.platform,
      hook: normalized.hook,
      caption: normalized.caption,
      hashtags: normalized.hashtags,
      title: normalized.title,
    };
  });

  const { data: savedCaptions, error: insertError } = await supabase
    .from("platform_captions")
    .insert(captionsPayload)
    .select("*");

  if (insertError || !savedCaptions) {
    throw new Error(insertError?.message ?? "Failed to save captions");
  }

  return savedCaptions as PlatformCaption[];
}

export async function maybeAutoGenerateCampaignCaptions(
  supabase: SupabaseClient,
  campaignId: string,
  userId: string,
): Promise<{ generated: boolean; captions?: PlatformCaption[] }> {
  const { count, error: countError } = await supabase
    .from("platform_captions")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", campaignId);

  if (countError) {
    console.error("[auto-captions] count failed:", countError.message);
    return { generated: false };
  }

  if ((count ?? 0) > 0) {
    return { generated: false };
  }

  if (captionsGenerationInFlight.has(campaignId)) {
    return { generated: false };
  }

  captionsGenerationInFlight.add(campaignId);

  try {
    const captions = await runCampaignCaptionGeneration(supabase, campaignId, {
      userId,
    });

    void maybeSendCampaignDraftReadyPush(campaignId);

    return { generated: true, captions };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(
        "[auto-captions] validation failed:",
        formatCaptionsValidationError(error),
      );
      return { generated: false };
    }

    console.error(
      "[auto-captions] failed:",
      error instanceof Error ? error.message : error,
    );
    return { generated: false };
  } finally {
    captionsGenerationInFlight.delete(campaignId);
  }
}
