"use client";

import type { Campaign } from "@/types/campaign";
import CampaignBriefSheet from "@/app/campaign/[id]/campaign-brief-sheet";
import CampaignTitleEditor from "@/app/campaign/[id]/campaign-title-editor";
import CampaignWorkspaceOverflowMenu from "@/app/campaign/[id]/campaign-workspace-overflow-menu";
import { campaignAspectRatios } from "@/utils/slide-aspect-images";
import { useState } from "react";

interface CampaignWorkspaceHeaderProps {
  campaign: Campaign;
  brandName: string | null;
  slideCount: number;
  onTitleSaved: (title: string) => void;
  onError: (message: string) => void;
  showKicker?: boolean;
  className?: string;
}

function formatMetadataStrip(
  campaign: Campaign,
  slideCount: number,
  brandName: string | null,
): string {
  const aspects = campaignAspectRatios(campaign)
    .map((ratio) => ratio)
    .join(" · ");
  const slidesLabel = `${slideCount} slide${slideCount === 1 ? "" : "s"}`;
  const brand = brandName?.trim() || "No brand";

  return `${aspects} · ${slidesLabel} · ${brand}`;
}

export default function CampaignWorkspaceHeader({
  campaign,
  brandName,
  slideCount,
  onTitleSaved,
  onError,
  showKicker = true,
  className = "",
}: CampaignWorkspaceHeaderProps) {
  const [briefOpen, setBriefOpen] = useState(false);

  return (
    <>
      <div className={className}>
        {showKicker ? (
          <p className="brand-kicker">Campaign workspace</p>
        ) : null}

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CampaignTitleEditor
              campaignId={campaign.id}
              value={campaign.title ?? "Untitled campaign"}
              onSaved={onTitleSaved}
              onError={onError}
            />
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {formatMetadataStrip(campaign, slideCount, brandName)}
            </p>
          </div>

          <CampaignWorkspaceOverflowMenu
            campaignId={campaign.id}
            campaignTitle={campaign.title}
            onViewBrief={() => setBriefOpen(true)}
          />
        </div>
      </div>

      <CampaignBriefSheet
        open={briefOpen}
        onClose={() => setBriefOpen(false)}
        topic={campaign.topic}
        sourceUrl={campaign.source_url}
        productReferenceUrl={campaign.product_reference_url}
        styleReferenceUrl={campaign.style_reference_url}
        logoReferenceUrl={campaign.logo_reference_url}
      />
    </>
  );
}
