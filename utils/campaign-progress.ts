export type CampaignJourneyStepId =
  | "copy"
  | "images"
  | "captions"
  | "video"
  | "youtube";

export type CampaignJourneyStepStatus = "done" | "current" | "locked";

export interface CampaignJourneyStep {
  id: CampaignJourneyStepId;
  label: string;
  status: CampaignJourneyStepStatus;
  scrollTargetId: string;
  detail?: string;
}

/** @deprecated Use `CampaignJourneyStepId` */
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

export interface CampaignJourneyInput {
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
  youtubeWatchUrl?: string | null;
  isExportingVideo?: boolean;
  copiedAllCaptions?: boolean;
  savedAllPhotos?: boolean;
}

export interface CampaignJourney {
  steps: CampaignJourneyStep[];
  description: string;
  primary: CampaignNextStepButton | null;
  secondaries: CampaignNextStepButton[];
  isFullyComplete: boolean;
  youtubeWatchUrl: string | null;
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

function buildJourneySteps(input: {
  slideCount: number;
  imagesReadyCount: number;
  imagesComplete: boolean;
  isGeneratingImages: boolean;
  captionsCount: number;
  hasVideoExport: boolean;
  youtubeAlreadyPublished: boolean;
}): CampaignJourneyStep[] {
  const copyDone = input.slideCount > 0;
  const imagesDone = input.imagesComplete;
  const captionsDone = input.captionsCount > 0;
  const videoDone = input.hasVideoExport;
  const youtubeDone = input.youtubeAlreadyPublished;

  const stepCompletions: Record<CampaignJourneyStepId, boolean> = {
    copy: copyDone,
    images: imagesDone,
    captions: captionsDone,
    video: videoDone,
    youtube: youtubeDone,
  };

  const order: CampaignJourneyStepId[] = [
    "copy",
    "images",
    "captions",
    "video",
    "youtube",
  ];

  const currentIndex = order.findIndex((id) => !stepCompletions[id]);

  const imagesDetail = input.imagesComplete
    ? undefined
    : input.isGeneratingImages || input.imagesReadyCount > 0
      ? formatImageProgressLabel(input.imagesReadyCount, input.slideCount)
      : undefined;

  const scrollTargets: Record<CampaignJourneyStepId, string> = {
    copy: "section-slides",
    images: "section-slides",
    captions: "section-publish-captions",
    video: "section-publish-video",
    youtube: "section-youtube-publish",
  };

  const labels: Record<CampaignJourneyStepId, string> = {
    copy: "Copy",
    images: "Images",
    captions: "Captions",
    video: "Video",
    youtube: "YouTube",
  };

  return order.map((id, index) => {
    const complete = stepCompletions[id];
    const isCurrent = currentIndex === index;
    const locked = !complete && index > currentIndex;

    const status: CampaignJourneyStepStatus = complete
      ? "done"
      : isCurrent
        ? "current"
        : locked
          ? "locked"
          : "current";

    return {
      id,
      label: labels[id],
      status,
      scrollTargetId: scrollTargets[id],
      detail: id === "images" && isCurrent ? imagesDetail : undefined,
    };
  });
}

function buildJourneyActions(
  options: CampaignJourneyInput,
): Pick<CampaignJourney, "description" | "primary" | "secondaries"> {
  const nextStep = getCampaignNextStepFromInput(options);

  return {
    description:
      options.savedAllPhotos && options.isNativeApp
        ? "Your slides are in Photos — open the Photos app to post."
        : nextStep.description,
    primary: {
      action: nextStep.action,
      label:
        nextStep.action === "copy_captions" && options.copiedAllCaptions
          ? "Copied all"
          : nextStep.action === "save_all_photos" && options.savedAllPhotos
            ? "Saved to Photos"
            : nextStep.label,
      disabled: nextStep.disabled,
      loading: nextStep.loading,
    },
    secondaries: (nextStep.secondaries ??
      (nextStep.secondary ? [nextStep.secondary] : [])
    ).map((button) => ({
      ...button,
      label:
        button.action === "copy_captions" && options.copiedAllCaptions
          ? "Copied all"
          : button.action === "save_all_photos" && options.savedAllPhotos
            ? "Saved to Photos"
            : button.label,
    })),
  };
}

export function getCampaignJourney(input: CampaignJourneyInput): CampaignJourney {
  const {
    slideCount,
    imagesComplete,
    captionsCount,
    hasVideoExport = false,
    youtubeAlreadyPublished = false,
    youtubeWatchUrl = null,
    isNativeApp = false,
  } = input;

  const copyDone = slideCount > 0;
  const captionsDone = captionsCount > 0;

  const isFullyComplete = isNativeApp
    ? copyDone && imagesComplete && captionsDone
    : youtubeAlreadyPublished;

  const actions = buildJourneyActions(input);

  if (isFullyComplete) {
    const completeSecondaries: CampaignNextStepButton[] = [];

    if (isNativeApp) {
      completeSecondaries.push({
        action: "copy_captions",
        label: input.copiedAllCaptions ? "Copied all" : "Copy all captions",
        disabled: false,
        loading: false,
      });
      completeSecondaries.push({
        action: "save_all_photos",
        label: input.savedAllPhotos ? "Saved to Photos" : "Save all to Photos",
        disabled: Boolean(input.isSavingAllPhotos),
        loading: Boolean(input.isSavingAllPhotos),
      });
    } else {
      completeSecondaries.push({
        action: "copy_captions",
        label: input.copiedAllCaptions ? "Copied all" : "Copy all captions",
        disabled: false,
        loading: false,
      });
      completeSecondaries.push({
        action: "download_zip",
        label: input.isExporting ? "Preparing zip…" : "Download zip",
        disabled: Boolean(input.isExporting),
        loading: Boolean(input.isExporting),
      });
    }

    return {
      steps: buildJourneySteps({
        slideCount,
        imagesReadyCount: input.imagesReadyCount,
        imagesComplete,
        isGeneratingImages: input.isGeneratingImages,
        captionsCount,
        hasVideoExport,
        youtubeAlreadyPublished,
      }),
      description: isNativeApp
        ? "Slides and captions are ready."
        : "Posted to YouTube — copy captions or download assets anytime.",
      primary: youtubeWatchUrl
        ? {
            action: "focus_youtube",
            label: "View on YouTube",
            disabled: false,
            loading: false,
          }
        : null,
      secondaries: completeSecondaries,
      isFullyComplete: true,
      youtubeWatchUrl,
    };
  }

  return {
    steps: buildJourneySteps({
      slideCount,
      imagesReadyCount: input.imagesReadyCount,
      imagesComplete,
      isGeneratingImages: input.isGeneratingImages,
      captionsCount,
      hasVideoExport,
      youtubeAlreadyPublished,
    }),
    ...actions,
    isFullyComplete: false,
    youtubeWatchUrl,
  };
}

/** @deprecated Use `getCampaignJourney` */
export function getCampaignProgressSteps(
  input: CampaignProgressInput
): CampaignProgressStep[] {
  const journey = getCampaignJourney({
    slideCount: input.slideCount,
    imagesReadyCount: input.imagesReadyCount,
    imagesComplete: input.imagesComplete,
    isGeneratingImages: input.isGeneratingImages,
    isStartingImages: false,
    captionsCount: input.captionsCount,
    canGenerateImages: false,
    canGenerateCaptions: false,
    isGeneratingCaptions: false,
    isExporting: false,
  });

  return journey.steps
    .filter((step) => step.id !== "youtube")
    .map((step) => ({
      id:
        step.id === "video"
          ? "export"
          : (step.id as Exclude<CampaignProgressStepId, "export">),
      label: step.id === "video" ? "Export" : step.label,
      complete: step.status === "done",
      current: step.status === "current",
      detail: step.detail,
      scrollTargetId: step.scrollTargetId,
    }));
}

function getCampaignNextStepFromInput(
  options: CampaignJourneyInput,
): CampaignNextStep {
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

/** @deprecated Use `getCampaignJourney` */
export function getCampaignNextStep(
  options: CampaignJourneyInput,
): CampaignNextStep {
  return getCampaignNextStepFromInput(options);
}

export const CAMPAIGN_JOURNEY_STRIP_ID = "campaign-journey-strip";

/** @deprecated Use `CAMPAIGN_JOURNEY_STRIP_ID` */
export const CAMPAIGN_NEXT_STEP_BAR_ID = CAMPAIGN_JOURNEY_STRIP_ID;

export function scrollTargetForNextStepAction(action: NextStepAction): string {
  if (action === "export_video") {
    return "section-publish-video";
  }

  if (action === "focus_youtube") {
    return "section-youtube-publish";
  }

  if (
    action === "copy_captions" ||
    action === "generate_captions" ||
    action === "download_zip" ||
    action === "download_narration"
  ) {
    return "section-publish";
  }

  return "section-slides";
}

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
  document.getElementById(CAMPAIGN_JOURNEY_STRIP_ID)?.scrollIntoView({
    behavior: "auto",
    block: "start",
  });
}

export function scrollToCampaignJourney() {
  scrollToCampaignNextStep();
}

export function scrollToCampaignTop() {
  document.getElementById("campaign-workspace-top")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}
