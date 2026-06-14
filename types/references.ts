export type ReferenceType = "product" | "style" | "logo";

export interface CampaignReferences {
  product?: string | null;
  style?: string | null;
  logo?: string | null;
}

export function getReferenceImageUrls(
  references: CampaignReferences
): string[] {
  return [references.product, references.style, references.logo].filter(
    (url): url is string => Boolean(url)
  );
}

/** Slide image first so Fal edit targets the current creative; brand refs follow. */
export function getRegenerationImageUrls(
  slideImageUrl: string,
  references: CampaignReferences,
): string[] {
  return [slideImageUrl, ...getReferenceImageUrls(references)];
}

export function hasReferences(references: CampaignReferences): boolean {
  return getReferenceImageUrls(references).length > 0;
}
