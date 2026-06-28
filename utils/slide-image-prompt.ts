import type { Campaign, Slide } from "@/types/campaign";
import type { RegenerateFeedbackChipId } from "@/types/regenerate-feedback";
import {
  regenerationRequiresHeadlineRerender,
  regenerationResetsScene,
  resolveRegenerationFeedback,
} from "@/types/regenerate-feedback";
import {
  appendCaptionFriendlyCompositionClause,
  buildNanoBananaPrompt,
  referencesFromCampaign,
} from "@/utils/campaign-generation";
import type { CampaignReferences } from "@/types/references";

const REGENERATION_VARIATION_DIRECTIVE =
  "Create a clearly different visual variation with alternative composition, color treatment, and layout while preserving the headline and campaign message.";

function buildHeadlineOnlyPrompt(
  textOverlay: string,
  aspectRatio: Campaign["aspect_ratio"],
  references: CampaignReferences,
): string {
  const formatLabel =
    aspectRatio === "4:5"
      ? "4:5 portrait social carousel slide"
      : "9:16 vertical short-form video slide";

  const safeOverlay = textOverlay.replace(/"/g, '\\"');
  const referenceInstructions: string[] = [];

  if (references.product) {
    referenceInstructions.push(
      "Use the product reference image as the hero subject in the composition.",
    );
  }

  if (references.style) {
    referenceInstructions.push(
      "Match the color palette and visual mood of the style reference. Do not copy layout or text from the style reference.",
    );
  }

  if (references.logo) {
    referenceInstructions.push(
      "Place the logo reference cleanly in the bottom-right corner at roughly 8% width. Preserve the logo exactly; do not redraw or distort it.",
    );
  }

  return [
    `Create a polished ${formatLabel} for a performance marketing campaign.`,
    `Render this exact headline text prominently with bold, clean sans-serif typography, strong contrast, and accurate spelling: "${safeOverlay}".`,
    ...referenceInstructions,
    "Professional social-media creative, vibrant colors, high contrast, legible typography, no watermark.",
  ].join(" ");
}

export interface BuildSlideImagePromptOptions {
  isRegeneration?: boolean;
  headlineChanged?: boolean;
  burnCaptions?: boolean;
}

export function buildSlideImagePrompt(
  slide: Slide,
  campaign: Campaign,
  feedbackChipIds: RegenerateFeedbackChipId[] = [],
  customNotes?: string,
  options?: BuildSlideImagePromptOptions,
): string | null {
  if (!slide.text_overlay || !slide.image_prompt) {
    return null;
  }

  const references = referencesFromCampaign(campaign);
  const feedback = resolveRegenerationFeedback(feedbackChipIds, customNotes);

  const basePrompt = buildNanoBananaPrompt(
    slide.text_overlay,
    slide.image_prompt,
    campaign.aspect_ratio,
    references,
  );

  if (!options?.isRegeneration) {
    if (!feedback) {
      return appendCaptionFriendlyCompositionClause(
        basePrompt,
        options?.burnCaptions,
      );
    }

    return appendCaptionFriendlyCompositionClause(
      `${basePrompt} User revision notes for this regeneration: ${feedback}`,
      options?.burnCaptions,
    );
  }

  const resetScene = regenerationResetsScene(feedbackChipIds, {
    headlineChanged: options.headlineChanged,
  });
  const rerenderHeadline = regenerationRequiresHeadlineRerender(
    feedbackChipIds,
    { headlineChanged: options.headlineChanged },
  );

  const revisionDirective =
    feedback || REGENERATION_VARIATION_DIRECTIVE;

  if (resetScene) {
    const scenePrompt = buildHeadlineOnlyPrompt(
      slide.text_overlay,
      campaign.aspect_ratio,
      references,
    );

    const parts = [
      "Use the first reference image only for brand context (product, colors, mood). Do NOT preserve its layout, composition, or any on-image text.",
      "Any additional reference images are brand assets (product, style, logo) — use them only where they support the priority edits below.",
      `PRIORITY — Apply these user-requested changes: ${revisionDirective}`,
    ];

    if (rerenderHeadline) {
      parts.push(
        `MUST re-render the headline exactly as specified below. Do not copy spelling, wording, or typography from text visible in the reference image: "${slide.text_overlay.replace(/"/g, '\\"')}".`,
      );
    }

    parts.push(scenePrompt);
    parts.push(
      "The PRIORITY instructions above override the scene description and reference image when they conflict.",
    );

    if (rerenderHeadline) {
      parts.push(
        "Replace all on-image headline text; accuracy and spelling are mandatory.",
      );
    } else {
      parts.push(
        "Keep the headline text accurate and legible unless the user explicitly asked to change the wording.",
      );
    }

    return appendCaptionFriendlyCompositionClause(
      parts.join(" "),
      options?.burnCaptions,
    );
  }

  const editParts = [
    "Edit the first reference image (the current slide creative).",
    "Any additional reference images are brand assets (product, style, logo) — use them only where they support the priority edits below.",
    `PRIORITY — Apply these user-requested changes: ${revisionDirective}`,
  ];

  if (rerenderHeadline) {
    editParts.push(
      `MUST re-render the headline exactly as specified below. Do not copy spelling, wording, or typography from text visible in the reference image: "${slide.text_overlay.replace(/"/g, '\\"')}".`,
      "Replace all on-image headline text; accuracy and spelling are mandatory.",
    );
  } else {
    editParts.push(
      "Keep the headline text exactly as currently shown, with accurate spelling, unless the user explicitly asked to change the wording.",
    );
  }

  editParts.push(
    "Apply the requested changes above as the dominant edit to this image. Preserve everything else about the existing composition that isn't affected by the requested change.",
  );

  return appendCaptionFriendlyCompositionClause(
    editParts.join(" "),
    options?.burnCaptions,
  );
}
