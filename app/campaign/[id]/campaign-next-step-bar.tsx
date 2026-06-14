"use client";

import {
  getCampaignNextStep,
  scrollToCampaignSection,
  type CampaignNextStep,
} from "@/utils/campaign-progress";

interface CampaignNextStepBarProps {
  slideCount: number;
  imagesReadyCount: number;
  imagesComplete: boolean;
  isGeneratingImages: boolean;
  canGenerateImages: boolean;
  isStartingImages: boolean;
  captionsCount: number;
  canGenerateCaptions: boolean;
  isGeneratingCaptions: boolean;
  isExporting: boolean;
  copiedAllCaptions: boolean;
  onGenerateImages: () => void;
  onGenerateCaptions: () => void;
  onDownloadZip: () => void;
  onCopyAllCaptions: () => void;
}

function runNextStepAction(
  nextStep: CampaignNextStep,
  handlers: Pick<
    CampaignNextStepBarProps,
    | "onGenerateImages"
    | "onGenerateCaptions"
    | "onDownloadZip"
    | "onCopyAllCaptions"
  >
) {
  switch (nextStep.action) {
    case "generate_images":
      handlers.onGenerateImages();
      break;
    case "generate_captions":
      handlers.onGenerateCaptions();
      break;
    case "download_zip":
      handlers.onDownloadZip();
      break;
    case "copy_captions":
      handlers.onCopyAllCaptions();
      break;
  }
}

export default function CampaignNextStepBar(props: CampaignNextStepBarProps) {
  const {
    slideCount,
    imagesReadyCount,
    imagesComplete,
    isGeneratingImages,
    canGenerateImages,
    isStartingImages,
    captionsCount,
    canGenerateCaptions,
    isGeneratingCaptions,
    isExporting,
    copiedAllCaptions,
    onGenerateImages,
    onGenerateCaptions,
    onDownloadZip,
    onCopyAllCaptions,
  } = props;

  const nextStep = getCampaignNextStep({
    slideCount,
    imagesReadyCount,
    imagesComplete,
    canGenerateImages,
    isGeneratingImages,
    isStartingImages,
    captionsCount,
    canGenerateCaptions,
    isGeneratingCaptions,
    isExporting,
  });

  const handlers = {
    onGenerateImages,
    onGenerateCaptions,
    onDownloadZip,
    onCopyAllCaptions,
  };

  const actionDisabled = nextStep.disabled || nextStep.loading;

  function handlePrimaryClick() {
    scrollToCampaignSection(nextStep.scrollTargetId);
    if (!actionDisabled) {
      runNextStepAction(nextStep, handlers);
    }
  }

  return (
    <div className="sticky top-0 z-40 -mx-4 border-b border-border bg-background/95 px-4 py-2 backdrop-blur-sm sm:-mx-6 sm:px-6 sm:py-2.5 md:-mx-10 md:px-10 md:py-3">
      <div className="flex flex-col gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 sm:gap-3 sm:rounded-2xl sm:p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary sm:text-xs">
            Next step
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs font-medium leading-snug text-foreground sm:mt-1 sm:line-clamp-none sm:text-sm">
            {nextStep.description}
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3 md:justify-end">
          {nextStep.secondary && (
            <button
              type="button"
              disabled={nextStep.secondary.disabled || nextStep.secondary.loading}
              onClick={() => {
                scrollToCampaignSection("section-publish");
                onCopyAllCaptions();
              }}
              className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-5 sm:py-2.5 md:py-3"
            >
              {copiedAllCaptions ? "Copied all" : nextStep.secondary.label}
            </button>
          )}

          <button
            type="button"
            aria-disabled={actionDisabled}
            onClick={handlePrimaryClick}
            className={`btn-primary w-full py-2 text-sm sm:w-auto sm:py-2.5 md:py-3 ${
              actionDisabled ? "cursor-default opacity-70" : ""
            }`}
          >
            {nextStep.label}
          </button>
        </div>
      </div>
    </div>
  );
}
