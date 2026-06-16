import { z } from "zod";
import type { CampaignReferences } from "@/types/references";
import {
  DEFAULT_SLIDE_COUNT,
  getMaxSlideCountForUser,
  isSlideCount,
  type SlideCount,
} from "@/types/slides";

export const ReferencesInputSchema = z.object({
  product: z.string().url().optional(),
  style: z.string().url().optional(),
  logo: z.string().url().optional(),
});

export const BrandLibraryPutSchema = z.object({
  product: z.string().url().nullable().optional(),
  style: z.string().url().nullable().optional(),
  logo: z.string().url().nullable().optional(),
});

export const CreateBrandSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const BrandPatchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  product: z.string().url().nullable().optional(),
  style: z.string().url().nullable().optional(),
  logo: z.string().url().nullable().optional(),
  voice_notes: z.string().trim().max(2000).nullable().optional(),
});

export const CreateBrandProductSchema = z.object({
  name: z.string().trim().min(1).max(80),
  product_reference_url: z.string().url().nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
});

export const BrandProductPatchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  product_reference_url: z.string().url().nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
});

export const RequestSchema = z.object({
  topic: z.string().trim().min(1, "Topic is required"),
  aspect_ratio: z.enum(["4:5", "9:16"]),
  slide_count: z
    .number()
    .int()
    .refine(isSlideCount, "slide_count must be 3, 5, or 7")
    .default(DEFAULT_SLIDE_COUNT),
  references: ReferencesInputSchema.optional(),
  brand_id: z.string().uuid().optional(),
  brand_product_id: z.string().uuid().optional(),
});

const SlideGenerationFieldsSchema = z.object({
  text_overlay: z
    .string()
    .min(1)
    .refine(
      (value) => value.trim().split(/\s+/).filter(Boolean).length <= 12,
      "text_overlay must be at most 12 words"
    ),
  voiceover_script: z.string().min(1),
  image_prompt: z.string().min(1),
});

export const TextOverlayInputSchema = SlideGenerationFieldsSchema.shape.text_overlay;

export function createCampaignGenerationSchema(slideCount: SlideCount) {
  const maxIndex = slideCount - 1;

  const SlideGenerationSchema = SlideGenerationFieldsSchema.extend({
    slide_index: z.number().int().min(0).max(maxIndex),
  });

  return z.object({
    title: z.string().min(1),
    target_audience: z.string().min(1),
    slides: z
      .array(SlideGenerationSchema)
      .length(slideCount)
      .refine(
        (slides) => {
          const indices = slides.map((slide) => slide.slide_index);
          const expected = Array.from({ length: slideCount }, (_, index) => index);
          return (
            new Set(indices).size === slideCount &&
            expected.every((index) => indices.includes(index))
          );
        },
        `slide_index must be 0 through ${maxIndex} exactly once each`
      ),
  });
}

export type CampaignGeneration = z.infer<
  ReturnType<typeof createCampaignGenerationSchema>
>;

export function parseCampaignGeneration(
  raw: unknown,
  slideCount: SlideCount
): CampaignGeneration {
  return createCampaignGenerationSchema(slideCount).parse(raw);
}

export function assertSlideCountAllowed(
  slideCount: SlideCount,
  userId: string
): void {
  if (slideCount > getMaxSlideCountForUser(userId)) {
    throw new Error(
      `Your plan allows up to ${getMaxSlideCountForUser(userId)} slides per campaign`
    );
  }
}

export function aspectRatioContext(aspectRatio: "4:5" | "9:16"): string {
  return aspectRatio === "4:5"
    ? "Instagram/Facebook portrait carousel slide (4:5 aspect ratio)"
    : "TikTok/Reels/Shorts vertical frame (9:16 aspect ratio)";
}

export function buildNanoBananaPrompt(
  textOverlay: string,
  imagePrompt: string,
  aspectRatio: "4:5" | "9:16",
  references: CampaignReferences = {}
): string {
  const formatLabel =
    aspectRatio === "4:5"
      ? "4:5 portrait social carousel slide"
      : "9:16 vertical short-form video slide";

  const safeOverlay = textOverlay.replace(/"/g, '\\"');

  const referenceInstructions: string[] = [];

  if (references.product) {
    referenceInstructions.push(
      "Use the product reference image as the hero subject in the composition."
    );
  }

  if (references.style) {
    referenceInstructions.push(
      "Match the color palette, layout energy, and visual mood of the style reference. Do not copy any text from the style reference."
    );
  }

  if (references.logo) {
    referenceInstructions.push(
      "Place the logo reference cleanly in the bottom-right corner at roughly 8% width. Preserve the logo exactly; do not redraw or distort it."
    );
  }

  return [
    `Create a polished ${formatLabel} for a performance marketing campaign.`,
    `Render this exact headline text prominently in the upper third: "${safeOverlay}" using bold, clean sans-serif typography with strong contrast and accurate spelling.`,
    `Visual style and scene (background and composition only, text must match the headline above): ${imagePrompt}`,
    ...referenceInstructions,
    "Professional social-media creative, vibrant colors, high contrast, legible typography, no watermark.",
  ].join(" ");
}

export function normalizeReferencesInput(
  input?: z.infer<typeof ReferencesInputSchema>
): CampaignReferences {
  if (!input) {
    return {};
  }

  return {
    product: input.product ?? null,
    style: input.style ?? null,
    logo: input.logo ?? null,
  };
}

export function referencesFromCampaign(campaign: {
  product_reference_url: string | null;
  style_reference_url: string | null;
  logo_reference_url: string | null;
}): CampaignReferences {
  return {
    product: campaign.product_reference_url,
    style: campaign.style_reference_url,
    logo: campaign.logo_reference_url,
  };
}
