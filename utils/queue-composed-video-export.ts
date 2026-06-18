import {
  submitMergeAudioVideoQueue,
  uploadFalMedia,
  type VideoExportMetadata,
} from "@/utils/fal-video";
import { composeSlidesToVideo } from "@/utils/compose-slide-video";
import {
  includesVideoNarration,
  shouldBurnVideoCaptions,
} from "@/utils/complete-video-export";
import type { PrepareCampaignVideoResult } from "@/utils/prepare-campaign-video";
import type { AspectRatio } from "@/types/campaign";
import type { VideoExportPreset } from "@/utils/video-export-presets";
import type { VoiceQuality } from "@/utils/tts/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface QueueVideoExportInput {
  supabase: SupabaseClient;
  exportId: string;
  aspectRatio: AspectRatio;
  prepared: PrepareCampaignVideoResult;
  preset: VideoExportPreset;
  includeCaptions: boolean;
  voiceQuality: VoiceQuality;
  persona: string;
  webhookUrl: string;
}

export async function queueComposedVideoExport(
  input: QueueVideoExportInput,
): Promise<void> {
  const metadataForCaptions: VideoExportMetadata = {
    stage: "compose_slides",
    preset: input.preset,
    includeCaptions: input.includeCaptions,
  };
  const burnCaptionsOnSlides = shouldBurnVideoCaptions(metadataForCaptions);

  const slideClips = input.prepared.slideClips.map((clip, index) => ({
    ...clip,
    captionText: burnCaptionsOnSlides
      ? input.prepared.captionSegments[index]?.text
      : undefined,
  }));

  const composedBuffer = await composeSlidesToVideo(slideClips, {
    aspectRatio: input.aspectRatio,
    motion: true,
  });

  const silentVideoUrl = await uploadFalMedia(
    composedBuffer,
    "video/mp4",
    "campaign-video-composed.mp4",
  );

  const metadata: VideoExportMetadata = {
    stage: "merge_audio",
    preset: input.preset,
    includeCaptions: input.includeCaptions,
    voiceQuality: input.voiceQuality,
    persona: input.persona,
    audioUrl: input.prepared.audioUrl,
    captionSegments: input.prepared.captionSegments,
    captionsOnSlides: burnCaptionsOnSlides,
    silentVideoUrl,
  };

  if (includesVideoNarration(metadata)) {
    if (!input.prepared.audioUrl) {
      throw new Error("Missing narration audio URL for video merge");
    }

    const mergeRequestId = await submitMergeAudioVideoQueue(
      silentVideoUrl,
      input.prepared.audioUrl,
      input.webhookUrl,
    );

    const { error } = await input.supabase
      .from("exports")
      .update({
        fal_request_id: mergeRequestId,
        metadata: {
          ...metadata,
          stage: "merge_audio",
        },
      })
      .eq("id", input.exportId);

    if (error) {
      throw new Error("Failed to queue narration merge for video export");
    }

    return;
  }

  const { error } = await input.supabase
    .from("exports")
    .update({
      status: "completed",
      output_url: silentVideoUrl,
      error_message: null,
      fal_request_id: null,
      metadata: {
        ...metadata,
        stage: burnCaptionsOnSlides ? "burn_captions" : "merge_audio",
      },
    })
    .eq("id", input.exportId);

  if (error) {
    throw new Error("Failed to finalize silent video export");
  }
}
