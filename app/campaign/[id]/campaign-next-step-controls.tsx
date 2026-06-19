"use client";

import { tabForNextStepAction } from "@/app/campaign/[id]/campaign-workspace-tab";
import type { CampaignWorkspaceTab } from "@/app/campaign/[id]/campaign-workspace-tab";
import {
  getCampaignNextStep,
  scrollToCampaignSection,
  type CampaignNextStepButton,
  type NextStepAction,
} from "@/utils/campaign-progress";

export interface CampaignNextStepInput {
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
  isExportingAudio?: boolean;
  hasVoiceoverScripts?: boolean;
  isNativeApp: boolean;
  isSavingAllPhotos: boolean;
  saveAllPhotosProgress: { saved: number; total: number } | null;
  savedAllPhotos: boolean;
  copiedAllCaptions: boolean;
  videoExportReady?: boolean;
  hasVideoCredits?: boolean;
  hasVideoExport?: boolean;
  youtubeAlreadyPublished?: boolean;
  isExportingVideo?: boolean;
  onGenerateImages: () => void;
  onGenerateCaptions: () => void;
  onDownloadZip: () => void;
  onDownloadNarration: () => void;
  onCopyAllCaptions: () => void;
  onSaveAllToPhotos: () => void;
}

type NextStepHandlers = Pick<
  CampaignNextStepInput,
  | "onGenerateImages"
  | "onGenerateCaptions"
  | "onDownloadZip"
  | "onDownloadNarration"
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
    case "download_narration":
      handlers.onDownloadNarration();
      break;
    case "copy_captions":
      handlers.onCopyAllCaptions();
      break;
    case "save_all_photos":
      handlers.onSaveAllToPhotos();
      break;
    case "export_video":
    case "focus_youtube":
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

export function useCampaignNextStep(input: CampaignNextStepInput) {
  const nextStep = getCampaignNextStep({
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
    isExportingVideo: input.isExportingVideo,
  });

  const handlers: NextStepHandlers = {
    onGenerateImages: input.onGenerateImages,
    onGenerateCaptions: input.onGenerateCaptions,
    onDownloadZip: input.onDownloadZip,
    onDownloadNarration: input.onDownloadNarration,
    onCopyAllCaptions: input.onCopyAllCaptions,
    onSaveAllToPhotos: input.onSaveAllToPhotos,
  };

  const secondaryButtons =
    nextStep.secondaries ??
    (nextStep.secondary ? [nextStep.secondary] : []);

  const primaryLabel =
    nextStep.action === "copy_captions" && input.copiedAllCaptions
      ? "Copied all"
      : nextStep.action === "save_all_photos" && input.savedAllPhotos
        ? "Saved to Photos"
        : nextStep.label;

  const stepDescription = input.savedAllPhotos
    ? "Your slides are in Photos — open the Photos app to post."
    : nextStep.description;

  const actionDisabled = nextStep.disabled || nextStep.loading;

  return {
    nextStep,
    handlers,
    secondaryButtons,
    primaryLabel,
    stepDescription,
    actionDisabled,
    secondaryButtonLabel: (button: CampaignNextStepButton) =>
      secondaryButtonLabel(
        button,
        input.copiedAllCaptions,
        input.savedAllPhotos,
      ),
  };
}

interface CampaignNextStepControlsProps extends CampaignNextStepInput {
  layout: "sticky" | "sheet";
  onTabChange?: (tab: CampaignWorkspaceTab) => void;
}

export default function CampaignNextStepControls({
  layout,
  onTabChange,
  ...input
}: CampaignNextStepControlsProps) {
  const {
    nextStep,
    handlers,
    secondaryButtons,
    primaryLabel,
    stepDescription,
    actionDisabled,
    secondaryButtonLabel: labelFor,
  } = useCampaignNextStep(input);

  function handleNavigate(action: NextStepAction) {
    if (layout === "sheet" && onTabChange) {
      onTabChange(tabForNextStepAction(action));
      return;
    }

    const scrollTarget =
      action === "export_video"
        ? "section-publish-video"
        : action === "focus_youtube"
          ? "section-youtube-publish"
          : action === "copy_captions" ||
              action === "generate_captions" ||
              action === "download_zip" ||
              action === "download_narration"
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

  const isSheet = layout === "sheet";

  return (
    <>
      <div className="min-w-0">
        {!isSheet && (
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary sm:text-xs">
            Next step
          </p>
        )}
        <p
          className={`font-medium leading-snug text-foreground ${
            isSheet
              ? "text-sm"
              : "mt-0.5 line-clamp-2 text-xs sm:mt-1 sm:line-clamp-none sm:text-sm"
          }`}
        >
          {stepDescription}
        </p>
      </div>

      <div
        className={`flex shrink-0 gap-2 ${
          isSheet
            ? "w-full flex-col"
            : "flex-col sm:flex-row sm:flex-wrap sm:gap-3 md:justify-end"
        }`}
      >
        {secondaryButtons.map((button) => (
          <button
            key={button.action}
            type="button"
            disabled={button.disabled || button.loading}
            onClick={() => handleSecondaryClick(button)}
            className={`inline-flex items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 ${
              isSheet ? "w-full" : "w-full sm:w-auto sm:px-5 sm:py-2.5 md:py-3"
            }`}
          >
            {labelFor(button)}
          </button>
        ))}

        <button
          type="button"
          aria-disabled={actionDisabled}
          onClick={handlePrimaryClick}
          className={`btn-primary py-2.5 text-sm ${
            isSheet ? "w-full" : "w-full sm:w-auto sm:py-2.5 md:py-3"
          } ${actionDisabled ? "cursor-default opacity-70" : ""}`}
        >
          {primaryLabel}
        </button>
      </div>
    </>
  );
}
