export type CampaignJourneyStepId =
  | "copy"
  | "images"
  | "captions"
  | "video"
  | "publish";

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
  | "focus_publish"
  | "view_youtube"
  | "view_tiktok"
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
  tiktokAlreadyPublished?: boolean;
  tiktokProfileUrl?: string | null;
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
  tiktokProfileUrl: string | null;
}

export function isAnyPlatformPublished(input: {
  youtubeAlreadyPublished?: boolean;
  tiktokAlreadyPublished?: boolean;
}): boolean {
  return Boolean(input.youtubeAlreadyPublished || input.tiktokAlreadyPublished);
}

export function formatPublishedPlatformsDescription(input: {
  youtubeAlreadyPublished?: boolean;
  tiktokAlreadyPublished?: boolean;
}): string {
  const platforms: string[] = [];

  if (input.youtubeAlreadyPublished) {
    platforms.push("YouTube");
  }

  if (input.tiktokAlreadyPublished) {
    platforms.push("TikTok");
  }

  if (platforms.length === 0) {
    return "Post copy is ready — copy captions or download assets below.";
  }

  if (platforms.length === 1) {
    return `Posted to ${platforms[0]} — copy captions or download assets anytime.`;
  }

  return `Posted to ${platforms.join(" and ")} — copy captions or download assets anytime.`;
}

export function isPlatformViewAction(action: NextStepAction): boolean {
  return action === "view_youtube" || action === "view_tiktok";
}

export function platformViewUrlForAction(
  action: NextStepAction,
  urls: {
    youtubeWatchUrl?: string | null;
    tiktokProfileUrl?: string | null;
  },
): string | null {
  if (action === "view_youtube") {
    return urls.youtubeWatchUrl ?? null;
  }

  if (action === "view_tiktok") {
    return urls.tiktokProfileUrl ?? null;
  }

  return null;
}

function buildPublishedViewButtons(input: {
  youtubeAlreadyPublished?: boolean;
  youtubeWatchUrl?: string | null;
  tiktokAlreadyPublished?: boolean;
  tiktokProfileUrl?: string | null;
}): {
  primary: CampaignNextStepButton | null;
  viewSecondaries: CampaignNextStepButton[];
} {
  const views: CampaignNextStepButton[] = [];

  if (input.youtubeAlreadyPublished && input.youtubeWatchUrl) {
    views.push({
      action: "view_youtube",
      label: "View on YouTube",
      disabled: false,
      loading: false,
    });
  }

  if (input.tiktokAlreadyPublished && input.tiktokProfileUrl) {
    views.push({
      action: "view_tiktok",
      label: "View on TikTok",
      disabled: false,
      loading: false,
    });
  }

  if (views.length === 1) {
    return { primary: views[0], viewSecondaries: [] };
  }

  return { primary: null, viewSecondaries: views };
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
  anyPlatformPublished: boolean;
}): CampaignJourneyStep[] {
  const copyDone = input.slideCount > 0;
  const imagesDone = input.imagesComplete;
  const captionsDone = input.captionsCount > 0;
  const videoDone = input.hasVideoExport;
  const publishDone = input.anyPlatformPublished;

  const stepCompletions: Record<CampaignJourneyStepId, boolean> = {
    copy: copyDone,
    images: imagesDone,
    captions: captionsDone,
    video: videoDone,
    publish: publishDone,
  };

  const order: CampaignJourneyStepId[] = [
    "copy",
    "images",
    "captions",
    "video",
    "publish",
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
    publish: "section-publish",
  };

  const labels: Record<CampaignJourneyStepId, string> = {
    copy: "Copy",
    images: "Images",
    captions: "Captions",
    video: "Video",
    publish: "Publish",
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
    tiktokAlreadyPublished = false,
    tiktokProfileUrl = null,
    isNativeApp = false,
  } = input;

  const copyDone = slideCount > 0;
  const captionsDone = captionsCount > 0;
  const anyPlatformPublished = isAnyPlatformPublished({
    youtubeAlreadyPublished,
    tiktokAlreadyPublished,
  });

  const isFullyComplete = isNativeApp
    ? copyDone && imagesComplete && captionsDone
    : anyPlatformPublished;

  const actions = buildJourneyActions(input);
  const journeyStepsInput = {
    slideCount,
    imagesReadyCount: input.imagesReadyCount,
    imagesComplete,
    isGeneratingImages: input.isGeneratingImages,
    captionsCount,
    hasVideoExport,
    anyPlatformPublished,
  };

  if (isFullyComplete) {
    const completeSecondaries: CampaignNextStepButton[] = [];
    const { primary, viewSecondaries } = buildPublishedViewButtons({
      youtubeAlreadyPublished,
      youtubeWatchUrl,
      tiktokAlreadyPublished,
      tiktokProfileUrl,
    });

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
      completeSecondaries.push(...viewSecondaries);
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
      steps: buildJourneySteps(journeyStepsInput),
      description: isNativeApp
        ? "Slides and captions are ready."
        : formatPublishedPlatformsDescription({
            youtubeAlreadyPublished,
            tiktokAlreadyPublished,
          }),
      primary,
      secondaries: completeSecondaries,
      isFullyComplete: true,
      youtubeWatchUrl,
      tiktokProfileUrl,
    };
  }

  return {
    steps: buildJourneySteps(journeyStepsInput),
    ...actions,
    isFullyComplete: false,
    youtubeWatchUrl,
    tiktokProfileUrl,
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
    .filter((step) => step.id !== "publish")
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
    tiktokAlreadyPublished = false,
    isExportingVideo = false,
  } = options;

  const anyPlatformPublished = isAnyPlatformPublished({
    youtubeAlreadyPublished,
    tiktokAlreadyPublished,
  });

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
      !anyPlatformPublished
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
          "Export your Quick Reel next — required before posting to platforms.",
        disabled: isExportingVideo,
        loading: isExportingVideo,
        scrollTargetId: "section-publish-video",
        secondaries,
      };
    }

    if (!isNativeApp && hasVideoExport && !anyPlatformPublished) {
      const secondaries: CampaignNextStepButton[] = [
        copyCaptionsSecondary,
        downloadZipSecondary,
      ];

      if (narrationSecondary) {
        secondaries.push(narrationSecondary);
      }

      return {
        action: "focus_publish",
        label: "Post to platforms",
        description:
          "Your video export is ready — post to YouTube, TikTok, or both below.",
        disabled: false,
        loading: false,
        scrollTargetId: "section-publish",
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
      description: anyPlatformPublished
        ? formatPublishedPlatformsDescription({
            youtubeAlreadyPublished,
            tiktokAlreadyPublished,
          })
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

  if (
    action === "focus_publish" ||
    action === "view_youtube" ||
    action === "view_tiktok"
  ) {
    return "section-publish";
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
