"use client";

import type { CampaignJourneyStripInput } from "@/app/campaign/[id]/campaign-journey-input";
import { runJourneyAction } from "@/app/campaign/[id]/campaign-journey-actions";
import { useCampaignJourney } from "@/app/campaign/[id]/campaign-journey-strip";
import CampaignListStatusBadge from "@/app/campaigns/campaign-list-status-badge";
import {
  tabForNextStepAction,
  type CampaignWorkspaceTab,
} from "@/app/campaign/[id]/campaign-workspace-tab";
import { getCampaignListStatus } from "@/utils/campaign-list-status";
import { formatCampaignDetailsProgress } from "@/utils/campaign-status-display";
import {
  isPlatformViewAction,
  platformViewUrlForAction,
  scrollTargetForNextStepAction,
  scrollToCampaignSection,
} from "@/utils/campaign-progress";
import Link from "next/link";

interface CampaignDetailsSummaryProps extends CampaignJourneyStripInput {
  campaignStatus: string;
  onTabChange: (tab: CampaignWorkspaceTab) => void;
  showYouTubeConnectHint?: boolean;
}

export default function CampaignDetailsSummary({
  campaignStatus,
  onTabChange,
  showYouTubeConnectHint = false,
  ...journeyInput
}: CampaignDetailsSummaryProps) {
  const journey = useCampaignJourney(journeyInput);

  const listStatus = getCampaignListStatus({
    campaignStatus,
    slideCount: journeyInput.slideCount,
    imagesReadyCount: journeyInput.imagesReadyCount,
    hasCaptions: journeyInput.captionsCount > 0,
    hasVideoExport: journeyInput.hasVideoExport ?? false,
    youtubePublished: journeyInput.youtubeAlreadyPublished ?? false,
    tiktokPublished: journeyInput.tiktokAlreadyPublished ?? false,
  });

  const progressLine = formatCampaignDetailsProgress({
    slideCount: journeyInput.slideCount,
    imagesReadyCount: journeyInput.imagesReadyCount,
    imagesComplete: journeyInput.imagesComplete,
    captionsCount: journeyInput.captionsCount,
    hasVideoExport: journeyInput.hasVideoExport ?? false,
    youtubeAlreadyPublished: journeyInput.youtubeAlreadyPublished ?? false,
    tiktokAlreadyPublished: journeyInput.tiktokAlreadyPublished ?? false,
  });

  const handlers = {
    onGenerateImages: journeyInput.onGenerateImages,
    onGenerateCaptions: journeyInput.onGenerateCaptions,
    onDownloadZip: journeyInput.onDownloadZip,
    onDownloadNarration: journeyInput.onDownloadNarration,
    onCopyAllCaptions: journeyInput.onCopyAllCaptions,
    onSaveAllToPhotos: journeyInput.onSaveAllToPhotos,
  };

  function handleContinue() {
    const primary = journey.primary;
    if (!primary || primary.disabled || primary.loading) {
      return;
    }

    if (
      journey.isFullyComplete &&
      isPlatformViewAction(primary.action)
    ) {
      const url = platformViewUrlForAction(primary.action, {
        youtubeWatchUrl: journey.youtubeWatchUrl,
        tiktokProfileUrl: journey.tiktokProfileUrl,
      });

      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }

      return;
    }

    onTabChange(tabForNextStepAction(primary.action));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToCampaignSection(scrollTargetForNextStepAction(primary.action));
      });
    });
    runJourneyAction(primary.action, handlers);
  }

  const showContinue =
    journey.primary !== null &&
    !journey.primary.disabled &&
    !journey.primary.loading;

  return (
    <section className="rounded-xl border border-border bg-card/40 p-4 sm:rounded-2xl sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Campaign summary
          </p>
          <div className="mt-2">
            <CampaignListStatusBadge status={listStatus} />
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-secondary-foreground">
        {progressLine}
      </p>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {journey.description}
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {showContinue && journey.primary ? (
          <button
            type="button"
            onClick={handleContinue}
            className="btn-primary w-full py-2.5 text-sm sm:w-auto sm:px-6"
          >
            {journey.primary.label}
          </button>
        ) : null}

        {journey.youtubeWatchUrl && journey.isFullyComplete ? (
          <a
            href={journey.youtubeWatchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground sm:w-auto"
          >
            View on YouTube
          </a>
        ) : null}

        {journey.tiktokProfileUrl && journey.isFullyComplete ? (
          <a
            href={journey.tiktokProfileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground sm:w-auto"
          >
            View on TikTok
          </a>
        ) : null}

        {showYouTubeConnectHint ? (
          <Link
            href="/settings/connected-accounts"
            className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground sm:w-auto"
          >
            Connect YouTube
          </Link>
        ) : null}
      </div>
    </section>
  );
}
