import type { AspectRatio, Campaign, Slide, SlideImage } from "@/types/campaign";

export function otherAspectRatio(ratio: AspectRatio): AspectRatio {
  return ratio === "4:5" ? "9:16" : "4:5";
}

export function campaignAspectRatios(
  campaign: Pick<Campaign, "aspect_ratio" | "secondary_aspect_ratio">,
): AspectRatio[] {
  const ratios: AspectRatio[] = [campaign.aspect_ratio];

  if (
    campaign.secondary_aspect_ratio &&
    campaign.secondary_aspect_ratio !== campaign.aspect_ratio
  ) {
    ratios.push(campaign.secondary_aspect_ratio);
  }

  return ratios;
}

export function isCampaignAspectRatio(
  campaign: Pick<Campaign, "aspect_ratio" | "secondary_aspect_ratio">,
  aspectRatio: AspectRatio,
): boolean {
  return (
    aspectRatio === campaign.aspect_ratio ||
    aspectRatio === campaign.secondary_aspect_ratio
  );
}

export type SlideImageIndex = Map<string, Map<AspectRatio, SlideImage>>;

export function indexSlideImages(rows: SlideImage[]): SlideImageIndex {
  const index: SlideImageIndex = new Map();

  for (const row of rows) {
    const byAspect = index.get(row.slide_id) ?? new Map<AspectRatio, SlideImage>();
    byAspect.set(row.aspect_ratio, row);
    index.set(row.slide_id, byAspect);
  }

  return index;
}

export function resolveSlideImage(
  slide: Slide,
  aspectRatio: AspectRatio,
  campaign: Pick<Campaign, "aspect_ratio">,
  index: SlideImageIndex,
): Pick<SlideImage, "image_url" | "fal_request_id"> {
  const fromIndex = index.get(slide.id)?.get(aspectRatio);

  if (fromIndex) {
    return {
      image_url: fromIndex.image_url,
      fal_request_id: fromIndex.fal_request_id,
    };
  }

  if (aspectRatio === campaign.aspect_ratio) {
    return {
      image_url: slide.image_url,
      fal_request_id: slide.fal_request_id,
    };
  }

  return { image_url: null, fal_request_id: null };
}

export function mergeSlideWithAspect(
  slide: Slide,
  aspectRatio: AspectRatio,
  campaign: Pick<Campaign, "aspect_ratio">,
  index: SlideImageIndex,
): Slide {
  const resolved = resolveSlideImage(slide, aspectRatio, campaign, index);

  return {
    ...slide,
    image_url: resolved.image_url,
    fal_request_id: resolved.fal_request_id,
  };
}

export function mergeSlidesWithAspect(
  slides: Slide[],
  aspectRatio: AspectRatio,
  campaign: Pick<Campaign, "aspect_ratio">,
  index: SlideImageIndex,
): Slide[] {
  return slides.map((slide) =>
    mergeSlideWithAspect(slide, aspectRatio, campaign, index),
  );
}

export function slidesCompleteForAspect(
  slides: Slide[],
  aspectRatio: AspectRatio,
  campaign: Pick<Campaign, "aspect_ratio">,
  index: SlideImageIndex,
): boolean {
  return (
    slides.length > 0 &&
    slides.every((slide) =>
      Boolean(
        resolveSlideImage(slide, aspectRatio, campaign, index).image_url,
      ),
    )
  );
}

export function slidesGeneratingForAspect(
  slides: Slide[],
  aspectRatio: AspectRatio,
  campaign: Pick<Campaign, "aspect_ratio">,
  index: SlideImageIndex,
): boolean {
  return slides.some((slide) => {
    const resolved = resolveSlideImage(slide, aspectRatio, campaign, index);
    return Boolean(resolved.fal_request_id && !resolved.image_url);
  });
}

export function aspectRatioFolderName(aspectRatio: AspectRatio): string {
  return aspectRatio === "4:5" ? "4x5" : "9x16";
}

export type VerticalFormatPublishState =
  | "ready"
  | "needs_add"
  | "generating"
  | "not_applicable";

export function getVerticalFormatPublishState(input: {
  slides: Slide[];
  campaign: Pick<Campaign, "aspect_ratio" | "secondary_aspect_ratio">;
  imageIndex: SlideImageIndex;
  primaryImagesComplete: boolean;
}): VerticalFormatPublishState {
  const { slides, campaign, imageIndex, primaryImagesComplete } = input;

  if (
    slidesCompleteForAspect(slides, "9:16", campaign, imageIndex)
  ) {
    return "ready";
  }

  if (campaign.secondary_aspect_ratio === "9:16") {
    return "generating";
  }

  if (
    primaryImagesComplete &&
    campaign.aspect_ratio === "4:5" &&
    !campaign.secondary_aspect_ratio
  ) {
    return "needs_add";
  }

  return "not_applicable";
}

export function verticalFormatPublishBlocked(
  state: VerticalFormatPublishState,
): boolean {
  return state === "needs_add" || state === "generating";
}
