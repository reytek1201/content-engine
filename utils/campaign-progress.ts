export type CampaignProgressStepId = "copy" | "images" | "captions" | "export";

export interface CampaignProgressInput {
  slideCount: number;
  imagesReadyCount: number;
  imagesComplete: boolean;
  isGeneratingImages: boolean;
  captionsCount: number;
}

export interface CampaignProgressStep {
  id: CampaignProgressStepId;
  label: string;
  complete: boolean;
  current: boolean;
  detail?: string;
  scrollTargetId: string;
}

export type NextStepAction =
  | "generate_images"
  | "generate_captions"
  | "export_video"
  | "focus_youtube"
  | "download_zip"
  | "download_narration"
  | "copy_captions"
  | "save_all_photos";

export interface CampaignNextStepButton {
  action: NextStepAction;
  label: string;
  disabled: boolean;
  loading: boolean;
}

export interface CampaignNextStep {
  action: NextStepAction;
  label: string;
  description: string;
  disabled: boolean;
  loading: boolean;
  scrollTargetId: string;
  /** @deprecated Use `secondaries` */
  secondary?: CampaignNextStepButton;
  secondaries?: CampaignNextStepButton[];
}

export function formatImageProgressLabel(
  imagesReadyCount: number,
  slideCount: number
): string {
  return `${imagesReadyCount} of ${slideCount} images ready`;
}

export function formatSlidesImageStatus(options: {
  slideCount: number;
  imagesReadyCount: number;
  imagesComplete: boolean;
  isGeneratingImages: boolean;
}): string {
  const { slideCount, imagesReadyCount, imagesComplete, isGeneratingImages } =
    options;

  if (imagesComplete) {
    return "All images ready";
  }

  if (isGeneratingImages || imagesReadyCount > 0) {
    return formatImageProgressLabel(imagesReadyCount, slideCount);
  }

  return "Ready for image generation";
}

export function getCampaignProgressSteps(
  input: CampaignProgressInput
): CampaignProgressStep[] {
  const copyComplete = input.slideCount > 0;
  const captionsComplete = input.captionsCount > 0;
  const exportReady = input.imagesComplete;

  let currentStep: CampaignProgressStepId = "copy";
  if (copyComplete && !input.imagesComplete) {
    currentStep = "images";
  } else if (copyComplete && input.imagesComplete && !captionsComplete) {
    currentStep = "captions";
  } else if (copyComplete && input.imagesComplete && captionsComplete) {
    currentStep = "export";
  }

  const imagesDetail = input.imagesComplete
    ? "All ready"
    : input.isGeneratingImages || input.imagesReadyCount > 0
      ? formatImageProgressLabel(input.imagesReadyCount, input.slideCount)
      : undefined;

  return [
    {
      id: "copy",
      label: "Copy",
      complete: copyComplete,
      current: currentStep === "copy",
      scrollTargetId: "section-slides",
    },
    {
      id: "images",
      label: "Images",
      complete: input.imagesComplete,
      current: currentStep === "images",
      detail: imagesDetail,
      scrollTargetId: "section-slides",
    },
    {
      id: "captions",
      label: "Captions",
      complete: captionsComplete,
      current: currentStep === "captions",
      scrollTargetId: "section-publish",
    },
    {
      id: "export",
      label: "Export",
      complete: exportReady && captionsComplete,
      current: currentStep === "export",
      detail:
        currentStep === "export"
          ? captionsComplete
            ? "Video & post"
            : "Needs captions"
          : undefined,
      scrollTargetId: "section-publish",
    },
  ];
}

export function getCampaignNextStep(options: {
  slideCount: number;
  imagesReadyCount: number;
  imagesComplete: boolean;
  canGenerateImages: boolean;
  isGeneratingImages: boolean;
  isStartingImages: boolean;
  captionsCount: number;
  canGenerateCaptions: boolean;
  isGeneratingCaptions: boolean;
  isExporting: boolean;
  isExportingAudio?: boolean;
  hasVoiceoverScripts?: boolean;
  isNativeApp?: boolean;
  isSavingAllPhotos?: boolean;
  saveAllPhotosProgress?: { saved: number; total: number } | null;
  videoExportReady?: boolean;
  hasVideoCredits?: boolean;
  hasVideoExport?: boolean;
  youtubeAlreadyPublished?: boolean;
  isExportingVideo?: boolean;
}): CampaignNextStep {
  const {
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
    isExportingAudio = false,
    hasVoiceoverScripts = false,
    isNativeApp = false,
    isSavingAllPhotos = false,
    saveAllPhotosProgress = null,
    videoExportReady = false,
    hasVideoCredits = false,
    hasVideoExport = false,
    youtubeAlreadyPublished = false,
    isExportingVideo = false,
  } = options;

  const imageProgressLabel = formatImageProgressLabel(
    imagesReadyCount,
    slideCount
  );

  if (!imagesComplete && canGenerateImages) {
    return {
      action: "generate_images",
      label: isStartingImages ? "Starting…" : "Generate images",
      description: "Review slide copy, then generate visuals for every slide.",
      disabled: isStartingImages,
      loading: isStartingImages,
      scrollTargetId: "section-slides",
    };
  }

  if (!imagesComplete && (isGeneratingImages || isStartingImages)) {
    return {
      action: "generate_images",
      label: `Generating images… (${imagesReadyCount}/${slideCount})`,
      description: imageProgressLabel,
      disabled: true,
      loading: true,
      scrollTargetId: "section-slides",
    };
  }

  if (imagesComplete && captionsCount === 0) {
    const saveAllLabel = isSavingAllPhotos
      ? saveAllPhotosProgress
        ? `Saving… (${saveAllPhotosProgress.saved}/${saveAllPhotosProgress.total})`
        : "Saving to Photos…"
      : "Save all to Photos";

    return {
      action: "generate_captions",
      label: isGeneratingCaptions ? "Generating captions…" : "Generate captions",
      description: isNativeApp
        ? "Create post copy, or save all slide images to your camera roll now."
        : "Create TikTok, Instagram, and YouTube post copy from your slides.",
      disabled: !canGenerateCaptions || isGeneratingCaptions,
      loading: isGeneratingCaptions,
      scrollTargetId: "section-publish",
      secondaries: isNativeApp
        ? [
            {
              action: "save_all_photos",
              label: saveAllLabel,
              disabled: isSavingAllPhotos,
              loading: isSavingAllPhotos,
            },
          ]
        : undefined,
    };
  }

  if (imagesComplete && captionsCount > 0) {
    const narrationSecondary: CampaignNextStepButton | null = hasVoiceoverScripts
      ? {
          action: "download_narration",
          label: isExportingAudio ? "Generating narration…" : "Download narration",
          disabled: isExportingAudio,
          loading: isExportingAudio,
        }
      : null;

    const copyCaptionsSecondary: CampaignNextStepButton = {
      action: "copy_captions",
      label: "Copy all captions",
      disabled: false,
      loading: false,
    };

    const downloadZipSecondary: CampaignNextStepButton = {
      action: "download_zip",
      label: isExporting ? "Preparing zip…" : isNativeApp ? "Share zip" : "Download zip",
      disabled: isExporting,
      loading: isExporting,
    };

    if (
      !isNativeApp &&
      videoExportReady &&
      hasVideoCredits &&
      !hasVideoExport &&
      !youtubeAlreadyPublished
    ) {
      const secondaries: CampaignNextStepButton[] = [
        copyCaptionsSecondary,
        downloadZipSecondary,
      ];

      if (narrationSecondary) {
        secondaries.push(narrationSecondary);
      }

      return {
        action: "export_video",
        label: isExportingVideo ? "Exporting video…" : "Export 9:16 video",
        description:
          "Export your Quick Reel next — required before posting to YouTube Shorts.",
        disabled: isExportingVideo,
        loading: isExportingVideo,
        scrollTargetId: "section-publish-video",
        secondaries,
      };
    }

    if (
      !isNativeApp &&
      hasVideoExport &&
      !youtubeAlreadyPublished
    ) {
      const secondaries: CampaignNextStepButton[] = [
        copyCaptionsSecondary,
        downloadZipSecondary,
      ];

      if (narrationSecondary) {
        secondaries.push(narrationSecondary);
      }

      return {
        action: "focus_youtube",
        label: "Post to YouTube Shorts",
        description:
          "Your video export is ready — connect YouTube if needed, then post below.",
        disabled: false,
        loading: false,
        scrollTargetId: "section-youtube-publish",
        secondaries,
      };
    }

    if (isNativeApp) {
      const saveAllLabel = isSavingAllPhotos
        ? saveAllPhotosProgress
          ? `Saving… (${saveAllPhotosProgress.saved}/${saveAllPhotosProgress.total})`
          : "Saving to Photos…"
        : "Save all to Photos";

      const secondaries: CampaignNextStepButton[] = [
        {
          action: "copy_captions",
          label: "Copy all captions",
          disabled: false,
          loading: false,
        },
        {
          action: "download_zip",
          label: isExporting ? "Preparing zip…" : "Share zip",
          disabled: isExporting,
          loading: isExporting,
        },
      ];

      if (narrationSecondary) {
        secondaries.push(narrationSecondary);
      }

      return {
        action: "save_all_photos",
        label: saveAllLabel,
        description:
          "Slides and captions are ready — save images, copy post text, or export.",
        disabled: isSavingAllPhotos,
        loading: isSavingAllPhotos,
        scrollTargetId: "section-publish",
        secondaries,
      };
    }

    const secondaries: CampaignNextStepButton[] = [downloadZipSecondary];

    if (narrationSecondary) {
      secondaries.push(narrationSecondary);
    }

    return {
      action: "copy_captions",
      label: "Copy all captions",
      description: youtubeAlreadyPublished
        ? "Posted to YouTube — copy captions or download assets below."
        : "Post copy is ready — copy captions or download assets below.",
      disabled: false,
      loading: false,
      scrollTargetId: "section-publish",
      secondaries,
    };
  }

  return {
    action: "generate_images",
    label: "Generate images",
    description: imageProgressLabel,
    disabled: true,
    loading: false,
    scrollTargetId: "section-slides",
  };
}

export const CAMPAIGN_NEXT_STEP_BAR_ID = "campaign-next-step-bar";

export function scrollToCampaignSection(
  sectionId: string,
  options?: { behavior?: ScrollBehavior },
) {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: options?.behavior ?? "smooth",
    block: "start",
  });
}

export function scrollToSlideCard(slideId: string) {
  document.getElementById(`slide-card-${slideId}`)?.scrollIntoView({
    behavior: "auto",
    block: "nearest",
  });
}

export function scrollToCampaignNextStep() {
  document.getElementById(CAMPAIGN_NEXT_STEP_BAR_ID)?.scrollIntoView({
    behavior: "auto",
    block: "start",
  });
}

export function scrollToCampaignTop() {
  document.getElementById("campaign-workspace-top")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}
