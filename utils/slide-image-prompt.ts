import type { Campaign, Slide } from "@/types/campaign";
import type { RegenerateFeedbackChipId } from "@/types/regenerate-feedback";
import { resolveRegenerationFeedback } from "@/types/regenerate-feedback";
import {
  buildNanoBananaPrompt,
  referencesFromCampaign,
} from "@/utils/campaign-generation";

export function buildSlideImagePrompt(
  slide: Slide,
  campaign: Campaign,
  feedbackChipIds: RegenerateFeedbackChipId[] = [],
  customNotes?: string
): string | null {
  if (!slide.text_overlay || !slide.image_prompt) {
    return null;
  }

  const basePrompt = buildNanoBananaPrompt(
    slide.text_overlay,
    slide.image_prompt,
    campaign.aspect_ratio,
    referencesFromCampaign(campaign)
  );

  const feedback = resolveRegenerationFeedback(feedbackChipIds, customNotes);

  if (!feedback) {
    return basePrompt;
  }

  return `${basePrompt} User revision notes for this regeneration: ${feedback}`;
}
