"use client";

import {
  getCampaignNextStep,
  scrollToCampaignSection,
  type CampaignNextStep,
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

function secondaryScrollTarget(action: NextStepAction): string {
  if (action === "copy_captions") {
    return "section-publish";
  }

  return "section-slides";
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

  function handlePrimaryClick() {
    scrollToCampaignSection(nextStep.scrollTargetId);
    if (!actionDisabled) {
      runNextStepAction(nextStep.action, handlers);
    }
  }

  function handleSecondaryClick(button: CampaignNextStepButton) {
    scrollToCampaignSection(secondaryScrollTarget(button.action));
    if (!button.disabled && !button.loading) {
      runNextStepAction(button.action, handlers);
    }
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

  return (
    <div className="sticky top-0 z-40 -mx-4 border-b border-border bg-background/95 px-4 py-2 backdrop-blur-sm sm:-mx-6 sm:px-6 sm:py-2.5 md:top-[4.5rem] md:-mx-10 md:px-10 md:py-3">
      <div className="flex flex-col gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 sm:gap-3 sm:rounded-2xl sm:p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary sm:text-xs">
            Next step
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs font-medium leading-snug text-foreground sm:mt-1 sm:line-clamp-none sm:text-sm">
            {stepDescription}
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3 md:justify-end">
          {secondaryButtons.map((button) => (
            <button
              key={button.action}
              type="button"
              disabled={button.disabled || button.loading}
              onClick={() => handleSecondaryClick(button)}
              className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-5 sm:py-2.5 md:py-3"
            >
              {secondaryButtonLabel(button, copiedAllCaptions, savedAllPhotos)}
            </button>
          ))}

          <button
            type="button"
            aria-disabled={actionDisabled}
            onClick={handlePrimaryClick}
            className={`btn-primary w-full py-2 text-sm sm:w-auto sm:py-2.5 md:py-3 ${
              actionDisabled ? "cursor-default opacity-70" : ""
            }`}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
