import { campaignsHref } from "@/utils/campaigns-href";

export type BrandsBackFrom = "campaigns" | "settings";

export interface BrandsBackTarget {
  href: string;
  label: string;
}

function isBrandsBackFrom(value?: string): value is BrandsBackFrom {
  return value === "campaigns" || value === "settings";
}

export function resolveBrandsListBackTarget(
  from?: string,
  brandId?: string | null,
): BrandsBackTarget {
  switch (from) {
    case "campaigns":
      return { href: campaignsHref(brandId), label: "Campaigns" };
    default:
      return { href: "/settings", label: "Settings" };
  }
}

export function resolveBrandDetailBackTarget(
  from?: string,
  returnBrandId?: string | null,
): BrandsBackTarget {
  switch (from) {
    case "campaigns":
      return {
        href: campaignsHref(returnBrandId),
        label: "Campaigns",
      };
    case "settings":
      return { href: brandsListHref("settings"), label: "Brands" };
    default:
      return { href: "/settings/brands", label: "Brands" };
  }
}

export function brandsListHref(
  from?: BrandsBackFrom,
  brandId?: string | null,
): string {
  const params = new URLSearchParams();

  if (from) {
    params.set("from", from);
  }

  if (from === "campaigns" && brandId) {
    params.set("brand", brandId);
  }

  const query = params.toString();
  return query ? `/settings/brands?${query}` : "/settings/brands";
}

export function brandDetailHref(
  brandId: string,
  from?: BrandsBackFrom,
  returnBrandId?: string | null,
): string {
  const params = new URLSearchParams();

  if (from) {
    params.set("from", from);
  }

  if (from === "campaigns" && returnBrandId) {
    params.set("brand", returnBrandId);
  }

  const query = params.toString();
  return query
    ? `/settings/brands/${brandId}?${query}`
    : `/settings/brands/${brandId}`;
}

export function parseBrandsBackFrom(from?: string): BrandsBackFrom | undefined {
  return isBrandsBackFrom(from) ? from : undefined;
}
