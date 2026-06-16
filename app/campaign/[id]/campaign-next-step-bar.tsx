"use client";

import { tabForNextStepAction } from "@/app/campaign/[id]/campaign-workspace-tab";
import type { CampaignWorkspaceTab } from "@/app/campaign/[id]/campaign-workspace-tab";
import {
  CAMPAIGN_NEXT_STEP_BAR_ID,
  getCampaignNextStep,
  scrollToCampaignSection,
  type CampaignNextStepButton,
  type NextStepAction,
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
  isNativeApp: boolean;
  isSavingAllPhotos: boolean;
  saveAllPhotosProgress: { saved: number; total: number } | null;
  savedAllPhotos: boolean;
  copiedAllCaptions: boolean;
  onGenerateImages: () => void;
  onGenerateCaptions: () => void;
  onDownloadZip: () => void;
  onCopyAllCaptions: () => void;
  onSaveAllToPhotos: () => void;
  variant?: "sticky" | "fixed-bottom";
  onTabChange?: (tab: CampaignWorkspaceTab) => void;
}

type NextStepHandlers = Pick<
  CampaignNextStepBarProps,
  | "onGenerateImages"
  | "onGenerateCaptions"
  | "onDownloadZip"
  | "onCopyAllCaptions"
  | "onSaveAllToPhotos"
>;

function runNextStepAction(action: NextStepAction, handlers: NextStepHandlers) {
  switch (action) {
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
    case "save_all_photos":
      handlers.onSaveAllToPhotos();
      break;
  }
}

function secondaryButtonLabel(
  button: CampaignNextStepButton,
  copiedAllCaptions: boolean,
  savedAllPhotos: boolean,
): string {
  if (button.action === "copy_captions" && copiedAllCaptions) {
    return "Copied all";
  }

  if (button.action === "save_all_photos" && savedAllPhotos) {
    return "Saved to Photos";
  }

  return button.label;
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
    isNativeApp,
    isSavingAllPhotos,
    saveAllPhotosProgress,
    savedAllPhotos,
    copiedAllCaptions,
    onGenerateImages,
    onGenerateCaptions,
    onDownloadZip,
    onCopyAllCaptions,
    onSaveAllToPhotos,
    variant = "sticky",
    onTabChange,
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
    isNativeApp,
    isSavingAllPhotos,
    saveAllPhotosProgress,
  });

  const handlers: NextStepHandlers = {
    onGenerateImages,
    onGenerateCaptions,
    onDownloadZip,
    onCopyAllCaptions,
    onSaveAllToPhotos,
  };

  const secondaryButtons =
    nextStep.secondaries ??
    (nextStep.secondary ? [nextStep.secondary] : []);

  const actionDisabled = nextStep.disabled || nextStep.loading;
  const isFixedBottom = variant === "fixed-bottom";

  function handleNavigate(action: NextStepAction) {
    if (isFixedBottom && onTabChange) {
      onTabChange(tabForNextStepAction(action));
      return;
    }

    const scrollTarget =
      action === "copy_captions" || action === "generate_captions"
        ? "section-publish"
        : "section-slides";

    scrollToCampaignSection(scrollTarget);
  }

  function handlePrimaryClick() {
    if (actionDisabled) {
      return;
    }

    handleNavigate(nextStep.action);
    runNextStepAction(nextStep.action, handlers);
  }

  function handleSecondaryClick(button: CampaignNextStepButton) {
    if (button.disabled || button.loading) {
      return;
    }

    handleNavigate(button.action);
    runNextStepAction(button.action, handlers);
  }

  const primaryLabel =
    nextStep.action === "copy_captions" && copiedAllCaptions
      ? "Copied all"
      : nextStep.action === "save_all_photos" && savedAllPhotos
        ? "Saved to Photos"
        : nextStep.label;

  const stepDescription = savedAllPhotos
    ? "Your slides are in Photos — open the Photos app to post."
    : nextStep.description;

  const wrapperClassName = isFixedBottom
    ? "fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-40 border-t border-border bg-background px-4 py-2"
    : "sticky top-0 z-40 -mx-4 border-b border-border bg-background px-4 py-2 sm:-mx-6 sm:px-6 sm:py-2.5 md:top-[4.5rem] md:-mx-10 md:px-10 md:py-3";

  const panelClassName = isFixedBottom
    ? "flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3"
    : "flex flex-col gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 sm:gap-3 sm:rounded-2xl sm:p-4 md:flex-row md:items-center md:justify-between md:p-5";

  return (
    <div id={CAMPAIGN_NEXT_STEP_BAR_ID} className={wrapperClassName}>
      <div className={panelClassName}>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary sm:text-xs">
            Next step
          </p>
          <p
            className={`mt-0.5 font-medium leading-snug text-foreground ${
              isFixedBottom
                ? "line-clamp-1 text-xs"
                : "line-clamp-2 text-xs sm:mt-1 sm:line-clamp-none sm:text-sm"
            }`}
          >
            {stepDescription}
          </p>
        </div>

        <div
          className={`flex shrink-0 gap-2 ${
            isFixedBottom
              ? "flex-row flex-wrap"
              : "flex-col sm:flex-row sm:flex-wrap sm:gap-3 md:justify-end"
          }`}
        >
          {secondaryButtons.map((button) => (
            <button
              key={button.action}
              type="button"
              disabled={button.disabled || button.loading}
              onClick={() => handleSecondaryClick(button)}
              className={`inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 ${
                isFixedBottom ? "flex-1" : "w-full sm:w-auto sm:px-5 sm:py-2.5 md:py-3"
              }`}
            >
              {secondaryButtonLabel(button, copiedAllCaptions, savedAllPhotos)}
            </button>
          ))}

          <button
            type="button"
            aria-disabled={actionDisabled}
            onClick={handlePrimaryClick}
            className={`btn-primary py-2 text-sm ${
              isFixedBottom ? "flex-1" : "w-full sm:w-auto sm:py-2.5 md:py-3"
            } ${actionDisabled ? "cursor-default opacity-70" : ""}`}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
