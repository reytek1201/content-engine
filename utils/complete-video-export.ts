import { presetIncludesNarration } from "@/utils/video-export-presets";
import type { VideoExportMetadata } from "@/utils/fal-video";

export function includesVideoNarration(metadata: VideoExportMetadata): boolean {
  const preset = metadata.preset ?? "quick_reel";
  return presetIncludesNarration(preset);
}
