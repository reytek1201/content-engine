"use client";

import {
  getCampaignOperationStepState,
  resolveCampaignOperationOverlay,
  type CampaignOperationKind,
} from "@/utils/campaign-operation-overlay";
import type { AspectRatio } from "@/types/campaign";
import type { VideoExportPreset } from "@/utils/video-export-presets";
import type { VideoExportUiStage } from "@/utils/video-export-stages";
import { useEffect, useMemo, useRef, useState } from "react";

interface CampaignOperationOverlayProps {
  open: boolean;
  kind: CampaignOperationKind;
  headline: string;
  elapsedSeconds?: number;
  videoStage?: VideoExportUiStage;
  videoPreset?: VideoExportPreset;
  aspectRatio?: AspectRatio;
  slideCount?: number;
  draftBuild?: {
    imagesReadyCount: number;
    imagesComplete: boolean;
    captionsCount: number;
  };
  error?: string | null;
  onDismiss?: () => void;
}

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function CampaignOperationOverlay({
  open,
  kind,
  headline,
  videoStage = "preparing",
  videoPreset = "quick_reel",
  aspectRatio,
  slideCount,
  draftBuild,
  error = null,
  onDismiss,
}: CampaignOperationOverlayProps) {
  const startedAtRef = useRef<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!open || error) {
      startedAtRef.current = null;
      return;
    }

    startedAtRef.current = Date.now();
    setElapsedSeconds(0);

    const syncElapsed = () => {
      if (startedAtRef.current) {
        setElapsedSeconds(
          Math.floor((Date.now() - startedAtRef.current) / 1000),
        );
      }
    };

    syncElapsed();
    const intervalId = window.setInterval(syncElapsed, 1000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        syncElapsed();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [open, error, kind]);

  const model = useMemo(
    () =>
      resolveCampaignOperationOverlay({
        kind,
        elapsedSeconds,
        videoStage,
        videoPreset,
        aspectRatio,
        slideCount,
        draftBuild,
      }),
    [
      kind,
      elapsedSeconds,
      videoStage,
      videoPreset,
      aspectRatio,
      slideCount,
      draftBuild,
    ],
  );

  const metadata = model.metadata;

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/80" aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-operation-overlay-title"
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
                {model.errorTitle}
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
            <p className="brand-kicker mt-8">{model.kicker}</p>
            <h2
              id="campaign-operation-overlay-title"
              className="mt-3 text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
            >
              {headline}
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              {model.description} {model.durationHint}
              {kind === "video_export"
                ? " You can lock your phone — we'll notify you when it's ready."
                : " Keep this page open."}
            </p>

            <ol className="mt-6 space-y-2 text-left">
              {model.stages.map((step, index) => {
                const stepState = getCampaignOperationStepState(
                  index,
                  model.activeStageIndex,
                );

                return (
                  <li
                    key={step.id}
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
                      {stepState === "done"
                        ? "✓"
                        : stepState === "active"
                          ? "•"
                          : ""}
                    </span>
                    <span className="font-medium">{step.label}</span>
                  </li>
                );
              })}
            </ol>

            <p className="mt-4 text-xs tabular-nums text-muted-foreground">
              {formatElapsed(elapsedSeconds)}
            </p>

            {metadata && metadata.length > 0 ? (
              <dl className="mt-6 flex flex-wrap justify-center gap-6 text-center text-sm text-muted-foreground">
                {metadata.map((item) => (
                  <div key={item.label}>
                    <dt className="text-xs font-medium uppercase tracking-wide">
                      {item.label}
                    </dt>
                    <dd className="mt-1 text-secondary-foreground">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
