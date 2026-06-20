import type { AspectRatio } from "@/types/campaign";
import { formatAspectRatio } from "@/utils/campaign-display";
import type { VideoExportPreset } from "@/utils/video-export-presets";
import {
  VIDEO_EXPORT_STAGE_DESCRIPTIONS,
  VIDEO_EXPORT_STAGE_LABELS,
  VIDEO_EXPORT_UI_STAGES,
  getVideoExportStepState,
  type VideoExportUiStage,
} from "@/utils/video-export-stages";

export type CampaignOperationKind =
  | "captions"
  | "video_export"
  | "youtube_publish"
  | "tiktok_publish"
  | "narration"
  | "zip"
  | "format_variant";

export type CampaignOperationStepState = "done" | "active" | "pending";

export interface CampaignOperationStage {
  id: string;
  label: string;
}

export interface CampaignOperationMetadata {
  label: string;
  value: string;
}

export interface CampaignOperationOverlayModel {
  kind: CampaignOperationKind;
  kicker: string;
  description: string;
  durationHint: string;
  stages: CampaignOperationStage[];
  activeStageIndex: number;
  errorTitle: string;
  metadata?: CampaignOperationMetadata[];
}

function timeBasedStageIndex(elapsedSeconds: number, thresholds: number[]): number {
  for (let index = thresholds.length - 1; index >= 0; index -= 1) {
    if (elapsedSeconds >= thresholds[index]) {
      return index;
    }
  }

  return 0;
}

function getStepState(
  stageIndex: number,
  activeStageIndex: number,
): CampaignOperationStepState {
  if (stageIndex < activeStageIndex) {
    return "done";
  }

  if (stageIndex === activeStageIndex) {
    return "active";
  }

  return "pending";
}

export function getCampaignOperationStepState(
  stageIndex: number,
  activeStageIndex: number,
): CampaignOperationStepState {
  return getStepState(stageIndex, activeStageIndex);
}

export function resolveCampaignOperationOverlay(input: {
  kind: CampaignOperationKind;
  elapsedSeconds: number;
  videoStage?: VideoExportUiStage;
  videoPreset?: VideoExportPreset;
  aspectRatio?: AspectRatio;
  slideCount?: number;
}): CampaignOperationOverlayModel {
  const {
    kind,
    elapsedSeconds,
    videoStage = "preparing",
    videoPreset = "quick_reel",
    aspectRatio,
    slideCount,
  } = input;

  switch (kind) {
    case "captions":
      return {
        kind,
        kicker: "Writing post copy",
        description: "Creating hooks and captions for TikTok, Instagram, and YouTube Shorts.",
        durationHint: "This usually takes 30–60 seconds.",
        errorTitle: "Caption generation failed",
        stages: [
          { id: "slides", label: "Reading slide copy" },
          { id: "writing", label: "Writing platform captions" },
          { id: "finalize", label: "Finalizing" },
        ],
        activeStageIndex: timeBasedStageIndex(elapsedSeconds, [0, 8, 25]),
      };
    case "video_export": {
      const visibleStages = VIDEO_EXPORT_UI_STAGES.filter((step) => {
        if (step === "merge_audio" && videoPreset === "silent_captions") {
          return false;
        }

        return true;
      });

      const activeStageIndex = Math.max(
        0,
        visibleStages.findIndex(
          (step) => getVideoExportStepState(step, videoStage) === "active",
        ),
      );

      return {
        kind,
        kicker: "Rendering your video",
        description: VIDEO_EXPORT_STAGE_DESCRIPTIONS[videoStage],
        durationHint: "This usually takes 1–3 minutes.",
        errorTitle: "Video export failed",
        stages: visibleStages.map((step) => ({
          id: step,
          label: VIDEO_EXPORT_STAGE_LABELS[step],
        })),
        activeStageIndex,
        metadata:
          aspectRatio && slideCount !== undefined
            ? [
                { label: "Format", value: formatAspectRatio(aspectRatio) },
                { label: "Slides", value: String(slideCount) },
              ]
            : undefined,
      };
    }
    case "youtube_publish":
      return {
        kind,
        kicker: "Publishing to YouTube",
        description: "Uploading your Quick Reel and waiting for YouTube to finish processing.",
        durationHint: "This can take a few minutes.",
        errorTitle: "YouTube publish failed",
        stages: [
          { id: "upload", label: "Uploading video" },
          { id: "processing", label: "Processing on YouTube" },
          { id: "published", label: "Published" },
        ],
        activeStageIndex: timeBasedStageIndex(elapsedSeconds, [0, 20, 90]),
      };
    case "tiktok_publish":
      return {
        kind,
        kicker: "Publishing to TikTok",
        description: "Uploading your video and waiting for TikTok to finish processing.",
        durationHint: "This can take a few minutes.",
        errorTitle: "TikTok publish failed",
        stages: [
          { id: "upload", label: "Uploading video" },
          { id: "processing", label: "Processing on TikTok" },
          { id: "published", label: "Published" },
        ],
        activeStageIndex: timeBasedStageIndex(elapsedSeconds, [0, 20, 90]),
      };
    case "narration":
      return {
        kind,
        kicker: "Generating narration",
        description: "Synthesizing AI voiceover audio for every slide.",
        durationHint: "This usually takes 30–90 seconds.",
        errorTitle: "Narration export failed",
        stages: [
          { id: "prepare", label: "Preparing scripts" },
          { id: "synthesize", label: "Synthesizing audio" },
          { id: "package", label: "Packaging download" },
        ],
        activeStageIndex: timeBasedStageIndex(elapsedSeconds, [0, 10, 35]),
      };
    case "zip":
      return {
        kind,
        kicker: "Preparing download",
        description: "Bundling your slide images into a zip file.",
        durationHint: "This usually takes 15–45 seconds.",
        errorTitle: "Zip export failed",
        stages: [
          { id: "collect", label: "Collecting slide images" },
          { id: "package", label: "Creating zip file" },
        ],
        activeStageIndex: timeBasedStageIndex(elapsedSeconds, [0, 12]),
      };
    case "format_variant":
      return {
        kind,
        kicker: "Adding format",
        description: "Generating images for your second aspect ratio.",
        durationHint: "This usually takes 1–2 minutes.",
        errorTitle: "Format generation failed",
        stages: [
          { id: "start", label: "Starting generation" },
          { id: "images", label: "Creating vertical images" },
          { id: "finish", label: "Finishing up" },
        ],
        activeStageIndex: timeBasedStageIndex(elapsedSeconds, [0, 8, 40]),
      };
  }
}

export function pickActiveCampaignOperation(input: {
  videoExportError: string | null;
  isExportingVideo: boolean;
  isPublishingYouTube: boolean;
  isPublishingTikTok: boolean;
  isGeneratingCaptions: boolean;
  isGeneratingFormat: boolean;
  isExportingAudio: boolean;
  isExporting: boolean;
}): CampaignOperationKind | null {
  if (input.videoExportError || input.isExportingVideo) {
    return "video_export";
  }

  if (input.isPublishingYouTube) {
    return "youtube_publish";
  }

  if (input.isPublishingTikTok) {
    return "tiktok_publish";
  }

  if (input.isGeneratingCaptions) {
    return "captions";
  }

  if (input.isGeneratingFormat) {
    return "format_variant";
  }

  if (input.isExportingAudio) {
    return "narration";
  }

  if (input.isExporting) {
    return "zip";
  }

  return null;
}
