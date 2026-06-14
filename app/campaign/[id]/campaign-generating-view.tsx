"use client";

import type { Campaign } from "@/types/campaign";
import { formatAspectRatio } from "@/utils/campaign-display";

interface CampaignGeneratingViewProps {
  campaign: Campaign;
  isRetrying: boolean;
  onRetry: () => void;
}

export default function CampaignGeneratingView({
  campaign,
  isRetrying,
  onRetry,
}: CampaignGeneratingViewProps) {
  const isFailed = campaign.status === "failed";
  const slideCount = campaign.slide_count ?? 0;

  return (
    <div className="min-h-full bg-background text-foreground">
      <main className="page-main flex min-h-[60vh] flex-col items-center justify-center">
        <div className="page-content">
        {isFailed ? (
          <>
            <div
              role="alert"
              className="w-full rounded-2xl border border-red-900/60 bg-red-950/40 px-6 py-5 text-center"
            >
              <p className="text-sm font-semibold text-red-200">
                Campaign generation failed
              </p>
              <p className="mt-2 text-sm leading-6 text-red-200/90">
                {campaign.error_message ?? "Something went wrong. Try again."}
              </p>
            </div>
            <button
              type="button"
              onClick={onRetry}
              disabled={isRetrying}
              className="btn-primary mt-8 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRetrying ? "Retrying…" : "Try again"}
            </button>
          </>
        ) : (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
            <p className="brand-kicker mt-8">Writing your campaign</p>
            <h1 className="mt-3 text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {campaign.topic}
            </h1>
            <p className="mt-4 max-w-md text-center text-sm leading-7 text-muted-foreground">
              Gemini is drafting {slideCount} slide scripts with headlines,
              voiceover, and image prompts. This usually takes 15–30 seconds.
            </p>
            <dl className="mt-8 flex flex-wrap justify-center gap-6 text-center text-sm text-muted-foreground">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide">
                  Format
                </dt>
                <dd className="mt-1 text-secondary-foreground">
                  {formatAspectRatio(campaign.aspect_ratio)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide">
                  Slides
                </dt>
                <dd className="mt-1 text-secondary-foreground">{slideCount}</dd>
              </div>
            </dl>
          </>
        )}
        </div>
      </main>
    </div>
  );
}
