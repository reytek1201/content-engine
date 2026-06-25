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
import { includesVideoNarration } from "@/utils/complete-video-export";
import { runComposeSlidesStage } from "@/utils/compose-video-export-stage";
import { burnCaptionsOnMergedVideo } from "@/utils/captions/prepare-burn-captions";
import { maybeSendVideoExportReadyPush } from "@/utils/send-campaign-push";

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

async function completeVideoExport(
  exportId: string,
  videoUrl: string,
): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from("exports")
    .update({
      status: "completed",
      output_url: videoUrl,
      error_message: null,
      fal_request_id: null,
    })
    .eq("id", exportId);

  await maybeSendVideoExportReadyPush(exportId);
}

async function finalizeMergedVideoExport(
  exportId: string,
  metadata: VideoExportMetadata,
  videoUrl: string,
): Promise<void> {
  if (!metadata.burnCaptions || !metadata.assStoragePath) {
    await completeVideoExport(exportId, videoUrl);
    return;
  }

  const supabase = createAdminClient();
  const burnStartedAt = Date.now();

  await supabase
    .from("exports")
    .update({
      metadata: {
        ...metadata,
        stage: "burn_captions",
        pendingVideoUrl: videoUrl,
      },
    })
    .eq("id", exportId);

  try {
    const burnedUrl = await burnCaptionsOnMergedVideo({
      exportId,
      videoUrl,
      assStoragePath: metadata.assStoragePath,
    });

    await completeVideoExport(exportId, burnedUrl);

    await supabase
      .from("exports")
      .update({
        metadata: {
          ...metadata,
          stage: "burn_captions",
          pendingVideoUrl: videoUrl,
          timingMs: {
            ...metadata.timingMs,
            ffmpegBurn: Date.now() - burnStartedAt,
          },
        },
      })
      .eq("id", exportId);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to burn captions into video";

    await markExportFailed(exportId, message);
  }
}

/**
 * Advances in-flight video exports when Fal jobs finish.
 */
export async function advanceVideoExportIfReady(
  exportRow: ProcessingExportRow,
  appBaseUrl: string,
): Promise<void> {
  if (exportRow.status !== "processing") return;
  if (exportRow.export_type !== "video") return;

  const metadata = parseVideoExportMetadata(exportRow.metadata);
  if (!metadata) return;

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
      await completeVideoExport(exportRow.id, videoUrl);
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
    await finalizeMergedVideoExport(exportRow.id, metadata, videoUrl);
  }
}

export async function handleImagesToVideoComplete(
  exportId: string,
  metadata: VideoExportMetadata,
  videoUrl: string,
  appBaseUrl: string,
): Promise<void> {
  if (!includesVideoNarration(metadata)) {
    await completeVideoExport(exportId, videoUrl);
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
): Promise<void> {
  await finalizeMergedVideoExport(exportId, metadata, videoUrl);
}
