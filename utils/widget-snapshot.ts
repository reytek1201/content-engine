import type { CampaignListStatusId } from "@/utils/campaign-list-status";
import {
  formatCampaignDetailsProgress,
  formatCampaignGenerationStatus,
} from "@/utils/campaign-status-display";
import {
  getCampaignJourney,
  type CampaignJourneyInput,
  type CampaignJourneyStepId,
} from "@/utils/campaign-progress";
import {
  WIDGET_SNAPSHOT_SCHEMA_VERSION,
  type WidgetJourneyStepId,
  type WidgetSnapshot,
} from "@/types/widget-snapshot";
import {
  buildCampaignWidgetDeepLink,
  buildNewCampaignWidgetDeepLink,
} from "@/utils/native-app-deep-link";

const JOURNEY_STEP_ORDER: CampaignJourneyStepId[] = [
  "copy",
  "images",
  "captions",
  "video",
  "publish",
];

const DONE_LIST_STATUS_IDS = new Set<CampaignListStatusId>([
  "published",
  "on_youtube",
  "on_tiktok",
  "on_instagram",
]);

function nowIso(): string {
  return new Date().toISOString();
}

function countCompletedJourneySteps(
  journeyStep: WidgetJourneyStepId,
  journeyStepsComplete?: number,
): number {
  if (typeof journeyStepsComplete === "number") {
    return Math.max(0, Math.min(5, journeyStepsComplete));
  }

  if (journeyStep === "done") {
    return 5;
  }

  const currentIndex = JOURNEY_STEP_ORDER.indexOf(
    journeyStep as CampaignJourneyStepId,
  );

  return currentIndex >= 0 ? currentIndex : 0;
}

function widgetJourneyStepFromListStatus(input: {
  listStatusId: CampaignListStatusId;
  campaignStatus: string;
}): WidgetJourneyStepId {
  if (DONE_LIST_STATUS_IDS.has(input.listStatusId)) {
    return "done";
  }

  if (input.campaignStatus === "generating_text") {
    return "copy";
  }

  if (
    input.listStatusId === "generating" ||
    input.listStatusId === "needs_images"
  ) {
    return "images";
  }

  if (input.listStatusId === "needs_captions") {
    return "captions";
  }

  if (input.listStatusId === "needs_video") {
    return "video";
  }

  return "publish";
}

function widgetJourneyStepFromJourney(
  steps: ReturnType<typeof getCampaignJourney>["steps"],
): WidgetJourneyStepId {
  const current = steps.find((step) => step.status === "current");

  if (!current) {
    return "done";
  }

  return current.id;
}

function nextStepLabelFromJourney(
  journey: ReturnType<typeof getCampaignJourney>,
): string {
  if (journey.isFullyComplete) {
    return "Open in SlidePress";
  }

  if (journey.primary?.loading) {
    return journey.primary.label;
  }

  return journey.primary?.label ?? "Continue";
}

function statusLineForListEntry(input: {
  campaignStatus: string;
  slideCount: number;
  imagesReadyCount: number;
  imagesComplete: boolean;
  captionsCount: number;
  hasVideoExport: boolean;
  youtubePublished: boolean;
  tiktokPublished: boolean;
  instagramPublished: boolean;
}): string {
  if (
    input.campaignStatus === "generating_text" ||
    input.campaignStatus === "generating_images"
  ) {
    return formatCampaignGenerationStatus(input.campaignStatus);
  }

  return formatCampaignDetailsProgress({
    slideCount: input.slideCount,
    imagesReadyCount: input.imagesReadyCount,
    imagesComplete: input.imagesComplete,
    captionsCount: input.captionsCount,
    hasVideoExport: input.hasVideoExport,
    youtubeAlreadyPublished: input.youtubePublished,
    tiktokAlreadyPublished: input.tiktokPublished,
    instagramAlreadyPublished: input.instagramPublished,
  });
}

function buildSnapshotBase(input: {
  campaignId: string | null;
  title: string;
  statusLine: string;
  nextStepLabel: string;
  journeyStep: WidgetJourneyStepId;
  journeyStepsComplete?: number;
  isGenerating: boolean;
  deepLink: string;
  signedOut?: boolean;
}): WidgetSnapshot {
  return {
    schemaVersion: WIDGET_SNAPSHOT_SCHEMA_VERSION,
    updatedAt: nowIso(),
    signedOut: input.signedOut ?? false,
    campaignId: input.campaignId,
    title: input.title,
    statusLine: input.statusLine,
    nextStepLabel: input.nextStepLabel,
    journeyStep: input.journeyStep,
    journeyStepsComplete: countCompletedJourneySteps(
      input.journeyStep,
      input.journeyStepsComplete,
    ),
    isGenerating: input.isGenerating,
    deepLink: input.deepLink,
  };
}

export function buildSignedOutWidgetSnapshot(): WidgetSnapshot {
  return buildSnapshotBase({
    signedOut: true,
    campaignId: null,
    title: "SlidePress",
    statusLine: "Sign in to continue",
    nextStepLabel: "Open SlidePress",
    journeyStep: "copy",
    journeyStepsComplete: 0,
    isGenerating: false,
    deepLink: "co.slidepress.app://login",
  });
}

export function buildEmptyWidgetSnapshot(): WidgetSnapshot {
  return buildSnapshotBase({
    campaignId: null,
    title: "SlidePress",
    statusLine: "No active campaigns",
    nextStepLabel: "Create campaign",
    journeyStep: "copy",
    journeyStepsComplete: 0,
    isGenerating: false,
    deepLink: buildNewCampaignWidgetDeepLink(),
  });
}

export function buildWidgetSnapshotFromJourney(input: {
  campaignId: string;
  title: string;
  journeyInput: CampaignJourneyInput;
}): WidgetSnapshot {
  const journey = getCampaignJourney({
    ...input.journeyInput,
    isNativeApp: true,
  });
  const journeyStep = widgetJourneyStepFromJourney(journey.steps);
  const currentStep = journey.steps.find((step) => step.status === "current");
  const statusLine =
    currentStep?.detail ??
    journey.description ??
    journey.primary?.label ??
    "In progress";
  const nextStepLabel = nextStepLabelFromJourney(journey);
  const deepLink =
    journeyStep === "video" || journeyStep === "publish"
      ? buildCampaignWidgetDeepLink(input.campaignId, { tab: "publish" })
      : buildCampaignWidgetDeepLink(input.campaignId);

  return buildSnapshotBase({
    campaignId: input.campaignId,
    title: input.title,
    statusLine,
    nextStepLabel,
    journeyStep,
    journeyStepsComplete: journey.steps.filter((step) => step.status === "done")
      .length,
    isGenerating: Boolean(
      input.journeyInput.isGeneratingImages ||
        input.journeyInput.isStartingImages ||
        input.journeyInput.isGeneratingCaptions ||
        input.journeyInput.isExportingVideo,
    ),
    deepLink,
  });
}

export function buildWidgetSnapshotFromListEntry(input: {
  campaignId: string;
  title: string;
  campaignStatus: string;
  listStatusId: CampaignListStatusId;
  slideCount: number;
  imagesReadyCount: number;
  imagesComplete: boolean;
  captionsCount: number;
  hasVideoExport: boolean;
  youtubePublished: boolean;
  tiktokPublished: boolean;
  instagramPublished: boolean;
}): WidgetSnapshot {
  const journeyStep = widgetJourneyStepFromListStatus({
    listStatusId: input.listStatusId,
    campaignStatus: input.campaignStatus,
  });
  const statusLine = statusLineForListEntry(input);
  const nextStepLabel =
    journeyStep === "done"
      ? "Open in SlidePress"
      : input.listStatusId === "ready_to_post"
        ? "Ready to publish"
        : input.listStatusId === "needs_captions"
          ? "Generate captions"
          : input.listStatusId === "needs_images"
            ? "Generate images"
            : input.listStatusId === "needs_video"
              ? "Export video"
              : input.listStatusId === "generating"
                ? "Generating…"
                : "Continue";

  const deepLink =
    journeyStep === "video" || journeyStep === "publish"
      ? buildCampaignWidgetDeepLink(input.campaignId, { tab: "publish" })
      : buildCampaignWidgetDeepLink(input.campaignId);

  return buildSnapshotBase({
    campaignId: input.campaignId,
    title: input.title,
    statusLine,
    nextStepLabel,
    journeyStep,
    isGenerating:
      input.campaignStatus === "generating_text" ||
      input.campaignStatus === "generating_images" ||
      input.listStatusId === "generating",
    deepLink,
  });
}

export interface WidgetCampaignCandidate {
  id: string;
  title: string | null;
  topic: string;
  status: string;
  slide_count: number | null;
  slides: Array<{ slide_index: number; image_url: string | null }>;
  listStatusId: CampaignListStatusId;
  captionsCount: number;
  hasVideoExport: boolean;
  youtubePublished: boolean;
  tiktokPublished: boolean;
  instagramPublished: boolean;
}

export function pickCampaignForWidget(
  campaigns: WidgetCampaignCandidate[],
  preferredCampaignId?: string | null,
): WidgetCampaignCandidate | null {
  if (campaigns.length === 0) {
    return null;
  }

  const byId = new Map(campaigns.map((campaign) => [campaign.id, campaign]));

  if (preferredCampaignId) {
    const preferred = byId.get(preferredCampaignId);

    if (preferred && !DONE_LIST_STATUS_IDS.has(preferred.listStatusId)) {
      return preferred;
    }
  }

  const active = campaigns.find(
    (campaign) => !DONE_LIST_STATUS_IDS.has(campaign.listStatusId),
  );

  if (active) {
    return active;
  }

  if (preferredCampaignId && byId.has(preferredCampaignId)) {
    return byId.get(preferredCampaignId) ?? null;
  }

  return campaigns[0] ?? null;
}

export function buildWidgetSnapshotForCandidate(
  campaign: WidgetCampaignCandidate | null,
): WidgetSnapshot {
  if (!campaign) {
    return buildEmptyWidgetSnapshot();
  }

  const slideCount = campaign.slide_count ?? campaign.slides.length;
  const imagesReadyCount = campaign.slides.filter(
    (slide) => slide.image_url,
  ).length;

  return buildWidgetSnapshotFromListEntry({
    campaignId: campaign.id,
    title: campaign.title ?? campaign.topic,
    campaignStatus: campaign.status,
    listStatusId: campaign.listStatusId,
    slideCount,
    imagesReadyCount,
    imagesComplete: slideCount > 0 && imagesReadyCount >= slideCount,
    captionsCount: campaign.captionsCount,
    hasVideoExport: campaign.hasVideoExport,
    youtubePublished: campaign.youtubePublished,
    tiktokPublished: campaign.tiktokPublished,
    instagramPublished: campaign.instagramPublished,
  });
}
