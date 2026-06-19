"use client";

import type { Campaign } from "@/types/campaign";
import {
  formatCampaignAspectRatios,
  formatCampaignDate,
  getCampaignPreviewImage,
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
          <Link
            key={campaign.id}
            href={`/campaign/${campaign.id}`}
            className="group overflow-hidden rounded-2xl border border-border bg-card/50 transition hover:border-ring/40 hover:bg-card/80"
          >
            <div className="flex flex-col sm:flex-row">
              <div className="flex h-40 w-full items-center justify-center border-b border-border bg-background sm:h-auto sm:w-40 sm:border-b-0 sm:border-r">
                {previewImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewImage}
                    alt={campaign.title ?? "Campaign preview"}
                    loading="lazy"
                    decoding="async"
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
                  <h2 className="text-lg font-semibold text-foreground transition group-hover:text-foreground">
                    {campaign.title ?? "Untitled campaign"}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {campaign.topic}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span>{formatCampaignAspectRatios(campaign)}</span>
                  <span>{formatCampaignDate(campaign.created_at)}</span>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
