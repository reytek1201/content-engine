"use client";

import { runJourneyAction } from "@/app/campaign/[id]/campaign-journey-actions";
import type { CampaignJourneyStripInput } from "@/app/campaign/[id]/campaign-journey-input";
import {
  tabForJourneyStep,
  tabForNextStepAction,
  type CampaignWorkspaceTab,
} from "@/app/campaign/[id]/campaign-workspace-tab";
import {
  CAMPAIGN_JOURNEY_STRIP_ID,
  getCampaignJourney,
  isPlatformViewAction,
  platformViewUrlForAction,
  scrollTargetForNextStepAction,
  scrollToCampaignSection,
  type CampaignJourneyStep,
  type CampaignNextStepButton,
  type NextStepAction,
} from "@/utils/campaign-progress";
import { useMemo } from "react";

export type CampaignJourneyLayout = "default" | "sticky" | "sheet";

interface CampaignJourneyStripProps extends CampaignJourneyStripInput {
  layout?: CampaignJourneyLayout;
  onTabChange?: (tab: CampaignWorkspaceTab) => void;
  onSheetClose?: () => void;
}

function stepIndicatorClasses(step: CampaignJourneyStep): string {
  if (step.status === "done") {
    return "border-emerald-700/60 bg-emerald-950/40 text-emerald-300";
  }

  if (step.status === "current") {
    return "border-primary/60 bg-primary/10 text-primary";
  }

  return "border-border bg-background text-muted-foreground opacity-60";
}

function StepIndicator({
  step,
  index,
  previousComplete,
  onStepClick,
}: {
  step: CampaignJourneyStep;
  index: number;
  previousComplete: boolean;
  onStepClick: (step: CampaignJourneyStep) => void;
}) {
  return (
    <>
      {index > 0 && (
        <div
          aria-hidden
          className={`h-px min-w-2 flex-1 sm:min-w-0 ${
            previousComplete ? "bg-emerald-700/60" : "bg-border"
          }`}
        />
      )}
      <button
        type="button"
        onClick={() => onStepClick(step)}
        className={`flex shrink-0 snap-center flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-center transition hover:bg-card/60 sm:min-w-14 sm:gap-1.5 sm:rounded-xl sm:px-1.5 sm:py-2 ${
          step.status === "current" ? "bg-card/50" : ""
        }`}
      >
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold sm:h-7 sm:w-7 sm:text-xs ${stepIndicatorClasses(step)}`}
        >
          {step.status === "done" ? "✓" : index + 1}
        </span>
        <span
          className={`max-w-[3.5rem] text-[9px] font-semibold uppercase leading-tight tracking-wide sm:max-w-none sm:text-[10px] ${
            step.status === "current"
              ? "text-foreground"
              : "text-muted-foreground"
          }`}
        >
          {step.label}
        </span>
        {step.detail && step.status === "current" && (
          <span className="max-w-[4rem] text-[9px] leading-tight text-muted-foreground sm:max-w-none sm:text-[10px]">
            {step.detail}
          </span>
        )}
      </button>
    </>
  );
}

export function useCampaignJourney(input: CampaignJourneyStripInput) {
  const journeyInput = useMemo(
    () => ({
      slideCount: input.slideCount,
      imagesReadyCount: input.imagesReadyCount,
      imagesComplete: input.imagesComplete,
      canGenerateImages: input.canGenerateImages,
      isGeneratingImages: input.isGeneratingImages,
      isStartingImages: input.isStartingImages,
      captionsCount: input.captionsCount,
      canGenerateCaptions: input.canGenerateCaptions,
      isGeneratingCaptions: input.isGeneratingCaptions,
      isExporting: input.isExporting,
      isExportingAudio: input.isExportingAudio,
      hasVoiceoverScripts: input.hasVoiceoverScripts,
      isNativeApp: input.isNativeApp,
      isSavingAllPhotos: input.isSavingAllPhotos,
      saveAllPhotosProgress: input.saveAllPhotosProgress,
      videoExportReady: input.videoExportReady,
      hasVideoCredits: input.hasVideoCredits,
      hasVideoExport: input.hasVideoExport,
      youtubeAlreadyPublished: input.youtubeAlreadyPublished,
      youtubeWatchUrl: input.youtubeWatchUrl,
      tiktokAlreadyPublished: input.tiktokAlreadyPublished,
      tiktokProfileUrl: input.tiktokProfileUrl,
      isExportingVideo: input.isExportingVideo,
      copiedAllCaptions: input.copiedAllCaptions,
      savedAllPhotos: input.savedAllPhotos,
    }),
    [input],
  );

  return getCampaignJourney(journeyInput);
}

export default function CampaignJourneyStrip({
  layout = "default",
  onTabChange,
  onSheetClose,
  ...input
}: CampaignJourneyStripProps) {
  const journey = useCampaignJourney(input);

  const handlers = {
    onGenerateImages: input.onGenerateImages,
    onGenerateCaptions: input.onGenerateCaptions,
    onDownloadZip: input.onDownloadZip,
    onDownloadNarration: input.onDownloadNarration,
    onCopyAllCaptions: input.onCopyAllCaptions,
    onSaveAllToPhotos: input.onSaveAllToPhotos,
  };

  function scrollAfterNavigate(action: NextStepAction) {
    const scrollTarget = scrollTargetForNextStepAction(action);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToCampaignSection(scrollTarget);
      });
    });
  }

  function navigateForAction(action: NextStepAction) {
    if (onTabChange) {
      onTabChange(tabForNextStepAction(action));
    }

    if (layout === "sheet") {
      onSheetClose?.();
      scrollAfterNavigate(action);
      return;
    }

    scrollToCampaignSection(scrollTargetForNextStepAction(action));
  }

  function handleStepClick(step: CampaignJourneyStep) {
    if (onTabChange) {
      onTabChange(tabForJourneyStep(step.id));
    }

    if (layout === "sheet") {
      onSheetClose?.();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToCampaignSection(step.scrollTargetId);
        });
      });
      return;
    }

    scrollToCampaignSection(step.scrollTargetId);
  }

  function openPlatformView(action: NextStepAction) {
    const url = platformViewUrlForAction(action, {
      youtubeWatchUrl: journey.youtubeWatchUrl,
      tiktokProfileUrl: journey.tiktokProfileUrl,
    });

    if (!url) {
      return false;
    }

    if (layout === "sheet") {
      onSheetClose?.();
    }

    window.open(url, "_blank", "noopener,noreferrer");
    return true;
  }

  function handlePrimaryClick() {
    const primary = journey.primary;
    if (!primary || primary.disabled || primary.loading) {
      return;
    }

    if (journey.isFullyComplete && isPlatformViewAction(primary.action)) {
      openPlatformView(primary.action);
      return;
    }

    navigateForAction(primary.action);
    runJourneyAction(primary.action, handlers);
  }

  function handleSecondaryClick(button: CampaignNextStepButton) {
    if (button.disabled || button.loading) {
      return;
    }

    if (journey.isFullyComplete && isPlatformViewAction(button.action)) {
      openPlatformView(button.action);
      return;
    }

    navigateForAction(button.action);
    runJourneyAction(button.action, handlers);
  }

  const isSheet = layout === "sheet";
  const isSticky = layout === "sticky";
  const showActions =
    journey.primary !== null || journey.secondaries.length > 0;

  const stripContent = (
    <>
      <div className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max snap-x snap-mandatory items-center gap-0.5 sm:min-w-0 sm:snap-none sm:gap-1">
          {journey.steps.map((step, index) => (
            <StepIndicator
              key={step.id}
              step={step}
              index={index}
              previousComplete={
                index > 0 ? journey.steps[index - 1].status === "done" : false
              }
              onStepClick={handleStepClick}
            />
          ))}
        </div>
      </div>

      {showActions && (
        <div
          className={
            isSheet
              ? "mt-4 flex flex-col gap-4"
              : isSticky
                ? "mt-3 flex flex-col gap-2.5 border-t border-primary/10 pt-3 sm:mt-4 sm:gap-3 sm:pt-4 md:flex-row md:items-center md:justify-between"
                : "mt-3 flex flex-col gap-2.5 sm:mt-4 sm:gap-3 md:flex-row md:items-center md:justify-between"
          }
        >
          <div className="min-w-0">
            {!isSheet && (
              <p
                className={`text-[10px] font-semibold uppercase tracking-wide sm:text-xs ${
                  journey.isFullyComplete
                    ? "text-emerald-400"
                    : "text-primary"
                }`}
              >
                {journey.isFullyComplete ? "All done" : "Next step"}
              </p>
            )}
            <p
              className={`font-medium leading-snug text-foreground ${
                isSheet
                  ? "text-sm"
                  : "mt-0.5 line-clamp-2 text-xs sm:mt-1 sm:line-clamp-none sm:text-sm"
              }`}
            >
              {journey.description}
            </p>
          </div>

          <div
            className={`flex shrink-0 gap-2 ${
              isSheet
                ? "w-full flex-col"
                : "flex-col sm:flex-row sm:flex-wrap sm:gap-3 md:justify-end"
            }`}
          >
            {journey.secondaries.map((button) => (
              <button
                key={button.action}
                type="button"
                disabled={button.disabled || button.loading}
                onClick={() => handleSecondaryClick(button)}
                className={`inline-flex items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 ${
                  isSheet
                    ? "w-full"
                    : "w-full sm:w-auto sm:px-5 sm:py-2.5 md:py-3"
                }`}
              >
                {button.label}
              </button>
            ))}

            {journey.primary && (
              <button
                type="button"
                aria-disabled={journey.primary.disabled || journey.primary.loading}
                onClick={handlePrimaryClick}
                className={`btn-primary py-2.5 text-sm ${
                  isSheet ? "w-full" : "w-full sm:w-auto sm:py-2.5 md:py-3"
                } ${
                  journey.primary.disabled || journey.primary.loading
                    ? "cursor-default opacity-70"
                    : ""
                }`}
              >
                {journey.primary.label}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );

  if (isSheet) {
    return <div className="flex flex-col">{stripContent}</div>;
  }

  if (isSticky) {
    return (
      <div
        id={CAMPAIGN_JOURNEY_STRIP_ID}
        className="sticky top-0 z-40 -mx-4 border-b border-border bg-background px-4 py-2 sm:-mx-6 sm:px-6 sm:py-2.5 md:top-[4.5rem] md:-mx-10 md:px-10 md:py-3"
      >
        <div
          className={`rounded-xl border p-3 sm:rounded-2xl sm:p-4 md:p-5 ${
            journey.isFullyComplete
              ? "border-emerald-800/40 bg-emerald-950/20"
              : "border-primary/20 bg-primary/5"
          }`}
        >
          {stripContent}
        </div>
      </div>
    );
  }

  return (
    <div
      id={CAMPAIGN_JOURNEY_STRIP_ID}
      className={`rounded-xl border bg-card/30 p-3 sm:rounded-2xl sm:p-4 md:p-5 ${
        journey.isFullyComplete
          ? "border-emerald-800/40 bg-emerald-950/20"
          : "border-border"
      }`}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
        Campaign journey
      </p>
      <div className="mt-3 sm:mt-4">{stripContent}</div>
    </div>
  );
}
