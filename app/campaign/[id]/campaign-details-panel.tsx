"use client";

import type { Campaign } from "@/types/campaign";
import { formatAspectRatio } from "@/utils/campaign-display";
import CampaignProgressStrip from "@/app/campaign/[id]/campaign-progress-strip";
import CampaignTitleEditor from "@/app/campaign/[id]/campaign-title-editor";
import DeleteCampaignButton from "@/app/components/delete-campaign-button";
import DuplicateCampaignButton from "@/app/components/duplicate-campaign-button";

interface CampaignDetailsPanelProps {
  campaign: Campaign;
  slideCount: number;
  imagesReadyCount: number;
  imagesComplete: boolean;
  isGeneratingImages: boolean;
  captionsCount: number;
  onTitleSaved: (title: string) => void;
  onError: (message: string) => void;
}

export default function CampaignDetailsPanel({
  campaign,
  slideCount,
  imagesReadyCount,
  imagesComplete,
  isGeneratingImages,
  captionsCount,
  onTitleSaved,
  onError,
}: CampaignDetailsPanelProps) {
  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="brand-kicker">Campaign details</p>
          <CampaignTitleEditor
            campaignId={campaign.id}
            value={campaign.title ?? "Untitled campaign"}
            onSaved={onTitleSaved}
            onError={onError}
          />
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {campaign.topic}
          </p>
        </div>
        <DuplicateCampaignButton campaignId={campaign.id} />
      </div>

      <CampaignProgressStrip
        slideCount={slideCount}
        imagesReadyCount={imagesReadyCount}
        imagesComplete={imagesComplete}
        isGeneratingImages={isGeneratingImages}
        captionsCount={captionsCount}
      />

      <dl className="grid gap-3">
        <div className="rounded-lg border border-border bg-card/40 p-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Target audience
          </dt>
          <dd className="mt-1.5 text-sm leading-6 text-secondary-foreground">
            {campaign.target_audience ?? "—"}
          </dd>
        </div>
        <div className="rounded-lg border border-border bg-card/40 p-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Aspect ratio
          </dt>
          <dd className="mt-1.5 text-sm text-secondary-foreground">
            {formatAspectRatio(campaign.aspect_ratio)}
          </dd>
        </div>
        <div className="rounded-lg border border-border bg-card/40 p-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Slides
          </dt>
          <dd className="mt-1.5 text-sm text-secondary-foreground">
            {campaign.slide_count ?? slideCount}
          </dd>
        </div>
      </dl>

      {(campaign.product_reference_url ||
        campaign.style_reference_url ||
        campaign.logo_reference_url) && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Campaign references
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {campaign.product_reference_url && (
              <div className="rounded-lg border border-border bg-card/40 p-2">
                <p className="text-[10px] font-semibold text-secondary-foreground">
                  Product
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={campaign.product_reference_url}
                  alt="Product reference"
                  className="mt-2 max-h-20 w-full rounded-md object-contain"
                />
              </div>
            )}
            {campaign.style_reference_url && (
              <div className="rounded-lg border border-border bg-card/40 p-2">
                <p className="text-[10px] font-semibold text-secondary-foreground">
                  Style
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={campaign.style_reference_url}
                  alt="Style reference"
                  className="mt-2 max-h-20 w-full rounded-md object-contain"
                />
              </div>
            )}
            {campaign.logo_reference_url && (
              <div className="rounded-lg border border-border bg-card/40 p-2">
                <p className="text-[10px] font-semibold text-secondary-foreground">
                  Logo
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={campaign.logo_reference_url}
                  alt="Logo reference"
                  className="mt-2 max-h-20 w-full rounded-md object-contain"
                />
              </div>
            )}
          </div>
        </div>
      )}

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
