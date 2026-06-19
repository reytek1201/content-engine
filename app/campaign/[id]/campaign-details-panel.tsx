"use client";

import type { Campaign } from "@/types/campaign";
import type { CampaignJourneyStripInput } from "@/app/campaign/[id]/campaign-journey-input";
import CampaignDetailsSummary from "@/app/campaign/[id]/campaign-details-summary";
import CampaignTitleEditor from "@/app/campaign/[id]/campaign-title-editor";
import type { CampaignWorkspaceTab } from "@/app/campaign/[id]/campaign-workspace-tab";
import DeleteCampaignButton from "@/app/components/delete-campaign-button";
import DuplicateCampaignButton from "@/app/components/duplicate-campaign-button";
import {
  formatCampaignAspectRatios,
  formatCampaignDate,
} from "@/utils/campaign-display";
import { formatCampaignGenerationStatus } from "@/utils/campaign-status-display";

interface CampaignDetailsPanelProps extends CampaignJourneyStripInput {
  campaign: Campaign;
  brandName: string | null;
  showYouTubeConnectHint?: boolean;
  onTitleSaved: (title: string) => void;
  onError: (message: string) => void;
  onTabChange: (tab: CampaignWorkspaceTab) => void;
}

function MetadataItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm leading-6 text-secondary-foreground">
        {value}
      </dd>
    </div>
  );
}

export default function CampaignDetailsPanel({
  campaign,
  brandName,
  showYouTubeConnectHint = false,
  onTitleSaved,
  onError,
  onTabChange,
  ...journeyInput
}: CampaignDetailsPanelProps) {
  const hasReferences =
    campaign.product_reference_url ||
    campaign.style_reference_url ||
    campaign.logo_reference_url;

  return (
    <div className="mt-4 space-y-6 md:mt-6">
      <div className="md:hidden">
        <p className="brand-kicker">Campaign details</p>
        <CampaignTitleEditor
          campaignId={campaign.id}
          value={campaign.title ?? "Untitled campaign"}
          onSaved={onTitleSaved}
          onError={onError}
        />
      </div>

      <div className="hidden md:block">
        <p className="brand-kicker">Campaign details</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Admin, metadata, and creation brief for this campaign.
        </p>
      </div>

      <CampaignDetailsSummary
        campaignStatus={campaign.status}
        onTabChange={onTabChange}
        showYouTubeConnectHint={showYouTubeConnectHint}
        {...journeyInput}
      />

      <section>
        <h2 className="text-sm font-semibold text-foreground">Metadata</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <MetadataItem
            label="Brand"
            value={brandName ?? "—"}
          />
          <MetadataItem
            label="Created"
            value={formatCampaignDate(campaign.created_at)}
          />
          <MetadataItem
            label="Last updated"
            value={formatCampaignDate(campaign.updated_at)}
          />
          <MetadataItem
            label="Status"
            value={formatCampaignGenerationStatus(campaign.status)}
          />
          <MetadataItem
            label="Formats"
            value={formatCampaignAspectRatios(campaign)}
          />
          <MetadataItem
            label="Slides"
            value={String(campaign.slide_count ?? journeyInput.slideCount)}
          />
          <MetadataItem
            label="Target audience"
            value={campaign.target_audience ?? "—"}
          />
        </dl>

        {campaign.status === "failed" && campaign.error_message ? (
          <div
            role="alert"
            className="mt-3 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200"
          >
            {campaign.error_message}
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-foreground">Creation brief</h2>
        <div className="mt-3 rounded-lg border border-border bg-card/40 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Topic
          </p>
          <p className="mt-2 text-sm leading-6 text-secondary-foreground">
            {campaign.topic}
          </p>
        </div>

        {hasReferences ? (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Reference images
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {campaign.product_reference_url ? (
                <div className="rounded-lg border border-border bg-card/40 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
                    Product
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={campaign.product_reference_url}
                    alt="Product reference"
                    className="mt-3 max-h-28 w-full rounded-md object-contain"
                  />
                </div>
              ) : null}
              {campaign.style_reference_url ? (
                <div className="rounded-lg border border-border bg-card/40 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
                    Style
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={campaign.style_reference_url}
                    alt="Style reference"
                    className="mt-3 max-h-28 w-full rounded-md object-contain"
                  />
                </div>
              ) : null}
              {campaign.logo_reference_url ? (
                <div className="rounded-lg border border-border bg-card/40 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
                    Logo
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={campaign.logo_reference_url}
                    alt="Logo reference"
                    className="mt-3 max-h-28 w-full rounded-md object-contain"
                  />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <section className="border-t border-border pt-6 md:hidden">
        <h2 className="text-sm font-semibold text-foreground">Actions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Duplicate this campaign to reuse the topic and references with fresh
          AI copy.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <DuplicateCampaignButton campaignId={campaign.id} />
        </div>
      </section>

      <section className="border-t border-border pt-6">
        <h2 className="text-sm font-semibold text-foreground">Danger zone</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Permanently delete this campaign and all of its slides. This cannot be
          undone.
        </p>
        <DeleteCampaignButton
          campaignId={campaign.id}
          campaignTitle={campaign.title}
          className="mt-4"
        />
      </section>
    </div>
  );
}
