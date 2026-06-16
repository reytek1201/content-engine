"use client";

import AddBrandLink from "@/app/components/add-brand-link";
import BrandSwitcher from "@/app/components/brand-switcher";
import NewCampaignButton from "@/app/components/new-campaign-button";
import { brandDetailHref } from "@/utils/brands-back-target";
import Link from "next/link";

interface CampaignsPageHeaderProps {
  campaignCount: number;
  hasMultipleBrands: boolean;
  activeBrandId: string | null;
}

export default function CampaignsPageHeader({
  campaignCount,
  hasMultipleBrands,
  activeBrandId,
}: CampaignsPageHeaderProps) {
  const pageTitle = hasMultipleBrands ? "Campaigns" : "My campaigns";
  const campaignLabel = `${campaignCount} campaign${campaignCount === 1 ? "" : "s"}`;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            {pageTitle}
          </h1>
          <div className="shrink-0 sm:hidden">
            <NewCampaignButton />
          </div>
        </div>

        {hasMultipleBrands ? (
          <BrandSwitcher className="max-w-md" />
        ) : null}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span className="whitespace-nowrap">{campaignLabel}</span>

          {activeBrandId ? (
            <>
              <span aria-hidden className="text-border">
                ·
              </span>
              <Link
                href={brandDetailHref(activeBrandId, "campaigns", activeBrandId)}
                className="whitespace-nowrap font-medium text-primary underline-offset-2 hover:underline"
              >
                <span className="sm:hidden">Edit brand</span>
                <span className="hidden sm:inline">Edit brand kit</span>
              </Link>
            </>
          ) : null}

          <span aria-hidden className="text-border">
            ·
          </span>
          <AddBrandLink
            from="campaigns"
            brandId={activeBrandId}
            label={hasMultipleBrands ? "Add brand" : "Add a brand"}
            className="whitespace-nowrap"
          />
        </div>
      </div>

      <div className="hidden shrink-0 sm:block">
        <NewCampaignButton />
      </div>
    </div>
  );
}
