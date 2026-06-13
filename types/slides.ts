export const SLIDE_COUNT_PRESETS = [3, 5, 7] as const;

export type SlideCount = (typeof SLIDE_COUNT_PRESETS)[number];

export const DEFAULT_SLIDE_COUNT: SlideCount = 5;

export const MIN_SLIDE_COUNT = 3;

export const MAX_SLIDE_COUNT = 7;

export function isSlideCount(value: number): value is SlideCount {
  return (SLIDE_COUNT_PRESETS as readonly number[]).includes(value);
}

/**
 * Returns slide counts the user is allowed to create.
 * Hook for future subscription tiers — filter presets by plan max.
 */
export function getAllowedSlideCounts(_userId?: string): readonly SlideCount[] {
  void _userId;
  return SLIDE_COUNT_PRESETS;
}

export function getMaxSlideCountForUser(_userId?: string): number {
  void _userId;
  return MAX_SLIDE_COUNT;
}

export function slideNarrativeGuidance(slideCount: number): string {
  if (slideCount <= 3) {
    return "Structure slides as: hook → core value → CTA";
  }

  if (slideCount <= 5) {
    return "Structure slides as: problem → insight → solution → proof → CTA";
  }

  return "Structure slides as: hook → problem → insight → solution → proof → social proof → CTA";
}
