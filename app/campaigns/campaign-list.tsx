"use client";

import DeleteCampaignButton from "@/app/components/delete-campaign-button";
import DuplicateCampaignButton from "@/app/components/duplicate-campaign-button";
import type { Campaign } from "@/types/campaign";
import {
  formatAspectRatio,
  formatCampaignDate,
  getCampaignPreviewImage,
  STATUS_LABELS,
  STATUS_STYLES,
} from "@/utils/campaign-display";
import Link from "next/link";

interface CampaignListProps {
  campaigns: Array<
    Campaign & {
      slides: Array<{ slide_index: number; image_url: string | null }>;
    }
  >;
}

export default function CampaignList({ campaigns }: CampaignListProps) {
  return (
    <div className="mt-10 grid gap-4">
      {campaigns.map((campaign) => {
        const previewImage = getCampaignPreviewImage(campaign.slides);

        return (
          <article
            key={campaign.id}
            className="overflow-hidden rounded-2xl border border-border bg-card/50 transition hover:border-border hover:bg-card/80"
          >
            <div className="flex flex-col sm:flex-row">
              <Link
                href={`/campaign/${campaign.id}`}
                className="group flex flex-1 flex-col sm:flex-row"
              >
                <div className="flex h-40 w-full items-center justify-center border-b border-border bg-background sm:h-auto sm:w-40 sm:border-b-0 sm:border-r">
                  {previewImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewImage}
                      alt=""
                      className="h-full w-full object-cover sm:max-h-40"
                    />
                  ) : (
                    <span className="px-4 text-center text-xs uppercase tracking-wide text-muted-foreground/80">
                      No preview
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-between gap-4 p-5 sm:p-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-semibold text-foreground transition group-hover:text-foreground">
                        {campaign.title ?? "Untitled campaign"}
                      </h2>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLES[campaign.status]}`}
                      >
                        {STATUS_LABELS[campaign.status]}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {campaign.topic}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span>{formatAspectRatio(campaign.aspect_ratio)}</span>
                    <span>{formatCampaignDate(campaign.created_at)}</span>
                  </div>
                </div>
              </Link>

              <div className="flex flex-col gap-3 border-t border-border p-4 sm:border-l sm:border-t-0">
                <DuplicateCampaignButton
                  campaignId={campaign.id}
                  className="w-full sm:w-auto"
                />
                <DeleteCampaignButton
                  campaignId={campaign.id}
                  campaignTitle={campaign.title}
                  className="w-full sm:w-auto"
                />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
