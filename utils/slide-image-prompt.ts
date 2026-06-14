import type { Campaign, Slide } from "@/types/campaign";
import type { RegenerateFeedbackChipId } from "@/types/regenerate-feedback";
import { resolveRegenerationFeedback } from "@/types/regenerate-feedback";
import {
  buildNanoBananaPrompt,
  referencesFromCampaign,
} from "@/utils/campaign-generation";

const REGENERATION_VARIATION_DIRECTIVE =
  "Create a clearly different visual variation with alternative composition, color treatment, and layout while preserving the headline and campaign message.";

export function buildSlideImagePrompt(
  slide: Slide,
  campaign: Campaign,
  feedbackChipIds: RegenerateFeedbackChipId[] = [],
  customNotes?: string,
  options?: { isRegeneration?: boolean },
): string | null {
  if (!slide.text_overlay || !slide.image_prompt) {
    return null;
  }

  const basePrompt = buildNanoBananaPrompt(
    slide.text_overlay,
    slide.image_prompt,
    campaign.aspect_ratio,
    referencesFromCampaign(campaign),
  );

  const feedback = resolveRegenerationFeedback(feedbackChipIds, customNotes);

  if (!options?.isRegeneration) {
    if (!feedback) {
      return basePrompt;
    }

    return `${basePrompt} User revision notes for this regeneration: ${feedback}`;
  }

  const revisionDirective =
    feedback || REGENERATION_VARIATION_DIRECTIVE;

  return [
    "Edit the first reference image (the current slide creative).",
    "Any additional reference images are brand assets (product, style, logo) — use them only where they support the priority edits below.",
    `PRIORITY — Apply these user-requested changes: ${revisionDirective}`,
    basePrompt,
    "The priority instructions above override the original scene description when they conflict.",
    "Keep the headline text accurate and legible unless the user explicitly asked to change the wording.",
  ].join(" ");
}
