import { burnCaptionsOnVideo, fetchVideoBuffer } from "@/utils/burn-video-captions";
import type { CaptionSegment } from "@/utils/build-caption-srt";
import { uploadFalMedia } from "@/utils/fal-video";
import { presetBurnsCaptions } from "@/utils/video-export-presets";
import type { VideoExportPreset } from "@/utils/video-export-presets";

export interface FinalizeVideoExportInput {
  videoUrl: string;
  preset: VideoExportPreset;
  includeCaptions: boolean;
  captionSegments?: CaptionSegment[];
}

export async function finalizeVideoExport(
  input: FinalizeVideoExportInput,
): Promise<string> {
  const shouldBurnCaptions = presetBurnsCaptions(
    input.preset,
    input.includeCaptions,
  );

  if (!shouldBurnCaptions || !input.captionSegments?.length) {
    return input.videoUrl;
  }

  const videoBuffer = await fetchVideoBuffer(input.videoUrl);
  const captionedBuffer = await burnCaptionsOnVideo(
    videoBuffer,
    input.captionSegments,
  );

  return uploadFalMedia(captionedBuffer, "video/mp4", "campaign-video-captioned.mp4");
}
