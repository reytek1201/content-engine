/** Client-side stages shown in the video export overlay. */
export type VideoExportUiStage =
  | "preparing"
  | "compose_slides"
  | "merge_audio"
  | "downloading";

export const VIDEO_EXPORT_UI_STAGES: VideoExportUiStage[] = [
  "preparing",
  "compose_slides",
  "merge_audio",
  "downloading",
];

export const VIDEO_EXPORT_STAGE_LABELS: Record<VideoExportUiStage, string> = {
  preparing: "Preparing",
  compose_slides: "Transitions",
  merge_audio: "Adding voiceover",
  downloading: "Downloading video",
};

export const VIDEO_EXPORT_STAGE_DESCRIPTIONS: Record<
  VideoExportUiStage,
  string
> = {
  preparing: "Synthesizing narration and preparing slide timing…",
  compose_slides: "Applying crossfade transitions between slides…",
  merge_audio: "Merging AI narration into your video…",
  downloading: "Saving your MP4 — almost done…",
};

export const VIDEO_EXPORT_POLL_TIMEOUT_MS = 10 * 60_000;

export function mapPipelineStageToUiStage(
  stage: string | null | undefined,
): VideoExportUiStage {
  if (stage === "merge_audio") {
    return "merge_audio";
  }

  if (
    stage === "compose_slides" ||
    stage === "images_to_video" ||
    stage === "burn_captions"
  ) {
    return "compose_slides";
  }

  return "preparing";
}

export function getVideoExportStageIndex(stage: VideoExportUiStage): number {
  return VIDEO_EXPORT_UI_STAGES.indexOf(stage);
}

export type VideoExportStepState = "done" | "active" | "pending";

export function getVideoExportStepState(
  step: VideoExportUiStage,
  currentStage: VideoExportUiStage,
): VideoExportStepState {
  const stepIndex = getVideoExportStageIndex(step);
  const currentIndex = getVideoExportStageIndex(currentStage);

  if (stepIndex < currentIndex) {
    return "done";
  }

  if (stepIndex === currentIndex) {
    return "active";
  }

  return "pending";
}
