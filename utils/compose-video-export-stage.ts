import type { AspectRatio } from "@/types/campaign";
import { buildFalWebhookUrl } from "@/utils/fal";
import {
  submitMergeAudioVideoQueue,
  uploadFalMedia,
  type StoredSlideClip,
  type VideoExportMetadata,
} from "@/utils/fal-video";
import { composeSlidesToVideo } from "@/utils/compose-slide-video";
import { includesVideoNarration } from "@/utils/complete-video-export";
import { createAdminClient } from "@/utils/supabase/admin";
import type { PrepareCampaignVideoResult } from "@/utils/prepare-campaign-video";

export function buildStoredSlideClips(
  prepared: PrepareCampaignVideoResult,
): StoredSlideClip[] {
  return prepared.slideClips.map((clip) => ({
    imageUrl: clip.imageUrl,
    durationSeconds: clip.durationSeconds,
  }));
}

export async function runComposeSlidesStage(
  exportId: string,
  metadata: VideoExportMetadata,
  appBaseUrl: string,
): Promise<void> {
  if (metadata.silentVideoUrl) {
    return;
  }

  if (metadata.composeStarted && !metadata.silentVideoUrl) {
    return;
  }

  if (!metadata.slideClips?.length || !metadata.aspectRatio) {
    throw new Error("Video export is missing slide compose data");
  }

  const supabase = createAdminClient();

  await supabase
    .from("exports")
    .update({
      metadata: {
        ...metadata,
        composeStarted: true,
      },
    })
    .eq("id", exportId);

  const composedBuffer = await composeSlidesToVideo(metadata.slideClips, {
    aspectRatio: metadata.aspectRatio,
  });

  const silentVideoUrl = await uploadFalMedia(
    composedBuffer,
    "video/mp4",
    "campaign-video-composed.mp4",
  );

  const nextMetadata: VideoExportMetadata = {
    ...metadata,
    silentVideoUrl,
    composeStarted: true,
  };

  if (includesVideoNarration(metadata)) {
    if (!metadata.audioUrl) {
      throw new Error("Missing narration audio URL for video merge");
    }

    const mergeRequestId = await submitMergeAudioVideoQueue(
      silentVideoUrl,
      metadata.audioUrl,
      buildFalWebhookUrl(appBaseUrl),
    );

    const { error } = await supabase
      .from("exports")
      .update({
        fal_request_id: mergeRequestId,
        metadata: {
          ...nextMetadata,
          stage: "merge_audio",
        },
      })
      .eq("id", exportId);

    if (error) {
      throw new Error("Failed to queue narration merge for video export");
    }

    return;
  }

  const { error } = await supabase
    .from("exports")
    .update({
      status: "completed",
      output_url: silentVideoUrl,
      error_message: null,
      fal_request_id: null,
      metadata: {
        ...nextMetadata,
        stage: "merge_audio",
      },
    })
    .eq("id", exportId);

  if (error) {
    throw new Error("Failed to finalize silent video export");
  }
}

export function buildComposeStageMetadata(input: {
  preset: VideoExportMetadata["preset"];
  voiceQuality: VideoExportMetadata["voiceQuality"];
  persona: string;
  aspectRatio: AspectRatio;
  prepared: PrepareCampaignVideoResult;
  slideClips: StoredSlideClip[];
}): VideoExportMetadata {
  return {
    stage: "compose_slides",
    preset: input.preset,
    voiceQuality: input.voiceQuality,
    persona: input.persona,
    aspectRatio: input.aspectRatio,
    audioUrl: input.prepared.audioUrl,
    slideClips: input.slideClips,
  };
}
