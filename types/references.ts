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

export function hasReferences(references: CampaignReferences): boolean {
  return getReferenceImageUrls(references).length > 0;
}
