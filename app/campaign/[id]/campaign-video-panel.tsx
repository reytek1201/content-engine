"use client";

import { formatAspectRatio } from "@/utils/campaign-display";
import {
  TTS_VIDEO_EXPORT_DISCLOSURE,
  TTS_VIDEO_EXPORT_SUCCESS_DISCLOSURE,
} from "@/utils/tts/disclosure-copy";
import type { AspectRatio } from "@/types/campaign";
import type { VerticalFormatPublishState } from "@/utils/slide-aspect-images";
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
  voiceQuality: VoiceQuality;
  dualFormatEnabled?: boolean;
  verticalFormatState?: VerticalFormatPublishState;
  videoExportAspectRatio?: AspectRatio;
  onVideoExportAspectRatioChange?: (aspectRatio: AspectRatio) => void;
  onAddVerticalFormat?: () => void;
  onPresetChange: (preset: VideoExportPreset) => void;
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
  voiceQuality,
  dualFormatEnabled = false,
  verticalFormatState = "not_applicable",
  videoExportAspectRatio,
  onVideoExportAspectRatioChange,
  onAddVerticalFormat,
  onPresetChange,
  onVoiceQualityChange,
  onExportVideo,
}: CampaignVideoPanelProps) {
  if (!canExportVideo) {
    return null;
  }

  const isSilentPreset = videoPreset === "silent_captions";
  const showFormatChooser =
    (dualFormatEnabled && videoExportAspectRatio && onVideoExportAspectRatioChange) ||
    (verticalFormatState === "needs_add" || verticalFormatState === "generating");

  function handleFormatSelect(aspectRatio: AspectRatio) {
    if (aspectRatio === "9:16" && verticalFormatState === "needs_add") {
      onAddVerticalFormat?.();
      return;
    }

    if (
      aspectRatio === "9:16" &&
      verticalFormatState === "generating"
    ) {
      return;
    }

    onVideoExportAspectRatioChange?.(aspectRatio);
  }

  function isFormatDisabled(aspectRatio: AspectRatio): boolean {
    if (aspectRatio === "9:16") {
      return verticalFormatState === "generating";
    }

    return false;
  }

  return (
    <div className="rounded-lg border border-border bg-background/40 p-4 sm:rounded-xl sm:p-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-foreground">Video</h3>
        <p className="text-xs leading-5 text-muted-foreground">
          Export a {aspectRatioLabel} MP4 from your slides — choose a preset
          below.
        </p>
      </div>

      {showFormatChooser ? (
        <div className="mt-4">
          <p className="text-xs font-semibold text-foreground">Format</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["4:5", "9:16"] as const).map((aspectRatio) => {
              const isActive = videoExportAspectRatio === aspectRatio;
              const formatDisabled =
                disabled || isExportingVideo || isFormatDisabled(aspectRatio);

              return (
                <button
                  key={aspectRatio}
                  type="button"
                  disabled={formatDisabled}
                  onClick={() => handleFormatSelect(aspectRatio)}
                  title={
                    aspectRatio === "9:16" && verticalFormatState === "needs_add"
                      ? "Add 9:16 slides to unlock vertical export for Reels and TikTok"
                      : aspectRatio === "9:16" &&
                          verticalFormatState === "generating"
                        ? "9:16 images are still generating"
                        : undefined
                  }
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    isActive
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-secondary-foreground hover:border-ring/60 hover:text-foreground"
                  }`}
                >
                  {formatAspectRatio(aspectRatio)}
                  {aspectRatio === "9:16" && verticalFormatState === "generating"
                    ? " (generating…)"
                    : ""}
                </button>
              );
            })}
          </div>
          {verticalFormatState === "needs_add" ? (
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
              Add 9:16 slides to unlock vertical export for YouTube Shorts and
              TikTok.
            </p>
          ) : dualFormatEnabled ? (
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
              Each video export uses one video credit.
            </p>
          ) : null}
        </div>
      ) : null}

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
        {isSilentPreset ? (
          "No voiceover — slides timed to your scripts with crossfade transitions."
        ) : (
          <>
            {TTS_VIDEO_EXPORT_DISCLOSURE} {TTS_VIDEO_EXPORT_SUCCESS_DISCLOSURE}
          </>
        )}
      </p>
    </div>
  );
}
