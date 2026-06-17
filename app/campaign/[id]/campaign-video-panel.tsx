"use client";

import {
  TTS_VIDEO_EXPORT_DISCLOSURE,
  TTS_VIDEO_EXPORT_SUCCESS_DISCLOSURE,
} from "@/utils/tts/disclosure-copy";
import type { VoiceQuality } from "@/utils/tts/types";
import {
  VIDEO_EXPORT_PRESETS,
  type VideoExportPreset,
} from "@/utils/video-export-presets";

interface CampaignVideoPanelProps {
  canExportVideo: boolean;
  aspectRatioLabel: string;
  disabled?: boolean;
  isExportingVideo?: boolean;
  videoExportMessage?: string | null;
  videoPreset: VideoExportPreset;
  includeCaptions: boolean;
  voiceQuality: VoiceQuality;
  onPresetChange: (preset: VideoExportPreset) => void;
  onIncludeCaptionsChange: (includeCaptions: boolean) => void;
  onVoiceQualityChange: (voiceQuality: VoiceQuality) => void;
  onExportVideo: () => void;
}

export default function CampaignVideoPanel({
  canExportVideo,
  aspectRatioLabel,
  disabled = false,
  isExportingVideo = false,
  videoExportMessage = null,
  videoPreset,
  includeCaptions,
  voiceQuality,
  onPresetChange,
  onIncludeCaptionsChange,
  onVoiceQualityChange,
  onExportVideo,
}: CampaignVideoPanelProps) {
  if (!canExportVideo) {
    return null;
  }

  const isSilentPreset = videoPreset === "silent_captions";

  return (
    <div className="rounded-lg border border-border bg-background/40 p-4 sm:rounded-xl sm:p-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-foreground">Video</h3>
        <p className="text-xs leading-5 text-muted-foreground">
          Export a {aspectRatioLabel} MP4 from your slides — choose a preset
          below.
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {VIDEO_EXPORT_PRESETS.map((preset) => {
          const isActive = preset.id === videoPreset;

          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled || isExportingVideo}
              onClick={() => onPresetChange(preset.id)}
              className={`rounded-xl border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isActive
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-ring/60"
              }`}
            >
              <span className="block text-xs font-semibold text-foreground">
                {preset.label}
              </span>
              <span className="mt-1 block text-[11px] leading-5 text-muted-foreground">
                {preset.description}
              </span>
            </button>
          );
        })}
      </div>

      {!isSilentPreset && (
        <label className="mt-4 flex items-start gap-3 rounded-xl border border-border px-3 py-3">
          <input
            type="checkbox"
            checked={includeCaptions}
            disabled={disabled || isExportingVideo}
            onChange={(event) => onIncludeCaptionsChange(event.target.checked)}
            className="mt-0.5"
          />
          <span className="text-xs leading-5 text-muted-foreground">
            Include on-screen captions synced to the narration.
          </span>
        </label>
      )}

      {!isSilentPreset && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-foreground">Voice quality</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                { id: "standard", label: "Standard" },
                { id: "studio", label: "Studio" },
              ] as const
            ).map((option) => {
              const isActive = voiceQuality === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={disabled || isExportingVideo}
                  onClick={() => onVoiceQualityChange(option.id)}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    isActive
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-secondary-foreground hover:border-ring/60 hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
            Studio uses a higher-quality AI voice model and may take slightly
            longer to render.
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={disabled || isExportingVideo}
        onClick={onExportVideo}
        className="btn-primary mt-4 w-full py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isExportingVideo ? "Rendering video…" : "Download video"}
      </button>

      {videoExportMessage && (
        <div className="mt-3 rounded-xl border border-emerald-900/50 bg-emerald-950/20 px-3 py-2.5 text-xs text-emerald-200">
          {videoExportMessage}
        </div>
      )}

      <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
        {isSilentPreset
          ? "Silent video includes on-screen captions from your voiceover scripts."
          : TTS_VIDEO_EXPORT_DISCLOSURE}{" "}
        {TTS_VIDEO_EXPORT_SUCCESS_DISCLOSURE}
      </p>
    </div>
  );
}
