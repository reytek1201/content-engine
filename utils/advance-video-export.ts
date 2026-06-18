import { createAdminClient } from "@/utils/supabase/admin";
import { buildFalWebhookUrl } from "@/utils/fal";
import {
  FAL_IMAGES_TO_VIDEO_MODEL,
  FAL_MERGE_AUDIO_VIDEO_MODEL,
  fetchFalVideoUrl,
  isFalQueueCompleted,
  parseVideoExportMetadata,
  submitMergeAudioVideoQueue,
  type VideoExportMetadata,
} from "@/utils/fal-video";
import {
  completeVideoExportWithCaptions,
  includesVideoNarration,
  shouldPostBurnVideoCaptions,
} from "@/utils/complete-video-export";
import { runComposeSlidesStage } from "@/utils/compose-video-export-stage";

interface ProcessingExportRow {
  id: string;
  fal_request_id: string | null;
  metadata: unknown;
  status: string;
  export_type: string;
}

async function markExportFailed(exportId: string, message: string): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from("exports")
    .update({
      status: "failed",
      error_message: message,
    })
    .eq("id", exportId);
}

async function completeBurnCaptionsStage(
  exportId: string,
  metadata: VideoExportMetadata,
  videoUrl: string,
): Promise<void> {
  const supabase = createAdminClient();

  try {
    const outputUrl = await completeVideoExportWithCaptions(metadata, videoUrl);

    await supabase
      .from("exports")
      .update({
        status: "completed",
        output_url: outputUrl,
        error_message: null,
        fal_request_id: null,
        metadata: {
          ...metadata,
          pendingVideoUrl: undefined,
        },
      })
      .eq("id", exportId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Caption burn-in failed";

    await markExportFailed(exportId, message);
    throw error;
  }
}

async function queueBurnCaptionsStage(
  exportId: string,
  metadata: VideoExportMetadata,
  videoUrl: string,
): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from("exports")
    .update({
      fal_request_id: null,
      metadata: {
        ...metadata,
        stage: "burn_captions",
        pendingVideoUrl: videoUrl,
        silentVideoUrl: metadata.silentVideoUrl ?? videoUrl,
      },
    })
    .eq("id", exportId);
}

async function completeVideoExport(
  exportId: string,
  metadata: VideoExportMetadata,
  videoUrl: string,
  deferBurn = false,
): Promise<void> {
  if (shouldPostBurnVideoCaptions(metadata)) {
    await queueBurnCaptionsStage(exportId, metadata, videoUrl);
    if (!deferBurn) {
      await completeBurnCaptionsStage(exportId, metadata, videoUrl);
    }
    return;
  }

  const supabase = createAdminClient();

  await supabase
    .from("exports")
    .update({
      status: "completed",
      output_url: videoUrl,
      error_message: null,
    })
    .eq("id", exportId);
}

/**
 * Advances in-flight video exports when Fal jobs finish or caption burn-in runs.
 */
export async function advanceVideoExportIfReady(
  exportRow: ProcessingExportRow,
  appBaseUrl: string,
): Promise<void> {
  if (exportRow.status !== "processing") return;
  if (exportRow.export_type !== "video") return;

  const metadata = parseVideoExportMetadata(exportRow.metadata);
  if (!metadata) return;

  if (metadata.stage === "burn_captions" && metadata.pendingVideoUrl) {
    await completeBurnCaptionsStage(
      exportRow.id,
      metadata,
      metadata.pendingVideoUrl,
    );
    return;
  }

  if (
    metadata.stage === "compose_slides" &&
    metadata.slideClips?.length &&
    !metadata.silentVideoUrl
  ) {
    await runComposeSlidesStage(exportRow.id, metadata, appBaseUrl);
    return;
  }

  if (!exportRow.fal_request_id) return;

  const model =
    metadata.stage === "images_to_video"
      ? FAL_IMAGES_TO_VIDEO_MODEL
      : FAL_MERGE_AUDIO_VIDEO_MODEL;

  const completed = await isFalQueueCompleted(model, exportRow.fal_request_id);
  if (!completed) return;

  const videoUrl = await fetchFalVideoUrl(model, exportRow.fal_request_id);
  if (!videoUrl) return;

  if (metadata.stage === "images_to_video") {
    if (!includesVideoNarration(metadata)) {
      await completeVideoExport(exportRow.id, metadata, videoUrl);
      return;
    }

    if (!metadata.audioUrl) return;

    const webhookUrl = buildFalWebhookUrl(appBaseUrl);
    const mergeRequestId = await submitMergeAudioVideoQueue(
      videoUrl,
      metadata.audioUrl,
      webhookUrl,
    );

    const nextMetadata: VideoExportMetadata = {
      ...metadata,
      stage: "merge_audio",
      silentVideoUrl: videoUrl,
    };

    const supabase = createAdminClient();

    await supabase
      .from("exports")
      .update({ fal_request_id: mergeRequestId, metadata: nextMetadata })
      .eq("id", exportRow.id);
  } else if (metadata.stage === "merge_audio") {
    await completeVideoExport(exportRow.id, metadata, videoUrl);
  }
}

export async function handleImagesToVideoComplete(
  exportId: string,
  metadata: VideoExportMetadata,
  videoUrl: string,
  appBaseUrl: string,
  deferBurn = false,
): Promise<void> {
  if (!includesVideoNarration(metadata)) {
    await completeVideoExport(exportId, metadata, videoUrl, deferBurn);
    return;
  }

  if (!metadata.audioUrl) {
    await markExportFailed(
      exportId,
      "Missing narration audio URL for video merge",
    );
    return;
  }

  const webhookUrl = buildFalWebhookUrl(appBaseUrl);
  const mergeRequestId = await submitMergeAudioVideoQueue(
    videoUrl,
    metadata.audioUrl,
    webhookUrl,
  );

  const nextMetadata: VideoExportMetadata = {
    ...metadata,
    stage: "merge_audio",
    silentVideoUrl: videoUrl,
  };

  const supabase = createAdminClient();

  await supabase
    .from("exports")
    .update({
      fal_request_id: mergeRequestId,
      metadata: nextMetadata,
    })
    .eq("id", exportId);
}

export async function handleMergeAudioComplete(
  exportId: string,
  metadata: VideoExportMetadata,
  videoUrl: string,
  deferBurn = false,
): Promise<void> {
  await completeVideoExport(exportId, metadata, videoUrl, deferBurn);
}
