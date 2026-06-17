"use client";

import { formatAspectRatio } from "@/utils/campaign-display";
import type { Campaign } from "@/types/campaign";
import type { VideoExportPreset } from "@/utils/video-export-presets";
import { presetBurnsCaptions } from "@/utils/video-export-presets";
import {
  VIDEO_EXPORT_STAGE_DESCRIPTIONS,
  VIDEO_EXPORT_STAGE_LABELS,
  VIDEO_EXPORT_UI_STAGES,
  getVideoExportStepState,
  type VideoExportUiStage,
} from "@/utils/video-export-stages";
import { useEffect, useState } from "react";

interface CampaignVideoExportOverlayProps {
  open: boolean;
  campaignTitle: string;
  campaignTopic: string;
  aspectRatio: Campaign["aspect_ratio"];
  slideCount: number;
  stage?: VideoExportUiStage;
  videoPreset?: VideoExportPreset;
  includeCaptions?: boolean;
  error?: string | null;
  onDismiss?: () => void;
}

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function CampaignVideoExportOverlay({
  open,
  campaignTitle,
  campaignTopic,
  aspectRatio,
  slideCount,
  stage = "preparing",
  videoPreset = "quick_reel",
  includeCaptions = false,
  error = null,
  onDismiss,
}: CampaignVideoExportOverlayProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!open || error) {
      return;
    }

    setElapsedSeconds(0);
    const intervalId = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [open, error]);

  if (!open) {
    return null;
  }

  const headline = campaignTitle.trim() || campaignTopic;
  const stageDescription = VIDEO_EXPORT_STAGE_DESCRIPTIONS[stage];
  const visibleStages = VIDEO_EXPORT_UI_STAGES.filter((step) => {
    if (step === "merge_audio" && videoPreset === "silent_captions") {
      return false;
    }

    if (
      step === "burn_captions" &&
      !presetBurnsCaptions(videoPreset, includeCaptions)
    ) {
      return false;
    }

    return true;
  });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/80" aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-export-overlay-title"
        aria-busy={!error}
        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card px-6 py-8 text-center shadow-2xl sm:px-8 sm:py-10"
      >
        {error ? (
          <>
            <div
              role="alert"
              className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-4 text-left"
            >
              <p className="text-sm font-semibold text-red-200">
                Video export failed
              </p>
              <p className="mt-2 text-sm leading-6 text-red-200/90">{error}</p>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="btn-primary mt-6 w-full py-2.5 text-sm"
            >
              Close
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
            <p className="brand-kicker mt-8">Rendering your video</p>
            <h2
              id="video-export-overlay-title"
              className="mt-3 text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
            >
              {headline}
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              {stageDescription} This usually takes 1–3 minutes. Keep this tab
              open.
            </p>

            <ol className="mt-6 space-y-2 text-left">
              {visibleStages.map((step) => {
                const stepState = getVideoExportStepState(step, stage);

                return (
                  <li
                    key={step}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                      stepState === "active"
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : stepState === "done"
                          ? "border-border/60 bg-background/40 text-muted-foreground"
                          : "border-transparent text-muted-foreground/70"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        stepState === "done"
                          ? "bg-primary text-primary-foreground"
                          : stepState === "active"
                            ? "border border-primary text-primary"
                            : "border border-border text-muted-foreground"
                      }`}
                      aria-hidden="true"
                    >
                      {stepState === "done" ? "✓" : stepState === "active" ? "•" : ""}
                    </span>
                    <span className="font-medium">
                      {VIDEO_EXPORT_STAGE_LABELS[step]}
                    </span>
                  </li>
                );
              })}
            </ol>

            <p className="mt-4 text-xs tabular-nums text-muted-foreground">
              {formatElapsed(elapsedSeconds)}
            </p>
            <dl className="mt-6 flex flex-wrap justify-center gap-6 text-center text-sm text-muted-foreground">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide">
                  Format
                </dt>
                <dd className="mt-1 text-secondary-foreground">
                  {formatAspectRatio(aspectRatio)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide">
                  Slides
                </dt>
                <dd className="mt-1 text-secondary-foreground">{slideCount}</dd>
              </div>
            </dl>
          </>
        )}
      </div>
    </div>
  );
}
