import type { VoiceQuality } from "@/utils/tts/types";

export type VideoExportPreset = "quick_reel" | "silent_captions";

export interface VideoExportPresetConfig {
  id: VideoExportPreset;
  label: string;
  description: string;
}

export const VIDEO_EXPORT_PRESETS: VideoExportPresetConfig[] = [
  {
    id: "quick_reel",
    label: "Quick Reel",
    description:
      "AI narration with crossfade transitions — ready for Reels, Shorts, and TikTok.",
  },
  {
    id: "silent_captions",
    label: "Silent video",
    description:
      "No voiceover — slides timed to your scripts with crossfade transitions.",
  },
];

export function presetBurnsCaptions(
  _preset: VideoExportPreset,
  includeCaptions: boolean,
): boolean {
  return includeCaptions;
}

export function presetIncludesNarration(preset: VideoExportPreset): boolean {
  return preset === "quick_reel";
}
