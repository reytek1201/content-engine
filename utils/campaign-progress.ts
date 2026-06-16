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
  | "download_zip"
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
      scrollTargetId: "section-slides",
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
  isNativeApp?: boolean;
  isSavingAllPhotos?: boolean;
  saveAllPhotosProgress?: { saved: number; total: number } | null;
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
    isNativeApp = false,
    isSavingAllPhotos = false,
    saveAllPhotosProgress = null,
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
    if (isNativeApp) {
      const saveAllLabel = isSavingAllPhotos
        ? saveAllPhotosProgress
          ? `Saving… (${saveAllPhotosProgress.saved}/${saveAllPhotosProgress.total})`
          : "Saving to Photos…"
        : "Save all to Photos";

      return {
        action: "save_all_photos",
        label: saveAllLabel,
        description:
          "Slides and captions are ready — save images to Photos and post.",
        disabled: isSavingAllPhotos,
        loading: isSavingAllPhotos,
        scrollTargetId: "section-slides",
        secondaries: [
          {
            action: "copy_captions",
            label: "Copy all captions",
            disabled: false,
            loading: false,
          },
          {
            action: "download_zip",
            label: isExporting ? "Preparing zip…" : "Download zip",
            disabled: isExporting,
            loading: isExporting,
          },
        ],
      };
    }

    return {
      action: "download_zip",
      label: isExporting ? "Preparing zip…" : "Download zip",
      description: "Slides and captions are ready — export assets for posting.",
      disabled: isExporting,
      loading: isExporting,
      scrollTargetId: "section-slides",
      secondaries: [
        {
          action: "copy_captions",
          label: "Copy all captions",
          disabled: false,
          loading: false,
        },
      ],
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

export function scrollToCampaignSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export function scrollToCampaignTop() {
  document.getElementById("campaign-workspace-top")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}
