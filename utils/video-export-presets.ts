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
      "AI narration synced to your slides — ready for Reels, Shorts, and TikTok.",
  },
  {
    id: "silent_captions",
    label: "Silent + captions",
    description:
      "No voiceover — on-screen captions from your scripts for mute-friendly posts.",
  },
];

export function presetBurnsCaptions(
  preset: VideoExportPreset,
  includeCaptions: boolean,
): boolean {
  return preset === "silent_captions" || includeCaptions;
}

export function presetIncludesNarration(preset: VideoExportPreset): boolean {
  return preset === "quick_reel";
}
